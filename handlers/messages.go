package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/Krishna4050/qr-startup-backend/database"
)

type ShopLocationData struct {
	ID        string `json:"id"`
	ShopName  string `json:"shop_name"`
	City      string `json:"city"`
	OwnerID   string `json:"owner_id"`
}

type MessageResponse struct {
	ShopID        string           `json:"shop_id"`
	CreatedAt     string           `json:"created_at"`
	ShopLocations ShopLocationData `json:"shop_locations"`
}

func GetUserMessages(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value("userID").(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	query := `
		SELECT 
			m.shop_id::text, 
			m.created_at::text, 
			l.id::text, 
			COALESCE(l.shop_name, ''), 
			COALESCE(l.city, ''), 
			l.owner_id::text
		FROM public.shop_messages m
		INNER JOIN public.shop_locations l ON m.shop_id = l.id
		WHERE m.sender_id = $1 OR m.receiver_id = $1
		ORDER BY m.created_at DESC
	`

	rows, err := database.DB.Query(query, userID)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var messages []MessageResponse

	for rows.Next() {
		var msg MessageResponse
		if err := rows.Scan(
			&msg.ShopID,
			&msg.CreatedAt,
			&msg.ShopLocations.ID,
			&msg.ShopLocations.ShopName,
			&msg.ShopLocations.City,
			&msg.ShopLocations.OwnerID,
		); err == nil {
			messages = append(messages, msg)
		}
	}

	// Always return an array
	if messages == nil {
		messages = []MessageResponse{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}
