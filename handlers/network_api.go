package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/Krishna4050/qr-startup-backend/database"
)

type NetworkMemberInfo struct {
	ID        string `json:"id"`
	Email     string `json:"member_email"`
	Status    string `json:"status"`
	OwnerID   string `json:"owner_id"`
	FriendID  string `json:"friend_id"`
	CreatedAt string `json:"created_at"`
}

func GetTrustedNetwork(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value("userID").(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var userEmail string
	database.DB.QueryRow(`SELECT email FROM auth.users WHERE id = $1`, userID).Scan(&userEmail)

	rows, err := database.DB.Query(`
		SELECT id::text, member_email, status, owner_id::text, created_at::text 
		FROM public.trusted_network 
		WHERE owner_id = $1 OR member_email ILIKE $2
		ORDER BY created_at DESC
	`, userID, userEmail)

	if err != nil {
		fmt.Println("Error fetching trusted network:", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var network []NetworkMemberInfo
	for rows.Next() {
		var member NetworkMemberInfo
		if err := rows.Scan(&member.ID, &member.Email, &member.Status, &member.OwnerID, &member.CreatedAt); err == nil {
			if member.OwnerID != userID {
				// I am the member, owner is the friend
				var ownerEmail string
				database.DB.QueryRow(`SELECT email FROM auth.users WHERE id = $1`, member.OwnerID).Scan(&ownerEmail)
				member.FriendID = member.OwnerID
				member.Email = ownerEmail // Show owner's email
			} else {
				// I am the owner, member_email is the friend
				var targetUserID string
				database.DB.QueryRow(`SELECT id::text FROM auth.users WHERE email ILIKE $1`, member.Email).Scan(&targetUserID)
				member.FriendID = targetUserID
			}
			network = append(network, member)
		}
	}
	if network == nil {
		network = []NetworkMemberInfo{}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{"network": network})
}

func RemoveNetworkMember(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value("userID").(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	connectionID := r.PathValue("id")
	if connectionID == "" {
		http.Error(w, "Missing ID", http.StatusBadRequest)
		return
	}

	// Verify we are either the owner or the member of this connection
	var userEmail string
	database.DB.QueryRow(`SELECT email FROM auth.users WHERE id = $1`, userID).Scan(&userEmail)

	_, err := database.DB.Exec(`
		DELETE FROM public.trusted_network 
		WHERE id = $1 AND (owner_id = $2 OR member_email ILIKE $3)
	`, connectionID, userID, userEmail)

	if err != nil {
		http.Error(w, "Failed to delete connection", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func FinalizeNetworkInvite(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value("userID").(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Email == "" {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	// Verify if user exists
	var targetUserID string
	err := database.DB.QueryRow(`SELECT id::text FROM auth.users WHERE email ILIKE $1`, req.Email).Scan(&targetUserID)

	// In the original react code, it inserts a trusted_network row
	// If userExists -> status='accepted', else status='pending'
	status := "pending"
	if targetUserID != "" {
		status = "accepted"
	}

	_, err = database.DB.Exec(`
		INSERT INTO public.trusted_network (owner_id, member_email, status)
		VALUES ($1, $2, $3)
	`, userID, req.Email, status)

	if err != nil {
		http.Error(w, "Failed to add connection", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{"status": "success", "user_exists": targetUserID != ""})
}
