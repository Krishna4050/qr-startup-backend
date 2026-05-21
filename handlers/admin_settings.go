package handlers

import (
	"encoding/json"
	"net/http"
	"fmt"

	"github.com/Krishna4050/qr-startup-backend/database"
)

type UpdateSettingRequest struct {
	SettingKey   string `json:"settingKey"`
	SettingValue bool   `json:"settingValue"`
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

	// Update the specific setting in the database
	_, err := database.DB.Exec("UPDATE system_settings SET setting_value = $1 WHERE setting_key = $2", req.SettingValue, req.SettingKey)
	if err != nil {
		http.Error(w, "Failed to update setting in database", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "success",
		"message": req.SettingKey + " updated successfully",
	})
}

// GetSettingsHandler sends the current system settings to the Admin Dashboard
func GetSettingsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Query all settings from the database
	rows, err := database.DB.Query("SELECT setting_key, setting_value FROM system_settings")
	if err != nil {
		http.Error(w, "Failed to fetch settings", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// Map them into a JSON object
	settings := make(map[string]bool)
	for rows.Next() {
		var key string
		var value bool
		if err := rows.Scan(&key, &value); err == nil {
			settings[key] = value
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
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
			WHERE u.email = $1
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