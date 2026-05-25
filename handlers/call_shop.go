package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/Krishna4050/qr-startup-backend/database"
	"github.com/twilio/twilio-go"
	api "github.com/twilio/twilio-go/rest/api/v2010"
)

type CallShopRequest struct {
	PhoneNumber string `json:"phone_number"` // The User's phone number
	ShopID      string `json:"shop_id"`
}

// CallShop initiates an outbound call to the user, then bridges them to the shop
func CallShop(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req CallShopRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// 1. Check Call Toggle (Same as lost-and-found feature)
	var twilioCallEnabled bool
	err := database.DB.QueryRow("SELECT setting_value FROM system_settings WHERE setting_key = 'twilio_call_enabled'").Scan(&twilioCallEnabled)
	if err != nil {
		twilioCallEnabled = false
	}

	if !twilioCallEnabled {
		fmt.Printf("[ADMIN DISABLED] Call routing is paused. Did not dial shop %s.\n", req.ShopID)
		
		logDetails := map[string]string{
			"target_phone": req.PhoneNumber,
			"shop_id":      req.ShopID,
			"mode":         "mock_shop_call_blocked",
		}
		detailsJSON, _ := json.Marshal(logDetails)
		database.DB.Exec(
			"INSERT INTO public.system_logs (action_type, details) VALUES ($1, $2)",
			"MOCK_SHOP_CALL_BLOCKED",
			string(detailsJSON),
		)
		
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "Call routing is disabled by admin"})
		return
	}

	// 2. INITIATE THE ACTUAL PHONE CALL TO THE USER
	fmt.Printf("[PRODUCTION] Dialing user's phone (%s) to connect to shop %s...\n", req.PhoneNumber, req.ShopID)

	client := twilio.NewRestClient()
	twilioNumber := os.Getenv("TWILIO_PHONE_NUMBER")
	backendURL := os.Getenv("BACKEND_URL")

	// The webhook Twilio will hit when the user picks up
	webhookURL := fmt.Sprintf("%s/api/call-shop-webhook?shop_id=%s", backendURL, req.ShopID)

	params := &api.CreateCallParams{}
	params.SetTo(req.PhoneNumber)
	params.SetFrom(twilioNumber)
	params.SetUrl(webhookURL)

	_, err = client.Api.CreateCall(params)
	if err != nil {
		fmt.Printf("Twilio Error Initiating Shop Call: %v\n", err)
		http.Error(w, "Failed to initiate call", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "Call initiated"})
}

// CallShopWebhook is hit by Twilio when the user answers. It returns TwiML to dial the shop owner.
func CallShopWebhook(w http.ResponseWriter, r *http.Request) {
	r.ParseForm()
	callerNumber := r.FormValue("From")
	callSid := r.FormValue("CallSid")
	shopID := r.URL.Query().Get("shop_id")

	if shopID == "" {
		http.Error(w, "Missing shop_id", http.StatusBadRequest)
		return
	}

	// Look up the shop's contact phone number
	var shopPhone string
	err := database.DB.QueryRow("SELECT contact_phone FROM public.shop_locations WHERE id = $1 AND is_active = true", shopID).Scan(&shopPhone)
	
	if err != nil {
		fmt.Printf("Call Failed or Shop not found: %v\n", err)
		errorTwiMl := `<?xml version="1.0" encoding="UTF-8"?>
		<Response>
				<Say voice="alice">Sorry, this shop is not available or the number is invalid.</Say>
		</Response>`

		w.Header().Set("Content-Type", "application/xml")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(errorTwiMl))
		return
	}

	twilioNumber := os.Getenv("TWILIO_PHONE_NUMBER")

	// LOG THE REAL CALL
	database.DB.Exec(`
		INSERT INTO public.call_logs (tag_id, status, caller_number, receiver_number, twilio_call_sid)
		VALUES ($1, 'initiated_shop_call', $2, $3, $4)
	`, shopID, callerNumber, shopPhone, callSid) // Using shopID in tag_id column temporarily for logging

	// Generate TwiML
	twiML := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
	<Response>
			<Say voice="alice">Connecting you to the shop owner. Please hold.</Say>
			<Dial callerId="%s" timeLimit="300">
					<Number>%s</Number>
			</Dial>
	</Response>`, twilioNumber, shopPhone)

	w.Header().Set("Content-Type", "application/xml")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(twiML))

	fmt.Printf("[PRODUCTION] TwiML generated! Securely connecting to shop: %s\n", shopPhone)
}
