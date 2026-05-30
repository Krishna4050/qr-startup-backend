package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/Krishna4050/qr-startup-backend/database"
)

type HostShopDetails struct {
	ID                 string   `json:"id"`
	CompanyID          string   `json:"company_id"`
	OwnerID            string   `json:"owner_id"`
	ShopName           string   `json:"shop_name"`
	Street             string   `json:"street"`
	City               string   `json:"city"`
	ContactPhone       string   `json:"contact_phone"`
	ContactEmail       string   `json:"contact_email"`
	ShopTypes          []string `json:"shop_types"`
	Amenities          []string `json:"amenities"`
	VerificationStatus string   `json:"verification_status"`
	IsActive           bool     `json:"is_active"`
	Photos             []string `json:"photos"` // Replaces shop_photos(photo_url)
}

func GetHostShopDetailsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value("user_id").(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	shopID := r.PathValue("id")
	if shopID == "" {
		http.Error(w, "Shop ID is required", http.StatusBadRequest)
		return
	}

	var shop HostShopDetails
	var shopTypes, amenities []byte

	// 1. Fetch shop details
	err := database.DB.QueryRow(`
		SELECT id, company_id, owner_id, shop_name, street, city, contact_phone, contact_email, 
		       COALESCE(shop_types, '[]'::jsonb), COALESCE(amenities, '[]'::jsonb), 
		       verification_status, is_active
		FROM public.shop_locations
		WHERE id = $1 AND owner_id = $2
	`, shopID, userID).Scan(
		&shop.ID, &shop.CompanyID, &shop.OwnerID, &shop.ShopName, &shop.Street, &shop.City,
		&shop.ContactPhone, &shop.ContactEmail, &shopTypes, &amenities,
		&shop.VerificationStatus, &shop.IsActive,
	)

	if err != nil {
		http.Error(w, "Shop not found or access denied", http.StatusNotFound)
		return
	}

	json.Unmarshal(shopTypes, &shop.ShopTypes)
	json.Unmarshal(amenities, &shop.Amenities)

	// 2. Fetch associated photos
	rows, err := database.DB.Query(`
		SELECT photo_url FROM public.shop_photos WHERE location_id = $1
	`, shopID)
	if err == nil {
		defer rows.Close()
		shop.Photos = []string{}
		for rows.Next() {
			var url string
			if err := rows.Scan(&url); err == nil {
				shop.Photos = append(shop.Photos, url)
			}
		}
	} else {
		shop.Photos = []string{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(shop)
}
