package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/Krishna4050/qr-startup-backend/database"
)

type AdminHost struct {
	CompanyID      string `json:"companyId"`
	ManagerID      string `json:"managerId"`
	ManagerEmail   string `json:"managerEmail"`
	CompanyName    string `json:"companyName"`
	RegistrationID string `json:"registrationId"`
	Status         string `json:"status"`
	CreatedAt      string `json:"createdAt"`
}

type VerifyHostRequest struct {
	CompanyID string `json:"companyId"`
	Action    string `json:"action"` // "approve" or "reject"
}

// ==========================================
// 1. FETCH ALL HOST APPLICATIONS
// ==========================================
func AdminGetHostsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Join partner_companies with auth.users to get the manager's email
	rows, err := database.DB.Query(`
		SELECT 
			pc.id::text, pc.manager_id::text, u.email, 
			pc.company_name, COALESCE(pc.business_registration_id, 'N/A'), 
			pc.status, pc.created_at::text
		FROM public.partner_companies pc
		JOIN auth.users u ON pc.manager_id = u.id
		ORDER BY pc.created_at DESC
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
		if err := rows.Scan(&h.CompanyID, &h.ManagerID, &h.ManagerEmail, &h.CompanyName, &h.RegistrationID, &h.Status, &h.CreatedAt); err == nil {
			hosts = append(hosts, h)
		}
	}

	if hosts == nil { hosts = []AdminHost{} }

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(hosts)
}

// ==========================================
// 2. APPROVE OR REJECT HOST
// ==========================================
func AdminVerifyHostHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req VerifyHostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Determine the new status in the database
	newStatus := "rejected"
	if req.Action == "approve" {
		newStatus = "verified"
	}

	// 1. Update the partner_companies table
	var managerEmail, managerID string
	err := database.DB.QueryRow(`
		UPDATE public.partner_companies 
		SET status = $1 
		WHERE id = $2 
		RETURNING manager_id, (SELECT email FROM auth.users WHERE id = manager_id)
	`, newStatus, req.CompanyID).Scan(&managerID, &managerEmail)
	
	if err != nil {
		fmt.Printf("Failed to verify host: %v\n", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// 2. Log this action to your System Audit Trail!
	logDetails := map[string]string{
		"company_id": req.CompanyID,
		"action":     req.Action,
		"manager_id": managerID,
	}
	detailsJSON, _ := json.Marshal(logDetails)
	database.DB.Exec(
		"INSERT INTO public.system_logs (user_id, action_type, details) VALUES ($1, $2, $3)", 
		managerID, "HOST_APPLICATION_PROCESSED", string(detailsJSON),
	)

	// 3. Trigger the Notification Email
	if req.Action == "approve" {
		fmt.Printf("[EMAIL TRIGGER] Sending APPROVAL email to: %s\n", managerEmail)
		// TODO: Hook this up to your actual email sender (Resend, AWS SES, or SendGrid)
	} else {
		fmt.Printf("[EMAIL TRIGGER] Sending REJECTION email to: %s\n", managerEmail)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}