package handlers

import (
	"fmt"
	"net/http"
	"os"

	//"github.com/twilio/twilio-go"
)

// ProxyCallWebhook is the URL. The proxy Proxy
func ProxyCallWebhook(w http.ResponseWriter, r *http.Request){
	ownerNumber := "+35812345678"

	//Twilio XML to make a call to the owner
	twilioNumber := os.Getenv("TWILIO_PHONE_NUMBER")
	if twilioNumber == ""{
		fmt.Println("Error: TWILIO_PHONE_NUMBER is missing from .env")
		http.Error(w, "Server Configuration Error", http.StatusInternalServerError)
		return
	}

	twiML := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
	<Response>
			<Say voice="alice">Connecting you to the owner of this item. Please hold.</Say>
			<Dial callerID="%s">
					<Number>%s<Number>
			</Dial>
	</Response>`,twilioNumber, ownerNumber)

	//Sending XML request back to twilio
	w.Header().Set("Content-Type", "application/xml")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(twiML))

	fmt.Println("[MOCK] TwiML generated to connect call to owner!")
}