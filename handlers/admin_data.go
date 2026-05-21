package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/Krishna4050/qr-startup-backend/database"
)


// DATA STRUCTURES

type DashboardStats struct {
	TotalUsers int `json:"totalUsers"`
	TotalTags  int `json:"totalTags"`
	TotalProxyCalls int `json:"totalProxyCalls"`
}

type AdminTag struct {
	TagID     string `json:"tagId"`
	OwnerID   string `json:"ownerId"`
	IsClaimed bool   `json:"isClaimed"`
	CreatedAt string `json:"createdAt"`
}

type AdminUser struct {
	ID          string `json:"id"`
	Email       string `json:"email"`
	PhoneNumber string `json:"phoneNumber"`
	CreatedAt   string `json:"createdAt"`
}


// GET OVERVIEW STATS

func AdminGetStatsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var stats DashboardStats

	// Count Users 
	database.DB.QueryRow("SELECT COUNT(*) FROM profiles").Scan(&stats.TotalUsers)
	
	// Count Tags
	database.DB.QueryRow("SELECT COUNT(*) FROM tags").Scan(&stats.TotalTags)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}


// GET ALL TAGS

func AdminGetTagsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	rows, err := database.DB.Query(`
		SELECT tag_id, COALESCE(owner_id::text, ''), is_claimed, created_at 
		FROM tags 
		ORDER BY created_at DESC LIMIT 100
	`)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var tags []AdminTag
	for rows.Next() {
		var t AdminTag
		if err := rows.Scan(&t.TagID, &t.OwnerID, &t.IsClaimed, &t.CreatedAt); err == nil {
			tags = append(tags, t)
		}
	}

	// Ensure return an empty array [] instead of null if there are no tags
	if tags == nil {
		tags = []AdminTag{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tags)
}

// GET ALL USERS

func AdminGetUsersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// We query Supabase's secure auth.users table directly
	rows, err := database.DB.Query(`
		SELECT id, email, COALESCE(phone, 'No Phone Number'), created_at 
		FROM auth.users 
		ORDER BY created_at DESC LIMIT 100
	`)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []AdminUser
	for rows.Next() {
		var u AdminUser
		if err := rows.Scan(&u.ID, &u.Email, &u.PhoneNumber, &u.CreatedAt); err == nil {
			users = append(users, u)
		}
	}

	if users == nil {
		users = []AdminUser{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}