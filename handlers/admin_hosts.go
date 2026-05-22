package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/Krishna4050/qr-startup-backend/database"
	"github.com/resend/resend-go/v2" 
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


// FETCH ALL HOST APPLICATIONS 

func AdminGetHostsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// LEFT JOIN so we don't lose rows, and COALESCE so Go never crashes on NULLs
	rows, err := database.DB.Query(`
		SELECT 
			pc.id::text, 
			COALESCE(pc.manager_id::text, 'Unassigned'), 
			COALESCE(u.email, 'No Email Found'), 
			COALESCE(pc.company_name, 'Unknown Company'), 
			COALESCE(pc.business_registration_id, 'N/A'), 
			COALESCE(pc.status, 'pending_verification'), 
			pc.created_at::text
		FROM public.partner_companies pc
		LEFT JOIN auth.users u ON pc.manager_id = u.id
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
		err := rows.Scan(&h.CompanyID, &h.ManagerID, &h.ManagerEmail, &h.CompanyName, &h.RegistrationID, &h.Status, &h.CreatedAt)
		
		if err == nil {
			hosts = append(hosts, h)
		} else {
			// If a row still fails, print EXACTLY why to the Render terminal
			fmt.Printf("CRITICAL: Silent Scan Error on Host Row: %v\n", err)
		}
	}

	if hosts == nil { hosts = []AdminHost{} }

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(hosts)
}


// APPROVE OR REJECT HOST

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

	newStatus := "rejected"
	if req.Action == "approve" { newStatus = "verified" }

	// Bulletproof Update: COALESCE the returning values so it doesn't crash if an email is missing
	var managerEmail, managerID, companyName string
	err := database.DB.QueryRow(`
		UPDATE public.partner_companies 
		SET status = $1 
		WHERE id = $2 
		RETURNING 
			COALESCE(manager_id::text, 'system'), 
			COALESCE((SELECT email FROM auth.users WHERE id = manager_id), 'no-reply@krishnaadhikari.com'), 
			COALESCE(company_name, 'Your Company')
	`, newStatus, req.CompanyID).Scan(&managerID, &managerEmail, &companyName)
	
	if err != nil {
		fmt.Printf("Failed to verify host: %v\n", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Trigger automated email via Resend
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey != "" && managerEmail != "no-reply@krishnaadhikari.com" {
		client := resend.NewClient(apiKey)

		var subject, html string
		if req.Action == "approve" {
			subject = "Your Shop is Now Verified! 🎉"
			html = "<h2>Congratulations, " + companyName + "! 🎉</h2><p>Great news! Your repair shop has been officially verified and is now live.</p>"
		} else {
			subject = "Update regarding your application"
			html = "<h2>Update for " + companyName + "</h2><p>Unfortunately, your application was not approved at this time. Please contact support for details.</p>"
		}

		params := &resend.SendEmailRequest{
			From:    "Admin <verification@krishnaadhikari.com>",
			To:      []string{managerEmail},
			Subject: subject,
			Html:    html,
		}
		_, _ = client.Emails.Send(params) 
	} else {
		fmt.Println("Skipping Email: No Resend API Key found or User has no email.")
	}

	// Log to System Logs
	logDetails := map[string]string{ "company_id": req.CompanyID, "action": req.Action }
	detailsJSON, _ := json.Marshal(logDetails)
	database.DB.Exec("INSERT INTO public.system_logs (user_id, action_type, details) VALUES ($1, $2, $3)", managerID, "HOST_APPLICATION_PROCESSED", string(detailsJSON))

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}