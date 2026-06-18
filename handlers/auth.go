package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"net/url"
	"os"

	"github.com/Krishna4050/qr-startup-backend/database"
)

type CheckContactRequest struct {
	Contact        string `json:"contact"`
	TurnstileToken string `json:"turnstile_token"`
}

type CheckContactResponse struct {
	Exists bool `json:"exists"`
}

func CheckContactAndTurnstileHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req CheckContactRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// 1. Verify Turnstile Token (unless we are in local dev and it's missing)
	if req.TurnstileToken != "" || os.Getenv("ENV") == "production" {
		secretKey := os.Getenv("TURNSTILE_SECRET_KEY")
		if secretKey != "" {
			resp, err := http.PostForm("https://challenges.cloudflare.com/turnstile/v0/siteverify",
				url.Values{"secret": {secretKey}, "response": {req.TurnstileToken}})
			if err != nil {
				log.Printf("Turnstile verification failed: %v\n", err)
				http.Error(w, "Verification failed", http.StatusInternalServerError)
				return
			}
			defer resp.Body.Close()

			var cfResponse TurnstileResponse
			if err := json.NewDecoder(resp.Body).Decode(&cfResponse); err != nil {
				http.Error(w, "Failed to decode Turnstile response", http.StatusInternalServerError)
				return
			}

			if !cfResponse.Success {
				http.Error(w, "Bot verification failed", http.StatusUnauthorized)
				return
			}
		}
	}

	// According to our strict business logic: A user is ONLY considered an "existing user"
	// (meaning they should be asked for a password) if they have fully completed registration
	// and agreed to the terms and conditions. If they haven't agreed, we route them through OTP.
	var count int
	err := database.DB.QueryRow(`
		SELECT COUNT(*) 
		FROM public.profiles
		WHERE (email = $1 OR phone_number = $1) 
		  AND terms_agreed = true
	`, req.Contact).Scan(&count)

	if err != nil {
		log.Printf("Error checking public.profiles: %v\n", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	response := CheckContactResponse{
		Exists: count > 0,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
