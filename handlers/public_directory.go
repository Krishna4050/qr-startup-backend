package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/Krishna4050/qr-startup-backend/database"
	"github.com/lib/pq"
)

type PublicShop struct {
	ID            string   `json:"id"`
	OwnerID       string   `json:"owner_id"`
	ShopName      string   `json:"shop_name"`
	Street        string   `json:"street"`
	City          string   `json:"city"`
	AverageRating string   `json:"average_rating"`
	Photos        []string `json:"photos"`
	ShopTypes     []string `json:"shop_types"`
	Amenities     []string `json:"amenities"`
}

// GetPublicDirectoryHandler fetches the active verified shops securely from the backend
func GetPublicDirectoryHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	rows, err := database.DB.Query(`
		SELECT 
			sl.id::text, 
			COALESCE(sl.owner_id::text, ''),
			COALESCE(sl.shop_name, 'Unknown Shop'), 
			COALESCE(sl.street, ''),
			COALESCE(sl.city, ''),
			COALESCE((
				SELECT AVG(rating) FROM shop_reviews WHERE location_id = sl.id
			), 0) as avg_rating,
			COALESCE((
				SELECT array_agg(photo_url) 
				FROM shop_photos 
				WHERE location_id = sl.id
			), '{}'::text[]) as photos,
			COALESCE(sl.verification_doc_url, ''),
			COALESCE(sl.shop_types, '{}'::text[]) as shop_types,
			COALESCE(sl.amenities, '{}'::text[]) as amenities
		FROM public.shop_locations sl
		WHERE sl.is_active = true
	`)
	if err != nil {
		fmt.Printf("Database error fetching public directory: %v\n", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var shops []PublicShop
	for rows.Next() {
		var s PublicShop
		var photos []string
		var verificationDoc string
		var rawRating float64

		err := rows.Scan(
			&s.ID, &s.OwnerID, &s.ShopName, &s.Street, &s.City, &rawRating, pq.Array(&photos), &verificationDoc, pq.Array(&s.ShopTypes), pq.Array(&s.Amenities),
		)

		if err == nil {
			if rawRating > 0 {
				s.AverageRating = fmt.Sprintf("%.2f", rawRating)
			} else {
				s.AverageRating = "New"
			}
			
			// If there are no photos, fallback to verification document
			if len(photos) == 0 && verificationDoc != "" {
				photos = []string{verificationDoc}
			}
			s.Photos = photos
			
			shops = append(shops, s)
		} else {
			fmt.Printf("Scan Error on Public Shop Row: %v\n", err)
		}
	}

	if shops == nil { 
		shops = []PublicShop{} 
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(shops)
}
