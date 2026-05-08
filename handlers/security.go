package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

type SecurityPing struct {
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

	// 
	// Grab the real IP from Render's proxy header
	realIP := r.Header.Get("X-Forwarded-For")
	
	// If it's empty (e.g., testing locally), fallback to the direct connection
	if realIP == "" {
		realIP = strings.Split(r.RemoteAddr, ":")[0] 
	}

	// Clean up the IP if Render sends multiple (e.g., "192.168.1.1, 10.0.0.1")
	if strings.Contains(realIP, ",") {
		realIP = strings.TrimSpace(strings.Split(realIP, ",")[0])
	}
	
	fmt.Println("Real connection detected from IP:", realIP)
	// ---  END OF IP GRABBER  ---


	// 1. Fetch Geolocation Data from public API using the REAL IP
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

	// The Database Check (Simulated for this trigger)
	// In production, you would query: SELECT city FROM login_history WHERE user_id = X
	// If the current city != last city, trigger the alert. 
	isNewLocation := true // Forcing this to true so you can see the push notification!

	if isNewLocation && req.PushToken != "" {
		title := "⚠️ Unrecognized Login detected"
		body := fmt.Sprintf("A new login occurred on an %s near %s, %s. If this wasn't you, secure your account immediately.", req.Device, city, country)

		// 3. Fire the Push Notification to the exact phone!
		go SendPushNotification(req.PushToken, title, body, map[string]string{
			"category": "security",
			"priority": "urgent",
		})
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "security_check_complete"}`))
}