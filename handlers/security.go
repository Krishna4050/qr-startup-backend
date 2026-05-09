package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/Krishna4050/qr-startup-backend/database"
)

type SecurityPing struct {
	UserID    string `json:"user_id"`
	PushToken string `json:"push_token"`
	Device    string `json:"device"`
}

type GeoResponse struct {
	Status  string `json:"status"`
	City    string `json:"city"`
	Country string `json:"country"`
}

func LoginSecurityCheck(w http.ResponseWriter, r *http.Request) {
	var req SecurityPing
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	// Grab the real IP from Render's proxy header
	realIP := r.Header.Get("X-Forwarded-For")
	if realIP == "" {
		realIP = strings.Split(r.RemoteAddr, ":")[0] 
	}
	if strings.Contains(realIP, ",") {
		realIP = strings.TrimSpace(strings.Split(realIP, ",")[0])
	}
	
	fmt.Println("Real connection detected from IP:", realIP)

	// Fetch Geolocation Data
	city := "Unknown City" 
	country := "Unknown Country"

	if realIP != "" && realIP != "127.0.0.1" && realIP != "::1" {
		resp, err := http.Get("http://ip-api.com/json/" + realIP)
		if err == nil {
			defer resp.Body.Close()
			var geo GeoResponse
			bodyBytes, _ := io.ReadAll(resp.Body)
			json.Unmarshal(bodyBytes, &geo)
			
			if geo.Status == "success" {
				city = geo.City
				country = geo.Country
			}
		}
	}

	// THE REAL DATABASE CHECK
	var pastLoginCount int
	query := `SELECT count(*) FROM login_history WHERE user_id = $1 AND (ip_address = $2 OR device_name = $3)`
	err := database.DB.QueryRow(query, req.UserID, realIP, req.Device).Scan(&pastLoginCount)
	
	// If the count is 0 (and no database error occurred), it's a completely new device/location!
	isNewLocation := false
	if err == nil && pastLoginCount == 0 {
		isNewLocation = true
	}

	// Record this login into the database so it's recognized next time
	insertQuery := `INSERT INTO login_history (user_id, ip_address, device_name) VALUES ($1, $2, $3)`
	database.DB.Exec(insertQuery, req.UserID, realIP, req.Device)

	// Fire the Alert if it's new
	if isNewLocation && req.PushToken != "" {
		title := "⚠️ Unrecognized Login detected"
		body := fmt.Sprintf("A new login occurred on an %s near %s, %s. If this wasn't you, secure your account immediately.", req.Device, city, country)

		// Fire Push Notification
		go SendPushNotification(req.PushToken, title, body, map[string]string{
			"category": "security",
			"priority": "urgent",
		})
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "security_check_complete"}`))
}