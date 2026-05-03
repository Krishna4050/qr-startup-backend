package handlers

import (
	"fmt"
	"net/http"
	"os"

	// importing my database package
	"github.com/Krishna4050/qr-startup-backend/database"
)

// ProxyCallWebhook is the URL. The proxy Proxy
func ProxyCallWebhook(w http.ResponseWriter, r *http.Request){

	// Tag ID fromt the URL
	tagID := r.URL.Query().Get("tag_id")
	if tagID == ""{
		http.Error(w, "Missing tag_id", http.StatusBadRequest)
		return
	}

	//Lookup for the owner number from database

	ownerNumber, err := database.GetOwnerPhone(tagID)
	if err != nil {
		fmt.Printf("Call Failed or Tag not found: %v\n", err)

		//inform(XML Message) the twilio server to see as an error message instead of making a call
		errorTwiMl := `<?xml version="1.0" encoding="UTF-8"?>
		<Response>
				<Say voice="alice">Sorry, this item is not registered or owner is currently unavailable"</Say>
		</Response>`

		w.Header().Set("Content-Type", "application/xml")
		w.WriteHeader(http.StatusOK) // Still return 200 for the twilio to read message
		w.Write([]byte(errorTwiMl))
		return

	} 



	//Get Twilio number from .env file: XML to make a call to the owner
	twilioNumber := os.Getenv("TWILIO_PHONE_NUMBER")
	if twilioNumber == ""{
		fmt.Println("Error: TWILIO_PHONE_NUMBER is missing from .env")
		http.Error(w, "Server Configuration Error", http.StatusInternalServerError)
		return
	}

	//Generate the TwiML to dial the real owner number
	twiML := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
	<Response>
			<Say voice="alice">Connecting you to the owner of this item. Please hold.</Say>
			<Dial callerID="%s" timeLimit="180">
					<Number>%s<Number>
			</Dial>
	</Response>`,twilioNumber, ownerNumber)

	//Sending XML request back to twilio
	w.Header().Set("Content-Type", "application/xml")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(twiML))

	//fmt.Println("[MOCK] TwiML generated to connect call to owner!")
	fmt.Printf("TwiML generated to connect call to real owner: %s!\n", ownerNumber)
}