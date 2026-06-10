package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/Krishna4050/qr-startup-backend/database"
	"github.com/twilio/twilio-go"
	api "github.com/twilio/twilio-go/rest/api/v2010"
)

type UserPhoneOTPRequest struct {
	PhoneNumber string `json:"phone_number"`
}

type UserPhoneOTPVerifyRequest struct {
	PhoneNumber string `json:"phone_number"`
	Code        string `json:"code"`
}

// SendUserPhoneOTP generates an OTP, saves it to otpCache, and sends a Twilio SMS or mocks it
func SendUserPhoneOTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Verify JWT Context
	userID, ok := r.Context().Value("userID").(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req UserPhoneOTPRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	realCode := generateRealOTP() // Uses the existing generator from finder_auth.go

	otpMutex.Lock()
	otpCache[req.PhoneNumber] = OTPData{
		Code:      realCode,
		ExpiresAt: time.Now().Add(5 * time.Minute), // Dashboard verification gets 5 minutes
		Attempts:  0,
	}
	otpMutex.Unlock()

	messageBody := fmt.Sprintf("Your secure QR Startup verification code is: %s", realCode)

	var twilioEnabled bool
	err := database.DB.QueryRow("SELECT setting_value FROM system_settings WHERE setting_key = 'twilio_sms_enabled'").Scan(&twilioEnabled)
	if err != nil {
		twilioEnabled = false
	}

	if twilioEnabled {
		projectNumber := os.Getenv("TWILIO_PHONE_NUMBER")
		client := twilio.NewRestClient()
		params := &api.CreateMessageParams{}
		params.SetTo(req.PhoneNumber)
		params.SetFrom(projectNumber)
		params.SetBody(messageBody)

		_, err := client.Api.CreateMessage(params)
		if err != nil {
			fmt.Printf("Twilio SMS failed: %v\n", err)
			http.Error(w, "Failed to Send SMS", http.StatusInternalServerError)
			return
		}
	} else {
		// Mock it to the database for the Admin Dashboard
		fmt.Printf("[ADMIN DISABLED] User Phone Mock OTP for %s is: %s\n", req.PhoneNumber, realCode)
		logDetails := map[string]string{
			"target_phone": req.PhoneNumber,
			"otp_code":     realCode,
			"mode":         "mock_sms_user_dashboard",
		}
		detailsJSON, _ := json.Marshal(logDetails)
		_, dbErr := database.DB.Exec(
			"INSERT INTO public.system_logs (action_type, details) VALUES ($1, $2)",
			"MOCK_USER_OTP_GENERATED",
			string(detailsJSON),
		)
		if dbErr != nil {
			fmt.Printf("Failed to write mock OTP to system_logs: %v\n", dbErr)
		}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// VerifyUserPhoneOTP validates the OTP and automatically updates auth.users
func VerifyUserPhoneOTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value("userID").(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req UserPhoneOTPVerifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	otpMutex.Lock()
	otpData, exists := otpCache[req.PhoneNumber]

	if !exists {
		otpMutex.Unlock()
		http.Error(w, "No verification code requested for this number", http.StatusBadRequest)
		return
	}

	if time.Now().After(otpData.ExpiresAt) {
		delete(otpCache, req.PhoneNumber)
		otpMutex.Unlock()
		http.Error(w, "Verification code has expired. Please request a new one.", http.StatusUnauthorized)
		return
	}

	if otpData.Attempts >= 3 {
		delete(otpCache, req.PhoneNumber)
		otpMutex.Unlock()
		http.Error(w, "Too many failed attempts. Please request a new code.", http.StatusTooManyRequests)
		return
	}

	if otpData.Code != req.Code {
		otpData.Attempts++
		otpCache[req.PhoneNumber] = otpData
		otpMutex.Unlock()
		http.Error(w, "Invalid verification code", http.StatusUnauthorized)
		return
	}

	// SUCCESS
	delete(otpCache, req.PhoneNumber)
	otpMutex.Unlock()

	// Update auth.users directly to natively secure the phone without Supabase's expensive provider
	_, err := database.DB.Exec("UPDATE auth.users SET phone = $1, phone_confirmed_at = NOW() WHERE id = $2", req.PhoneNumber, userID)
	if err != nil {
		fmt.Printf("Failed to update auth.users: %v\n", err)
		http.Error(w, "Failed to secure phone in auth system", http.StatusInternalServerError)
		return
	}

	// Sync profiles table
	_, err = database.DB.Exec("UPDATE public.profiles SET is_phone_verified = true, phone_number = $1 WHERE id = $2", req.PhoneNumber, userID)
	if err != nil {
		fmt.Printf("Failed to update public.profiles: %v\n", err)
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}
