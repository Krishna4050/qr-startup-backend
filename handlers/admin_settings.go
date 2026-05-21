package handlers

import (
	"encoding/json"
	"net/http"
	"fmt"

	"github.com/Krishna4050/qr-startup-backend/database"
)

type UpdateSettingRequest struct {
	SettingName  string `json:"setting_name"`
	SettingValue bool   `json:"setting_value"`
}

type CheckAdminRequest struct {
	Email string `json:"email"`
}
// AdminUpdateSettingHandler flips the switches in the database
func AdminUpdateSettingHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req UpdateSettingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Make sure the frontend is sending valid setting keys
	if req.SettingName != "twilio_sms_enabled" && req.SettingName != "twilio_call_enabled" {
		http.Error(w, "Invalid setting key", http.StatusBadRequest)
		return
	}

	// This exactly matches your system_settings schema!
	query := `
		INSERT INTO public.system_settings (setting_key, setting_value, updated_at) 
		VALUES ($1, $2, now())
		ON CONFLICT (setting_key) 
		DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = now()
	`
	_, err := database.DB.Exec(query, req.SettingName, req.SettingValue)
	if err != nil {
		fmt.Printf("Database error updating setting: %v\n", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// GetSettingsHandler sends the current system settings to the Admin Dashboard
func GetSettingsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	rows, err := database.DB.Query("SELECT setting_key, setting_value FROM public.system_settings")
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	settings := make(map[string]bool)
	for rows.Next() {
		var key string
		var val bool
		if err := rows.Scan(&key, &val); err == nil {
			settings[key] = val
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(settings)
}

// CheckAdminEmailHandler securely checks if an email is on the list
func CheckAdminEmailHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req CheckAdminRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var isAdmin bool
	// Join the Supabase auth schema with your public schema to verify the email
	query := `
		SELECT EXISTS (
			SELECT 1 
			FROM auth.users u 
			JOIN public.admin_users au ON u.id = au.user_id 
			WHERE u.email = LOWER($1)
		)
	`
	err := database.DB.QueryRow(query, req.Email).Scan(&isAdmin)
	if err != nil {
		fmt.Printf("Error checking admin status: %v\n", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"isAdmin": isAdmin})
}