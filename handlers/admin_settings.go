package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/Krishna4050/qr-startup-backend/database"
)

type UpdateSettingRequest struct {
	SettingKey   string `json:"settingKey"`
	SettingValue bool   `json:"settingValue"`
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