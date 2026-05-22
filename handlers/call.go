package handlers

import (
	"encoding/json" // <-- Added for logging
	"fmt"
	"net/http"
	"os"

	// Ensure this matches your actual database package path
	"github.com/Krishna4050/qr-startup-backend/database"
)

// ProxyCallWebhook is the URL Twilio hits to connect the two parties
func ProxyCallWebhook(w http.ResponseWriter, r *http.Request) {

	// 1. Grab data that Twilio sends in the request
	r.ParseForm() // Required to read Twilio's payload
	callerNumber := r.FormValue("From") // The Finder's phone number
	callSid := r.FormValue("CallSid")   // Twilio's unique ID for the call
	tagID := r.URL.Query().Get("tag_id")

	// 2. CHECK THE SYSTEM SETTINGS TOGGLE
	var twilioCallEnabled bool
	
	err := database.DB.QueryRow("SELECT setting_value FROM system_settings WHERE setting_key = 'twilio_call_enabled'").Scan(&twilioCallEnabled)
	if err != nil {
		fmt.Printf("Warning: Failed to check Twilio call settings in DB, defaulting to disabled: %v\n", err)
		twilioCallEnabled = false // Default to safe/free mode if DB check fails
	}

	if !twilioCallEnabled {
		// TOGGLE IS OFF: Play a free message and hang up immediately to save money
		fmt.Println("[MOCK] Admin Call Toggle is OFF. Rejecting Twilio Call connection.")
		
		// ==========================================
		// NEW: LOG THE INTERCEPTED CALL TO AUDIT TRAIL
		// ==========================================
		logDetails := map[string]string{
			"tag_id":        tagID,
			"caller_number": callerNumber,
			"mode":          "mock_call_blocked",
		}
		detailsJSON, _ := json.Marshal(logDetails)
		
		database.DB.Exec(
			"INSERT INTO public.system_logs (action_type, details) VALUES ($1, $2)", 
			"MOCK_CALL_BLOCKED", 
			string(detailsJSON),
		)
		// ==========================================

		disabledTwiMl := `<?xml version="1.0" encoding="UTF-8"?>
		<Response>
				<Say voice="alice">Sorry, the call routing service is currently paused for maintenance. Please try again later.</Say>
		</Response>`

		w.Header().Set("Content-Type", "application/xml")
		w.WriteHeader(http.StatusOK) 
		w.Write([]byte(disabledTwiMl))
		return
	}

	// TOGGLE IS ON: PROCEED WITH REAL CALL
	if tagID == "" {
		http.Error(w, "Missing tag_id", http.StatusBadRequest)
		return
	}

	// Lookup the owner's real phone number from your database
	ownerNumber, err := database.GetOwnerPhone(tagID)
	if err != nil {
		fmt.Printf("Call Failed or Tag not found: %v\n", err)
		errorTwiMl := `<?xml version="1.0" encoding="UTF-8"?>
		<Response>
				<Say voice="alice">Sorry, this item is not registered or the owner is currently unavailable.</Say>
		</Response>`

		w.Header().Set("Content-Type", "application/xml")
		w.WriteHeader(http.StatusOK) 
		w.Write([]byte(errorTwiMl))
		return
	} 

	twilioNumber := os.Getenv("TWILIO_PHONE_NUMBER")
	if twilioNumber == "" {
		fmt.Println("Error: TWILIO_PHONE_NUMBER is missing from .env")
		http.Error(w, "Server Configuration Error", http.StatusInternalServerError)
		return
	}

	// ==========================================
	// NEW: LOG THE REAL CALL (Updates Dashboard Stat!)
	// ==========================================
	_, dbErr := database.DB.Exec(`
		INSERT INTO public.call_logs (tag_id, status, caller_number, receiver_number, twilio_call_sid)
		VALUES ($1, 'initiated', $2, $3, $4)
	`, tagID, callerNumber, ownerNumber, callSid)
	
	if dbErr != nil {
		fmt.Printf("Warning: Failed to log real call to database: %v\n", dbErr)
	}
	// ==========================================

	// Generate the XML (TwiML) to securely dial the real owner number
	twiML := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
	<Response>
			<Say voice="alice">Connecting you to the owner of this item. Please hold.</Say>
			<Dial callerId="%s" timeLimit="180">
					<Number>%s</Number>
			</Dial>
	</Response>`, twilioNumber, ownerNumber)

	// Sending XML request back to twilio to bridge the call
	w.Header().Set("Content-Type", "application/xml")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(twiML))

	fmt.Printf("[PRODUCTION] TwiML generated! Securely connecting call to real owner: %s\n", ownerNumber)
}