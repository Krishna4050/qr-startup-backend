package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/Krishna4050/qr-startup-backend/database"
)

type ProfileData struct {
	ID            string  `json:"id"`
	FirstName     *string `json:"first_name"`
	LastName      *string `json:"last_name"`
	Username      *string `json:"username"`
	Gender        *string `json:"gender"`
	DateOfBirth   *string `json:"date_of_birth"`
	AvatarURL     *string `json:"avatar_url"`
	PhoneNumber   *string `json:"phone_number"`
	Country       *string `json:"country"`
	City          *string `json:"city"`
	Street        *string `json:"street"`
	HouseNumber   *string `json:"house_number"`
	Bio           *string `json:"bio"`
}

func GetProfile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value("userID").(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var p ProfileData
	p.ID = userID

	err := database.DB.QueryRow(`
		SELECT first_name, last_name, username, gender, date_of_birth, avatar_url, phone_number, country, city, street, house_number, bio
		FROM public.profiles
		WHERE id = $1
	`, userID).Scan(
		&p.FirstName, &p.LastName, &p.Username, &p.Gender, &p.DateOfBirth, &p.AvatarURL,
		&p.PhoneNumber, &p.Country, &p.City, &p.Street, &p.HouseNumber, &p.Bio,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			// Profile might not exist yet, return an empty profile rather than 404
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(p)
			return
		}
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}

func UpdateProfile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value("userID").(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req ProfileData
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	// Update existing profile or insert if it doesn't exist (UPSERT)
	query := `
		INSERT INTO public.profiles (id, first_name, last_name, username, gender, date_of_birth, avatar_url, phone_number, country, city, street, house_number, bio)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		ON CONFLICT (id) DO UPDATE SET
			first_name = EXCLUDED.first_name,
			last_name = EXCLUDED.last_name,
			username = EXCLUDED.username,
			gender = EXCLUDED.gender,
			date_of_birth = EXCLUDED.date_of_birth,
			avatar_url = EXCLUDED.avatar_url,
			phone_number = EXCLUDED.phone_number,
			country = EXCLUDED.country,
			city = EXCLUDED.city,
			street = EXCLUDED.street,
			house_number = EXCLUDED.house_number,
			bio = EXCLUDED.bio,
			updated_at = NOW();
	`

	_, err := database.DB.Exec(query,
		userID, req.FirstName, req.LastName, req.Username, req.Gender, req.DateOfBirth, req.AvatarURL,
		req.PhoneNumber, req.Country, req.City, req.Street, req.HouseNumber, req.Bio,
	)

	if err != nil {
		http.Error(w, "Failed to update profile", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"success": true}`))
}

func CheckUsername(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	username := r.URL.Query().Get("username")
	if username == "" {
		http.Error(w, "Missing username", http.StatusBadRequest)
		return
	}

	var id string
	err := database.DB.QueryRow(`SELECT id FROM public.profiles WHERE username = $1 LIMIT 1`, username).Scan(&id)
	
	w.Header().Set("Content-Type", "application/json")
	if err == nil {
		w.Write([]byte(`{"taken": true}`))
	} else {
		w.Write([]byte(`{"taken": false}`))
	}
}
