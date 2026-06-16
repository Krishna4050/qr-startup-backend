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
	State         *string `json:"state"`
	ZipCode       *string `json:"zip_code"`
	Bio           *string `json:"bio"`
	RecoveryEmail *string `json:"recovery_email"`
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
		SELECT first_name, last_name, username, gender, date_of_birth, avatar_url, phone_number, country, city, street, house_number, state, zip_code, bio, recovery_email
		FROM public.profiles
		WHERE id = $1
	`, userID).Scan(
		&p.FirstName, &p.LastName, &p.Username, &p.Gender, &p.DateOfBirth, &p.AvatarURL,
		&p.PhoneNumber, &p.Country, &p.City, &p.Street, &p.HouseNumber, &p.State, &p.ZipCode, &p.Bio, &p.RecoveryEmail,
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
		INSERT INTO public.profiles (id, first_name, last_name, username, gender, date_of_birth, avatar_url, phone_number, country, city, street, house_number, state, zip_code, bio, recovery_email)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		ON CONFLICT (id) DO UPDATE SET
			first_name = COALESCE(EXCLUDED.first_name, public.profiles.first_name),
			last_name = COALESCE(EXCLUDED.last_name, public.profiles.last_name),
			username = COALESCE(EXCLUDED.username, public.profiles.username),
			gender = COALESCE(EXCLUDED.gender, public.profiles.gender),
			date_of_birth = COALESCE(EXCLUDED.date_of_birth, public.profiles.date_of_birth),
			avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
			phone_number = COALESCE(EXCLUDED.phone_number, public.profiles.phone_number),
			country = COALESCE(EXCLUDED.country, public.profiles.country),
			city = COALESCE(EXCLUDED.city, public.profiles.city),
			street = COALESCE(EXCLUDED.street, public.profiles.street),
			house_number = COALESCE(EXCLUDED.house_number, public.profiles.house_number),
			state = COALESCE(EXCLUDED.state, public.profiles.state),
			zip_code = COALESCE(EXCLUDED.zip_code, public.profiles.zip_code),
			bio = COALESCE(EXCLUDED.bio, public.profiles.bio),
			recovery_email = COALESCE(EXCLUDED.recovery_email, public.profiles.recovery_email),
			updated_at = NOW();
	`

	_, err := database.DB.Exec(query,
		userID, req.FirstName, req.LastName, req.Username, req.Gender, req.DateOfBirth, req.AvatarURL,
		req.PhoneNumber, req.Country, req.City, req.Street, req.HouseNumber, req.State, req.ZipCode, req.Bio, req.RecoveryEmail,
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
