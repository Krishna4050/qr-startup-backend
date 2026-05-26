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

func MessageNotificationEmailHandler(w http.ResponseWriter, r *http.Request) {
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

	htmlContent := `
	<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaeb; border-radius: 8px;">
		<div style="text-align: center; margin-bottom: 20px;">
			<h2 style="color: #0F2D4D; margin: 0;">New Message Notification</h2>
		</div>
		<p style="font-size: 16px; color: #333;">Hello ` + req.ShopName + `,</p>
		<p style="font-size: 16px; color: #333;">You have received a new secure message regarding your shop on <strong>At Your Service</strong>.</p>
		<p style="font-size: 16px; color: #333;">For your privacy and security, we use End-to-End Encryption. Please log in to your app to view and reply to the message.</p>
		<div style="text-align: center; margin: 30px 0;">
			<a href="https://app.krishnaadhikari.com" style="background-color: #0F2D4D; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Open App to View Message</a>
		</div>
		<p style="font-size: 14px; color: #777; margin-top: 40px; border-top: 1px solid #eaeaeb; padding-top: 20px;">
			Best regards,<br>
			<strong>The At Your Service Team</strong>
		</p>
	</div>`

	params := &resend.SendEmailRequest{
		From:    "Notifications <notifications@krishnaadhikari.com>",
		To:      []string{req.Email},
		Subject: "You have a new message! 💬",
		Html:    htmlContent,
	}

	_, err := client.Emails.Send(params)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "Notification email sent successfully"})
}