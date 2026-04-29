package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	//"github.com/twilio/twilio-go"
	//"github.com/twilio/twilio-go/client"
	api "github.com/twilio/twilio-go/rest/api/v2010"
)

// SendVerificationSMS handles the request to send 6-digit code
func SendVerificationSMS(w http.ResponseWriter, r*http.Request){
	destinationNumber := "+35843459898999"

	projectNumber := os.Getenv("TWILIO_PHONE_NUMBER")
	messageBody := "Your QR Startup verification code is: 123456"

	//Initializing the Phone Number 
	// Commenting this as well for now
	// client := twilio.NewRestClient()

	//SMS parameters
	params := &api.CreateMessageParams{}
	params.SetTo(destinationNumber)
	params.SetFrom(projectNumber)
	params.SetBody(messageBody)

	//send the message 
	// *** For now i am commiting this to save credit on twilio. so we will mock the tesing instead
	// resp, err := client.Api.CreateMessage(params)
	// if err != nil {
	// 	fmt.Printf("Twilio Error: %v\n", err)
	// 	http.Error(w, "Failed to Send SMS", http.StatusInternalServerError)
	// 	return
	// }

	// // Send a success response back to website/terminal
	// fmt.Printf("SMS sent successfully! Message SID: %s\n", *resp.Sid)

	//Mock Test
	fmt.Printf("[MOCK] Pretending to send SMS to %s: %s\n", destinationNumber, messageBody)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status": "success",
		"message": "SMS sent successfully",
	})
}