package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"

	//"github.com/twilio/twilio-go"
	verify "github.com/twilio/twilio-go/rest/verify/v2"
	"github.com/Krishna4050/qr-startup-backend/database"
)

// Structs to read the JSON from Next.js
type StartVerificationRequest struct {
	PhoneNumber string `json:"phone_number"`
	TurnstileToken string `json:"turnstile_token"`
}

type CheckVerificationRequest struct {
	PhoneNumber string `json:"phone_number"`
	Code		string `json:"code"`
	TagID		string `json:"tag_id"` // Who to call
}

// Struct to read Cloudflare's answer
type TurnstileResponse struct {
	Success bool     `json:"success"`
	Errors  []string `json:"error-codes"`
}

// Start the Verification (check Captcha and send SMS)
func StartVerification(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req StartVerificationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// ========================================================
	// 1. CLOUDFLARE TURNSTILE VERIFICATION (Anti-Bot)
	// ========================================================
	secretKey := os.Getenv("TURNSTILE_SECRET_KEY")
	
	// Send the token to Cloudflare to verify
	resp, err := http.PostForm("https://challenges.cloudflare.com/turnstile/v0/siteverify",
		url.Values{
			"secret":   {secretKey},
			"response": {req.TurnstileToken},
		})
		
	if err != nil {
		http.Error(w, "Failed to verify security challenge", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	var cfResponse TurnstileResponse
	json.NewDecoder(resp.Body).Decode(&cfResponse)

	if !cfResponse.Success {
		// BUSTED! It's a bot. Stop execution right here.
		fmt.Println("Blocked a bot attempt on SMS verification!")
		http.Error(w, "Security verification failed", http.StatusForbidden)
		return
	}

	// ========================================================
	// 2. CHECK THE MASTER TOGGLE (Save Money)
	// ========================================================
	var twilioEnabled bool
	err = database.DB.QueryRow("SELECT setting_value FROM system_settings WHERE setting_key = 'twilio_sms_enabled'").Scan(&twilioEnabled)
	if err != nil {
		twilioEnabled = false // Default to off if database check fails
	}

	// ========================================================
	// 3. SEND SMS OR MOCK IT
	// ========================================================
	if twilioEnabled {
		fmt.Printf("[TWILIO] Admin Toggle is ON. Sending real OTP to %s...\n", req.PhoneNumber)
		// ... (Run your real Twilio CreateMessage logic here) ...
        
	} else {
		fmt.Printf("[MOCK] Admin Toggle OFF. Pretending to send OTP to %s. Use code 123456\n", req.PhoneNumber)
		// You can insert the mock code '123456' into your database/cache for validation later
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "OTP processed"})
}

// Check the code and trigger the call
func CheckVerificationAndCall(w http.ResponseWriter, r *http.Request) {
	var req CheckVerificationRequest
	json.NewDecoder(r.Body).Decode(&req)

	// client := twilio.NewRestClient()
	// verifySID := os.Getenv("TWILIO_VERIFY_SERVICE_SID")

	params := &verify.CreateVerificationCheckParams{}
	params.SetTo(req.PhoneNumber)
	params.SetCode(req.Code)


	// Check the code with Twilio
	// for now comenting 
	/*
	resp, err := client.VerifyV2.CreateVerificationCheck(verifySID, params)
	if err != nil || *resp.Status != "approved" {
		http.Error(w, "Invalid Code", http.StatusUnauthorized)
		return
	}
	*/
	fmt.Printf("[MOCK] Finder %s entered correct code: %s\n", req.PhoneNumber, req.Code)

	// Trigger the proxy call
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "success", "message": "Call initiated!}`))	
}