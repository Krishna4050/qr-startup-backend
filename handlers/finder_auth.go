package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"

	//"github.com/twilio/twilio-go"
	verify "github.com/twilio/twilio-go/rest/verify/v2"
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

// Start the Verification (check Captcha and send SMS)
func StartVerification(w http.ResponseWriter, r *http.Request){
	var req  StartVerificationRequest
	json.NewDecoder(r.Body).Decode(&req)

	// Verify the cloudflare turnstile
	cfSecret := os.Getenv("CLOUDFLARE_SECRET_KEY")
	cfResp, _ := http.PostForm("https://challenges.cloudflare.com/turnstile/v0/siteverify", url.Values{"secret": {cfSecret}, "response": {req.TurnstileToken}})
	
	if cfResp.StatusCode != 200 {
		http.Error(w, "Bot detected", http.StatusForbidden)
		return
	}

	// Send Twilio Verify OTP
	// client := twilio.NewRestClient()
	// verifySID := os.Getenv("TWILIO_VERIFY-SERVICE_SID")

	params := &verify.CreateVerificationParams{}
	params.SetTo(req.PhoneNumber)
	params.SetChannel("sms")

	// Real sms and verification
	// commenting to for now 

	/*
	_, err := client.VerifyV2.CreateVerification(verifySID, params)
	if err != nil {
		http.Error(w, "Failed to send OTP", http.StatusInternalServerError)
		return
	}
	*/
	fmt.Printf("[MOC] Sent OPT to Finder: %s\n", req.PhoneNumber)

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "success", "message": "OTP sent!}`))

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