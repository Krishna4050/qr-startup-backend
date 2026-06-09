package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"net/url"
	"os"

	"github.com/Krishna4050/qr-startup-backend/database"
)

type CheckEmailRequest struct {
	Email          string `json:"email"`
	TurnstileToken string `json:"turnstile_token"`
}

type CheckEmailResponse struct {
	Exists bool `json:"exists"`
}

func CheckEmailAndTurnstileHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req CheckEmailRequest
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

	// 2. Check if email exists in public.profiles or auth.users?
	// The safest cross-check is the auth.users table, but since this is a microservice, 
	// we only have access to public.profiles via RLS unless we use a service key or 
	// directly query public.profiles (since email is usually saved there if we sync it).
	// Let's assume the email is in public.profiles. If not, we can check auth.users if we use postgres connection.
	// We'll query public.profiles first. If we need to check auth.users we must do it directly.
	
	// Assuming email is synced to profiles or auth schema
	// Let's check auth.users directly. 
	// Note: You must grant usage on schema auth to the role that db is connecting with, 
	// OR use an RPC function. Since backend connects as postgres role (usually), it can read auth.users.
	
	var count int
	// Attempt to query auth.users directly. 
	// If it fails due to permissions, it means backend is not running as superuser.
	err := database.DB.QueryRow("SELECT COUNT(*) FROM auth.users WHERE email = $1", req.Email).Scan(&count)
	if err != nil {
		// If auth.users is inaccessible, check profiles instead.
		err = database.DB.QueryRow("SELECT COUNT(*) FROM public.profiles WHERE email = $1", req.Email).Scan(&count)
		if err != nil {
			log.Printf("Error checking email: %v\n", err)
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
	}

	response := CheckEmailResponse{
		Exists: count > 0,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
