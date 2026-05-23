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

	// We use COALESCE and array_agg to safely pull all photos and nested data without crashing
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

	if hosts == nil {
		hosts = []AdminHost{}
	}

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

	// Map the requested action to the database status
	newStatus := req.Action
	isActive := false
	// if req.Action == "approve" {
	// 	newStatus = "verified"
	// 	isActive = true
	// } else if req.Action == "reject" {
	// 	newStatus = "rejected"
	// } else if req.Action == "pause" {
	// 	newStatus = "paused"
	// } else if req.Action == "suspend" {
	// 	newStatus = "suspended"
	// } else if req.Action == "delete" {
	// 	newStatus = "deleted" // SOFT DELETE!
	// }

	// switch statement:
	switch req.Action {
		case "approve":
			newStatus = "verified"
			isActive = true
		case "rejected":
			newStatus = "rejected"
		case "paused":
			newStatus = "paused"
		case "suspend":
			newStatus = "suspended"
		case "delete":
			newStatus = "deleted" // SOFT DELETE!
		default:
			// Handle unexpected action
			fmt.Printf("Unknown action: %s\n", req.Action)
		}

	// Update the shop_locations table
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

	// If deleting, cascade the soft delete to the parent company
	if newStatus == "deleted" && companyID != "" {
		database.DB.Exec("UPDATE public.partner_companies SET status = 'deleted' WHERE id = $1", companyID)
	}

	// Trigger Email Notification (if applicable)
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
			html = "<h2>Account Closure</h2><p>Your shop <b>" + shopName + "</b> has been removed from our platform. If you believe this was an error, please re-register or contact support.</p>"
		}

		if subject != "" {
			_, _ = client.Emails.Send(&resend.SendEmailRequest{
				From:    "Admin <verification@krishnaadhikari.com>",
				To:      []string{managerEmail},
				Subject: subject,
				Html:    html,
			})
		}
	}

	// Log to System Audit Trail
	logDetails := map[string]string{"shop_id": req.ShopID, "action": req.Action}
	detailsJSON, _ := json.Marshal(logDetails)
	database.DB.Exec("INSERT INTO public.system_logs (user_id, action_type, details) VALUES ($1, $2, $3)", managerID, "SHOP_LIFECYCLE_EVENT", string(detailsJSON))

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}