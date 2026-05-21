package handlers

import (
	"fmt"
	"net/http"
	"os"

	// Ensure this matches your actual database package path
	"github.com/Krishna4050/qr-startup-backend/database"
)

// ProxyCallWebhook is the URL Twilio hits to connect the two parties
func ProxyCallWebhook(w http.ResponseWriter, r *http.Request) {


	// CHECK THE Sani CALL TOGGLE
	
	var twilioCallEnabled bool
	
	// Check the database to ensure calls are actually allowed right now
	err := database.DB.QueryRow("SELECT setting_value FROM system_settings WHERE setting_key = 'twilio_call_enabled'").Scan(&twilioCallEnabled)
	if err != nil {
		fmt.Printf("Warning: Failed to check Twilio call settings in DB, defaulting to disabled: %v\n", err)
		twilioCallEnabled = false // Default to safe/free mode if DB check fails
	}

	if !twilioCallEnabled {
		// TOGGLE IS OFF: Play a free message and hang up immediately to save money
		fmt.Println("[MOCK] Admin Call Toggle is OFF. Rejecting Twilio Call connection.")
		
		disabledTwiMl := `<?xml version="1.0" encoding="UTF-8"?>
		<Response>
				<Say voice="alice">Sorry, the call routing service is currently paused for maintenance. Please try again later.</Say>
		</Response>`

		w.Header().Set("Content-Type", "application/xml")
		w.WriteHeader(http.StatusOK) // Still return 200 so Twilio reads the message properly
		w.Write([]byte(disabledTwiMl))
		return
	}

	
	// TOGGLE IS ON: PROCEED WITH REAL CALL
	

	// Tag ID from the URL (Passed over by your CheckVerificationAndCall function)
	tagID := r.URL.Query().Get("tag_id")
	if tagID == "" {
		http.Error(w, "Missing tag_id", http.StatusBadRequest)
		return
	}

	// Lookup the owner's real phone number from your database
	ownerNumber, err := database.GetOwnerPhone(tagID)
	if err != nil {
		fmt.Printf("Call Failed or Tag not found: %v\n", err)

		// Inform Twilio to play an error message instead of making a call
		errorTwiMl := `<?xml version="1.0" encoding="UTF-8"?>
		<Response>
				<Say voice="alice">Sorry, this item is not registered or the owner is currently unavailable.</Say>
		</Response>`

		w.Header().Set("Content-Type", "application/xml")
		w.WriteHeader(http.StatusOK) 
		w.Write([]byte(errorTwiMl))
		return
	} 

	// Get your Twilio proxy number from the .env file
	twilioNumber := os.Getenv("TWILIO_PHONE_NUMBER")
	if twilioNumber == "" {
		fmt.Println("Error: TWILIO_PHONE_NUMBER is missing from .env")
		http.Error(w, "Server Configuration Error", http.StatusInternalServerError)
		return
	}

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