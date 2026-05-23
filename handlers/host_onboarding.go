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

// This struct matches the JSON payload coming from React Native
type HostRegistrationRequest struct {
	OwnerID            string   `json:"ownerId"`
	ShopName           string   `json:"shopName"`
	Street             string   `json:"street"`
	City               string   `json:"city"`
	Phone              string   `json:"phone"`
	Email              string   `json:"email"`
	ShopTypes          []string `json:"shopTypes"`
	Amenities          []string `json:"amenities"`
	VerificationDocURL string   `json:"verificationDocUrl"`
	PhotoURLs          []string `json:"photoUrls"`
}

func RegisterHostHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req HostRegistrationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	// START A SQL TRANSACTION
	// This ensures that if the shop inserts but the photos fail, everything rolls back safely.
	tx, err := database.DB.Begin()
	if err != nil {
		http.Error(w, "Failed to start database transaction", http.StatusInternalServerError)
		return
	}

	// INSERT: partner_companies
	var companyID string
	err = tx.QueryRow(`
		INSERT INTO public.partner_companies (manager_id, company_name, status)
		VALUES ($1, $2, 'pending_verification')
		RETURNING id
	`, req.OwnerID, req.ShopName).Scan(&companyID)
	
	if err != nil {
		tx.Rollback()
		fmt.Printf("Error inserting company: %v\n", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// INSERT: shop_locations
	var shopID string
	err = tx.QueryRow(`
		INSERT INTO public.shop_locations 
		(company_id, owner_id, shop_name, street, city, contact_phone, contact_email, shop_types, amenities, verification_doc_url, verification_status, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', false)
		RETURNING id
	`, companyID, req.OwnerID, req.ShopName, req.Street, req.City, req.Phone, req.Email, pq.Array(req.ShopTypes), pq.Array(req.Amenities), req.VerificationDocURL).Scan(&shopID)

	if err != nil {
		tx.Rollback()
		fmt.Printf("Error inserting shop: %v\n", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// INSERT: shop_photos
	for _, photoUrl := range req.PhotoURLs {
		_, err = tx.Exec(`
			INSERT INTO public.shop_photos (location_id, photo_url)
			VALUES ($1, $2)
		`, shopID, photoUrl)
		
		if err != nil {
			tx.Rollback()
			fmt.Printf("Error inserting photo: %v\n", err)
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
	}

	// COMMIT THE TRANSACTION (Save everything)
	if err = tx.Commit(); err != nil {
		http.Error(w, "Failed to finalize database transaction", http.StatusInternalServerError)
		return
	}

	// TRIGGER WELCOME EMAIL
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey != "" {
		client := resend.NewClient(apiKey)
		params := &resend.SendEmailRequest{
			From:    "Admin <verification@krishnaadhikari.com>",
			To:      []string{req.Email},
			Subject: "We received your shop application! 🚀",
			Html:    "<h2>Welcome, " + req.ShopName + "!</h2><p>We have successfully received your registration details and verification documents. Our team is currently reviewing your application, and we will notify you the moment your shop goes live.</p>",
		}
		_, _ = client.Emails.Send(params)
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success", "message": "Shop successfully registered"})
}