package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

// InviteRequest matches the JSON sent from React Native
type InviteRequest struct {
	Email        string `json:"email"`
	InviterName  string `json:"inviter_name"`
	IsRegistered bool   `json:"is_registered"`
}

// SendInviteEmail handles both registered and unregistered friend invites
func SendInviteEmail(w http.ResponseWriter, r *http.Request) {
	var req InviteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Grab your Resend API key file
	resendKey := os.Getenv("RESEND_API_KEY")
	if resendKey == "" {
		fmt.Println("Warning: RESEND_API_KEY is missing from .env")
		http.Error(w, "Server Configuration Error", http.StatusInternalServerError)
		return
	}

	// Write the dynamic Subject and HTML content
	var subject, htmlBody string

	if req.IsRegistered {
		subject = fmt.Sprintf("%s added you to their Trusted Network!", req.InviterName)
		htmlBody = fmt.Sprintf(`
		<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
			<div style="background-color: #0F2D4D; padding: 32px 20px; text-align: center;">
				<h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 1px;">SecureFind</h1>
			</div>
			<div style="padding: 40px 30px; color: #374151;">
				<h2 style="margin-top: 0; color: #111827; font-size: 22px;">Your network is growing!</h2>
				<p style="font-size: 16px; line-height: 1.6; color: #4B5563;"><strong>%s</strong> just added you to their Trusted Network on SecureFind.</p>
				<p style="font-size: 16px; line-height: 1.6; color: #4B5563;">As a trusted member, if they ever report an item (like their keys or backpack) as lost, you will be notified automatically so you can help them recover it.</p>
				<div style="text-align: center; margin: 40px 0 20px;">
					<a href="https://yourwebsite.com" style="background-color: #DB2777; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Open SecureFind</a>
				</div>
			</div>
			<div style="background-color: #F9FAFB; padding: 24px; text-align: center; color: #9CA3AF; font-size: 13px; border-top: 1px solid #E5E7EB;">
				<p style="margin: 0;">You received this email because your friend invited you to their network.</p>
				<p style="margin: 8px 0 0 0;">&copy; 2026 SecureFind Inc. All rights reserved.</p>
			</div>
		</div>
		`, req.InviterName)
	} else {
		subject = fmt.Sprintf("%s invited you to SecureFind!", req.InviterName)
		htmlBody = fmt.Sprintf(`
		<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
			<div style="background-color: #0F2D4D; padding: 32px 20px; text-align: center;">
				<h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 1px;">SecureFind</h1>
			</div>
			<div style="padding: 40px 30px; color: #374151;">
				<h2 style="margin-top: 0; color: #111827; font-size: 22px;">Help protect %s's items!</h2>
				<p style="font-size: 16px; line-height: 1.6; color: #4B5563;"><strong>%s</strong> wants to add you to their Trusted Network on SecureFind.</p>
				<p style="font-size: 16px; line-height: 1.6; color: #4B5563;">SecureFind is a smart platform that helps people protect, track, and recover their valuable items using secure QR tags.</p>
				<p style="font-size: 16px; line-height: 1.6; color: #4B5563;">By accepting this invite, you'll be able to help them out if their items ever go missing.</p>
				<div style="text-align: center; margin: 40px 0 20px;">
					<a href="https://yourwebsite.com/download" style="background-color: #DB2777; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Download the App</a>
				</div>
			</div>
			<div style="background-color: #F9FAFB; padding: 24px; text-align: center; color: #9CA3AF; font-size: 13px; border-top: 1px solid #E5E7EB;">
				<p style="margin: 0;">You received this email because someone invited you to join SecureFind.</p>
				<p style="margin: 8px 0 0 0;">&copy; 2026 SecureFind Inc. All rights reserved.</p>
			</div>
		</div>
		`, req.InviterName, req.InviterName)
	}

	// Build the exact JSON payload Resend expects
	resendPayload := map[string]interface{}{
		"from":    "SecureFind <onboarding@krishnaadhikari.com>", // Note: You'll update this to your real domain later
		"to":      []string{req.Email},
		"subject": subject,
		"html":    htmlBody,
	}
	jsonData, _ := json.Marshal(resendPayload)

	// Fire the HTTP request to the Resend API
	client := &http.Client{}
	httpReq, _ := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewBuffer(jsonData))
	httpReq.Header.Set("Authorization", "Bearer "+resendKey)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(httpReq)
	if err != nil || resp.StatusCode >= 400 {
		fmt.Printf("Resend API Error: %v\n", err)
		http.Error(w, "Failed to send email via Resend", http.StatusInternalServerError)
		return
	}

	// Send Success back to React Native
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "success", "message": "Invite email sent successfully"}`))
}