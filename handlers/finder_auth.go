package handlers

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"net/url"
	"os"
	"sync"
	"time"

	"github.com/Krishna4050/qr-startup-backend/database"

	"github.com/twilio/twilio-go"
	api "github.com/twilio/twilio-go/rest/api/v2010"
)

type OTPData struct {
	Code      string
	ExpiresAt time.Time
	Attempts  int
}

var (
	// Maps the phone number to the secure OTPData struct
	otpCache  = make(map[string]OTPData)
	otpMutex  sync.RWMutex
	mathsRand = rand.New(rand.NewSource(time.Now().UnixNano()))
)

// Generates a real, random 6-digit code (e.g., 843902)
func generateRealOTP() string {
	return fmt.Sprintf("%06d", mathsRand.Intn(1000000))
}

// Structs for reading requests
type StartVerifyRequest struct {
	PhoneNumber    string `json:"phone_number"`
	TurnstileToken string `json:"turnstile_token"`
}

type CheckVerifyRequest struct {
	PhoneNumber string `json:"phone_number"`
	Code        string `json:"code"`
	TagID       string `json:"tag_id"`
}

type TurnstileResponse struct {
	Success bool     `json:"success"`
	Errors  []string `json:"error-codes"`
}


// START VERIFICATION (Generate & Send Real SMS)

func StartVerification(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req StartVerifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Cloudflare Bot Protection 
	secretKey := os.Getenv("TURNSTILE_SECRET_KEY")
	resp, err := http.PostForm("https://challenges.cloudflare.com/turnstile/v0/siteverify",
		url.Values{"secret": {secretKey}, "response": {req.TurnstileToken}})
	if err != nil {
		http.Error(w, "Verification failed", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	var cfResponse TurnstileResponse
	json.NewDecoder(resp.Body).Decode(&cfResponse)
	if !cfResponse.Success {
		fmt.Println("CRITICAL: Blocked a bot from spamming SMS!")
		http.Error(w, "Security verification failed", http.StatusForbidden)
		return
	}

	//  Generate and Store the Real Code 
	realCode := generateRealOTP()
	
	otpMutex.Lock()
	otpCache[req.PhoneNumber] = OTPData{
		Code:      realCode,
		ExpiresAt: time.Now().Add(1 * time.Minute), // Code dies in 1 minutes!
		Attempts:  0,
	}
	otpMutex.Unlock()

	messageBody := fmt.Sprintf("Your secure QR Startup verification code is: %s", realCode)

	//  Check Toggle & Send SMS 
	var twilioEnabled bool
	err = database.DB.QueryRow("SELECT setting_value FROM system_settings WHERE setting_key = 'twilio_sms_enabled'").Scan(&twilioEnabled)
	if err != nil {
		twilioEnabled = false
	}

	if twilioEnabled {
		// ACTUAL TWILIO SMS SENDING
		fmt.Printf("[PRODUCTION] Sending REAL 6-digit code to %s\n", req.PhoneNumber)
		projectNumber := os.Getenv("TWILIO_PHONE_NUMBER")
		
		client := twilio.NewRestClient()
		params := &api.CreateMessageParams{}
		params.SetTo(req.PhoneNumber)
		params.SetFrom(projectNumber)
		params.SetBody(messageBody)

		_, err := client.Api.CreateMessage(params)
		if err != nil {
			http.Error(w, "Failed to Send SMS", http.StatusInternalServerError)
			return
		}
	} else {
		//  TOGGLE IS OFF - WE PRINT IT TO THE TERMINAL AND SAVE IT TO THE DASHBOARD
		fmt.Printf("[ADMIN DISABLED] Twilio SMS is paused. The generated code for %s is: %s\n", req.PhoneNumber, realCode)
		
		
		// AUDIT LOG INJECTION: Save Mock OTP to Dashboard
		
		logDetails := map[string]string{
			"target_phone": req.PhoneNumber,
			"otp_code":     realCode, 
			"mode":         "mock_sms",
		}
		detailsJSON, _ := json.Marshal(logDetails)
		_, dbErr := database.DB.Exec(
			"INSERT INTO public.system_logs (action_type, details) VALUES ($1, $2)", 
			"MOCK_OTP_GENERATED", 
			string(detailsJSON),
		)
		if dbErr != nil {
			fmt.Printf("Failed to write mock OTP to system_logs: %v\n", dbErr)
		}
		// ---------------------------------------------------------
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}


// CHECK VERIFICATION & CONNECT REAL CALL


func CheckVerificationAndCall(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req CheckVerifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// --- Verify the Real Code  ---
	otpMutex.Lock() // We use Lock instead of RLock because we need to update attempt counts
	otpData, exists := otpCache[req.PhoneNumber]

	// Check 1: Does it exist?
	if !exists {
		otpMutex.Unlock()
		http.Error(w, "No verification code requested for this number", http.StatusBadRequest)
		return
	}

	// Check 2: Did it expire? (Older than 1 mins)
	if time.Now().After(otpData.ExpiresAt) {
		delete(otpCache, req.PhoneNumber) // Delete expired code
		otpMutex.Unlock()
		http.Error(w, "Verification code has expired. Please request a new one.", http.StatusUnauthorized)
		return
	}

	// Check 3: Brute force protection (Max 3 attempts)
	if otpData.Attempts >= 3 {
		delete(otpCache, req.PhoneNumber) // Lock them out, force them to start over
		otpMutex.Unlock()
		http.Error(w, "Too many failed attempts. Please request a new code.", http.StatusTooManyRequests)
		return
	}

	// Check 4: Is the code actually wrong?
	if otpData.Code != req.Code {
		// Increment their failed attempt count!
		otpData.Attempts++
		otpCache[req.PhoneNumber] = otpData
		otpMutex.Unlock()
		
		http.Error(w, "Invalid verification code", http.StatusUnauthorized)
		return
	}

	// SUCCESS! The code was right. Delete it so it can't be reused.
	delete(otpCache, req.PhoneNumber)
	otpMutex.Unlock()

	// Check Call Toggle
	var twilioCallEnabled bool
	err := database.DB.QueryRow("SELECT setting_value FROM system_settings WHERE setting_key = 'twilio_call_enabled'").Scan(&twilioCallEnabled)
	if err != nil {
		twilioCallEnabled = false
	}

	// INITIATE THE ACTUAL PHONE CALL
	if twilioCallEnabled {
		fmt.Printf("[PRODUCTION] Code verified! Dialing finder's phone (%s)...\n", req.PhoneNumber)

		client := twilio.NewRestClient()
		twilioNumber := os.Getenv("TWILIO_PHONE_NUMBER")
		backendURL := os.Getenv("BACKEND_URL") 
		
		// THIS IS THE MAGIC LINK: 
		// We pass the tag_id to the webhook. When the Finder picks up the phone, 
		webhookURL := fmt.Sprintf("%s/api/call-owner?tag_id=%s", backendURL, req.TagID)

		params := &api.CreateCallParams{}
		params.SetTo(req.PhoneNumber)
		params.SetFrom(twilioNumber)
		params.SetUrl(webhookURL)

		_, err := client.Api.CreateCall(params)
		if err != nil {
			fmt.Printf("Twilio Error Initiating Call: %v\n", err)
			http.Error(w, "Failed to initiate call", http.StatusInternalServerError)
			return
		}

	} else {
		fmt.Printf("[ADMIN DISABLED] Code was correct, but Call routing is paused. Did not dial.\n")
		
		
		// AUDIT LOG INJECTION: Save Mock Call to Dashboard
		
		logDetails := map[string]string{
			"target_phone": req.PhoneNumber,
			"tag_id":       req.TagID, 
			"mode":         "mock_call_blocked",
		}
		detailsJSON, _ := json.Marshal(logDetails)
		_, dbErr := database.DB.Exec(
			"INSERT INTO public.system_logs (action_type, details) VALUES ($1, $2)", 
			"MOCK_CALL_BLOCKED", 
			string(detailsJSON),
		)
		if dbErr != nil {
			fmt.Printf("Failed to write mock Call to system_logs: %v\n", dbErr)
		}
		// ---------------------------------------------------------
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "Call connected successfully"})
}