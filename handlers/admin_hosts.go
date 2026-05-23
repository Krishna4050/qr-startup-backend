package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/Krishna4050/qr-startup-backend/database"
	"github.com/lib/pq"
	"github.com/resend/resend-go/v2"
)

type AdminHost struct {
	ShopID       string   `json:"shopId"`
	ManagerID    string   `json:"managerId"`
	ManagerEmail string   `json:"managerEmail"`
	ShopName     string   `json:"shopName"`
	Status       string   `json:"status"`
	CreatedAt    string   `json:"createdAt"`
	Street       string   `json:"street"`
	City         string   `json:"city"`
	Phone        string   `json:"phone"`
	DocumentURL  string   `json:"documentUrl"`
	ShopTypes    []string `json:"shopTypes"`
	Amenities    []string `json:"amenities"`
	Photos       []string `json:"photos"`
}

type HostActionRequest struct {
	ShopID string `json:"shopId"`
	Action string `json:"action"` // approve, reject, pause, suspend, delete
}

// ==========================================
// 1. FETCH ALL HOST APPLICATIONS (DEEP FETCH)
// ==========================================
func AdminGetHostsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	rows, err := database.DB.Query(`
		SELECT 
			sl.id::text, 
			COALESCE(sl.owner_id::text, 'Unassigned'), 
			COALESCE(sl.contact_email, u.email, 'No Email Found'), 
			COALESCE(sl.shop_name, 'Unknown Shop'), 
			COALESCE(sl.verification_status, 'pending'), 
			sl.created_at::text,
			COALESCE(sl.street, ''),
			COALESCE(sl.city, ''),
			COALESCE(sl.contact_phone, ''),
			COALESCE(sl.verification_doc_url, ''),
			COALESCE(sl.shop_types, '{}'::text[]),
			COALESCE(sl.amenities, '{}'::text[]),
			COALESCE((
				SELECT array_agg(photo_url) 
				FROM shop_photos 
				WHERE location_id = sl.id
			), '{}'::text[]) as photos
		FROM public.shop_locations sl
		LEFT JOIN auth.users u ON sl.owner_id = u.id
		ORDER BY sl.created_at DESC
	`)
	if err != nil {
		fmt.Printf("Database error fetching hosts: %v\n", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var hosts []AdminHost
	for rows.Next() {
		var h AdminHost
		var shopTypes, amenities, photos []string

		err := rows.Scan(
			&h.ShopID, &h.ManagerID, &h.ManagerEmail, &h.ShopName, &h.Status, &h.CreatedAt,
			&h.Street, &h.City, &h.Phone, &h.DocumentURL,
			pq.Array(&shopTypes), pq.Array(&amenities), pq.Array(&photos),
		)

		if err == nil {
			h.ShopTypes = shopTypes
			h.Amenities = amenities
			h.Photos = photos
			hosts = append(hosts, h)
		} else {
			fmt.Printf("CRITICAL: Scan Error on Shop Row: %v\n", err)
		}
	}

	if hosts == nil { hosts = []AdminHost{} }

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(hosts)
}

// ==========================================
// 2. LIFECYCLE MANAGEMENT (Approve, Pause, Suspend, Soft Delete)
// ==========================================
func AdminVerifyHostHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req HostActionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	newStatus := req.Action
	isActive := false

	// FIXED: Replaced if/else chain with a clean tagged switch
	switch req.Action {
	case "approve":
		newStatus = "verified"
		isActive = true
	case "reject":
		newStatus = "rejected"
	case "pause":
		newStatus = "paused"
	case "suspend":
		newStatus = "suspended"
	case "delete":
		newStatus = "deleted"
	}

	var managerEmail, managerID, shopName, companyID string
	err := database.DB.QueryRow(`
		UPDATE public.shop_locations 
		SET verification_status = $1, is_active = $2
		WHERE id = $3 
		RETURNING 
			COALESCE(owner_id::text, 'system'), 
			COALESCE(contact_email, (SELECT email FROM auth.users WHERE id = owner_id), 'no-reply@krishnaadhikari.com'), 
			COALESCE(shop_name, 'Your Shop'),
			COALESCE(company_id::text, '')
	`, newStatus, isActive, req.ShopID).Scan(&managerID, &managerEmail, &shopName, &companyID)

	if err != nil {
		fmt.Printf("Failed to update host status: %v\n", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if newStatus == "deleted" && companyID != "" {
		database.DB.Exec("UPDATE public.partner_companies SET status = 'deleted' WHERE id = $1", companyID)
	}

	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey != "" && managerEmail != "no-reply@krishnaadhikari.com" {
		client := resend.NewClient(apiKey)
		var subject, html string

		switch req.Action {
		case "approve":
			subject = "Your Shop is Now Verified! 🎉"
			html = "<h2>Congratulations! 🎉</h2><p>Your shop <b>" + shopName + "</b> has been officially verified and is now live.</p>"
		case "reject":
			subject = "Update regarding your shop application"
			html = "<h2>Update for " + shopName + "</h2><p>Unfortunately, your shop application was not approved at this time.</p>"
		case "suspend":
			subject = "Action Required: Account Suspended"
			html = "<h2>Notice for " + shopName + "</h2><p>Your shop account has been suspended due to a violation of our terms of service.</p>"
		case "delete":
			subject = "Account Deleted"
			html = "<h2>Account Closure</h2><p>Your shop <b>" + shopName + "</b> has been removed from our platform. If you believe this was an error, please re-register.</p>"
		}

		if subject != "" {
			_, _ = client.Emails.Send(&resend.SendEmailRequest{
				From: "Admin <verification@krishnaadhikari.com>", To: []string{managerEmail}, Subject: subject, Html: html,
			})
		}
	}

	logDetails := map[string]string{"shop_id": req.ShopID, "action": req.Action}
	detailsJSON, _ := json.Marshal(logDetails)
	database.DB.Exec("INSERT INTO public.system_logs (user_id, action_type, details) VALUES ($1, $2, $3)", managerID, "SHOP_LIFECYCLE_EVENT", string(detailsJSON))

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// ==========================================
// 3. IN-APP COMMUNICATION CENTER
// ==========================================
func AdminCommunicateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	shopID := r.FormValue("shopId")
	toEmail := r.FormValue("to")
	ccEmail := r.FormValue("cc")
	bccEmail := r.FormValue("bcc")
	subject := r.FormValue("subject")
	body := r.FormValue("body")
	priority := r.FormValue("priority")
	sendSms := r.FormValue("sendSms") 

	htmlBody := fmt.Sprintf(`
		<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
			%s
			<p style="white-space: pre-wrap;">%s</p>
			<hr style="border: none; border-top: 1px solid #eaeaea; margin-top: 30px;" />
			<p style="font-size: 12px; color: #888;">This is an official communication from Admin.</p>
		</div>
	`, map[bool]string{true: `<div style="background-color: #fee2e2; color: #991b1b; padding: 10px; border-radius: 5px; font-weight: bold; margin-bottom: 20px;">🚨 URGENT NOTICE</div>`, false: ""}[priority == "urgent" || priority == "alert"], body)

	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey != "" {
		client := resend.NewClient(apiKey)
		params := &resend.SendEmailRequest{
			From: "Admin <support@krishnaadhikari.com>", To: []string{toEmail}, Subject: subject, Html: htmlBody,
		}
		if ccEmail != "" { params.Cc = []string{ccEmail} }
		if bccEmail != "" { params.Bcc = []string{bccEmail} }
		_, _ = client.Emails.Send(params)
	}

	logDetails := map[string]string{"shop_id": shopID, "type": "communication", "priority": priority, "sms_sent": sendSms}
	detailsJSON, _ := json.Marshal(logDetails)
	database.DB.Exec("INSERT INTO public.system_logs (user_id, action_type, details) VALUES ($1, $2, $3)", "system", "HOST_CONTACTED", string(detailsJSON))

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}