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
	IsBanned    bool   `json:"isBanned"`
}

type UserActionRequest struct {
	UserID string `json:"userId"`
	Action string `json:"action"` // "delete", "suspend", "activate"
}

// GET OVERVIEW STATS

func AdminGetStatsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var stats DashboardStats

	// Count users from public.profiles
	database.DB.QueryRow("SELECT COUNT(*) FROM public.profiles").Scan(&stats.TotalUsers)
	
	// Count active tags from public.qr_tags
	database.DB.QueryRow("SELECT COUNT(*) FROM public.qr_tags WHERE is_active = true").Scan(&stats.TotalTags)

	// Count proxy calls from public.call_logs
	database.DB.QueryRow("SELECT COUNT(*) FROM public.call_logs").Scan(&stats.TotalProxyCalls)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// GET ALL TAGS

func AdminGetTagsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// We calculate "is_claimed" by checking if owner_id exists
	rows, err := database.DB.Query(`
		SELECT id::text, COALESCE(owner_id::text, ''), (owner_id IS NOT NULL) as is_claimed, created_at 
		FROM public.qr_tags 
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

	if tags == nil { tags = []AdminTag{} }

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tags)
}

// GET ALL USERS

func AdminGetUsersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// We check if banned_until is in the future
	rows, err := database.DB.Query(`
		SELECT id, email, COALESCE(phone, 'No Phone Number'), created_at, 
		(banned_until IS NOT NULL AND banned_until > now()) as is_banned
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
		if err := rows.Scan(&u.ID, &u.Email, &u.PhoneNumber, &u.CreatedAt, &u.IsBanned); err == nil {
			users = append(users, u)
		}
	}

	if users == nil { users = []AdminUser{} }

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

// 4. USER ACTIONS (Delete, Suspend, Activate)

func AdminUserActionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req UserActionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var err error
	// Execute the action directly on the Supabase auth table
	switch req.Action {
	case "delete":
		_, err = database.DB.Exec("DELETE FROM auth.users WHERE id = $1", req.UserID)
	case "suspend":
		// Ban them until the year 2100
		_, err = database.DB.Exec("UPDATE auth.users SET banned_until = '2100-01-01' WHERE id = $1", req.UserID)
	case "activate":
		// Remove the ban
		_, err = database.DB.Exec("UPDATE auth.users SET banned_until = NULL WHERE id = $1", req.UserID)
	default:
		http.Error(w, "Invalid action", http.StatusBadRequest)
		return
	}

	if err != nil {
		http.Error(w, "Database execution error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}