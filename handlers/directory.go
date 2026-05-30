package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/Krishna4050/qr-startup-backend/database"
)

type GlobalService struct {
	ID             string          `json:"id"`
	ServiceType    string          `json:"service_type"`
	Title          string          `json:"title"`
	Subtitle       string          `json:"subtitle"`
	City           string          `json:"city"`
	Country        string          `json:"country"`
	PriceIndicator string          `json:"price_indicator"`
	Rating         float64         `json:"rating"`
	Photos         json.RawMessage `json:"photos"`
	Metadata       json.RawMessage `json:"metadata"`
}

// GetServicesDirectoryHandler fetches services by type
func GetServicesDirectoryHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	serviceType := r.URL.Query().Get("type")
	if serviceType == "" {
		http.Error(w, "type query parameter is required", http.StatusBadRequest)
		return
	}

	rows, err := database.DB.Query(`
		SELECT id, service_type, title, subtitle, city, country, price_indicator, rating, photos, metadata
		FROM public.global_services
		WHERE service_type = $1
		ORDER BY rating DESC
	`, serviceType)

	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var services []GlobalService
	for rows.Next() {
		var s GlobalService
		var photosBytes, metadataBytes []byte
		if err := rows.Scan(&s.ID, &s.ServiceType, &s.Title, &s.Subtitle, &s.City, &s.Country, &s.PriceIndicator, &s.Rating, &photosBytes, &metadataBytes); err == nil {
			s.Photos = photosBytes
			s.Metadata = metadataBytes
			services = append(services, s)
		}
	}

	if services == nil {
		services = []GlobalService{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(services)
}
