package handlers

import (
	"encoding/json"
	"net/http"
	"os"

	"github.com/resend/resend-go/v2"
)

// The data coming from React Native
type EmailRequest struct {
	Email    string `json:"email"`
	ShopName string `json:"shopName"`
}

func WelcomeEmailHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req EmailRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	apiKey := os.Getenv("RESEND_API_KEY")
	client := resend.NewClient(apiKey)

	htmlContent := "<h2>Welcome, " + req.ShopName + "!</h2><p>Thank you for registering to become a host on At Your Service. Our team is currently reviewing your verification documents. We will get back to you within 24-48 hours with next steps.</p>"

	params := &resend.SendEmailRequest{
		From:    "Onboarding <service@krishnaadhikari.com>", 
		To:      []string{req.Email},
		Subject: "We received your host application!",
		Html:    htmlContent,
	}

	_, err := client.Emails.Send(params)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "Email sent successfully"})
}



func VerifiedEmailHandler(w http.ResponseWriter, r *http.Request) {
	// Ensure it's a POST request
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Decode the incoming data 
	var req EmailRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Initialize Resend
	apiKey := os.Getenv("RESEND_API_KEY")
	client := resend.NewClient(apiKey)

	// Draft the  Email
	htmlContent := "<h2>Congratulations, " + req.ShopName + "! 🎉</h2>" +
		"<p>Great news! Our team has reviewed your business documents and your repair shop has been officially verified.</p>" +
		"<p>Your listing is now <strong>Live and Active</strong> on the directory for customers to see.</p>" +
		"<p>Log in to your Host Dashboard to view your active listing.</p>"

	params := &resend.SendEmailRequest{
		From:    "Admin <verification@krishnaadhikari.com>",
		To:      []string{req.Email},
		Subject: "Your Shop is Now Verified! 🎉",
		Html:    htmlContent,
	}

	// Send it
	_, err := client.Emails.Send(params)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "Verification email sent successfully"})
}