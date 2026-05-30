package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/Krishna4050/qr-startup-backend/database"
)

type TagManageResponse struct {
	Tag            map[string]interface{} `json:"tag"`
	IsOwner        bool                   `json:"is_owner"`
	Network        []NetworkMember        `json:"network"`
	SharedWithIds  []string               `json:"shared_with_ids"`
	OwnerName      string                 `json:"owner_name"`
	PendingRequest string                 `json:"pending_request"`
}

type NetworkMember struct {
	FriendID   string `json:"friend_id"`
	FriendName string `json:"friend_name"`
}

func GetTagManageData(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value("userID").(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	tagID := r.PathValue("id")
	if tagID == "" {
		http.Error(w, "Missing tag ID", http.StatusBadRequest)
		return
	}

	var userEmail string
	database.DB.QueryRow(`SELECT email FROM auth.users WHERE id = $1`, userID).Scan(&userEmail)

	response := TagManageResponse{
		Network:       []NetworkMember{},
		SharedWithIds: []string{},
	}

	// Fetch Tag
	var tag struct {
		ID         string `json:"id"`
		OwnerID    string `json:"owner_id"`
		ItemName   string `json:"item_name"`
		Category   string `json:"category"`
		AssignedTo string `json:"assigned_to"`
		Status     string `json:"status"`
	}

	var itemName, category, assignedTo, status *string

	err := database.DB.QueryRow(`
		SELECT id::text, owner_id::text, item_name, category, assigned_to, status
		FROM public.qr_tags
		WHERE id = $1
	`, tagID).Scan(&tag.ID, &tag.OwnerID, &itemName, &category, &assignedTo, &status)

	if err != nil {
		fmt.Println("Error fetching tag:", err)
		http.Error(w, "Tag not found", http.StatusNotFound)
		return
	}

	tag.ItemName = ""
	if itemName != nil {
		tag.ItemName = *itemName
	}
	tag.Category = "item"
	if category != nil {
		tag.Category = *category
	}
	tag.AssignedTo = ""
	if assignedTo != nil {
		tag.AssignedTo = *assignedTo
	}
	tag.Status = ""
	if status != nil {
		tag.Status = *status
	}

	response.Tag = map[string]interface{}{
		"id":          tag.ID,
		"owner_id":    tag.OwnerID,
		"item_name":   tag.ItemName,
		"category":    tag.Category,
		"assigned_to": tag.AssignedTo,
		"status":      tag.Status,
	}

	response.IsOwner = (userID == tag.OwnerID)

	if response.IsOwner {
		// Fetch network
		rows, err := database.DB.Query(`
			SELECT owner_id::text, member_email 
			FROM public.trusted_network 
			WHERE status = 'accepted' AND (owner_id = $1 OR member_email ILIKE $2)
		`, userID, userEmail)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var memberOwnerID, memberEmail string
				if err := rows.Scan(&memberOwnerID, &memberEmail); err == nil {
					if memberOwnerID != userID {
						// Get email by user ID
						var ownerEmail string
						database.DB.QueryRow(`SELECT email FROM auth.users WHERE id = $1`, memberOwnerID).Scan(&ownerEmail)
						response.Network = append(response.Network, NetworkMember{
							FriendID:   memberOwnerID,
							FriendName: ownerEmail,
						})
					} else {
						// Get user ID by email
						var targetUserID string
						database.DB.QueryRow(`SELECT id::text FROM auth.users WHERE email ILIKE $1`, memberEmail).Scan(&targetUserID)
						if targetUserID != "" {
							response.Network = append(response.Network, NetworkMember{
								FriendID:   targetUserID,
								FriendName: memberEmail,
							})
						}
					}
				}
			}
		}

		// Fetch shared with ids
		sharedRows, err := database.DB.Query(`SELECT shared_with_id::text FROM public.shared_tags WHERE tag_id = $1`, tagID)
		if err == nil {
			defer sharedRows.Close()
			for sharedRows.Next() {
				var sid string
				if err := sharedRows.Scan(&sid); err == nil {
					response.SharedWithIds = append(response.SharedWithIds, sid)
				}
			}
		}
	} else {
		// Guest Logic
		var dispName, uName *string
		database.DB.QueryRow(`SELECT display_name, username FROM public.profiles WHERE id = $1`, tag.OwnerID).Scan(&dispName, &uName)
		if dispName != nil && *dispName != "" {
			response.OwnerName = *dispName
		} else if uName != nil && *uName != "" {
			response.OwnerName = *uName
		} else {
			response.OwnerName = "the owner"
		}

		// Check pending request
		var pendingStatus string
		database.DB.QueryRow(`SELECT status FROM requests WHERE tag_id = $1 AND requester_id = $2 ORDER BY created_at DESC LIMIT 1`, tagID, userID).Scan(&pendingStatus)
		response.PendingRequest = pendingStatus
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func ToggleTagStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value("userID").(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	tagID := r.PathValue("id")
	if tagID == "" {
		http.Error(w, "Missing tag ID", http.StatusBadRequest)
		return
	}

	// Verify ownership
	var ownerID string
	var currentStatus string
	err := database.DB.QueryRow(`SELECT owner_id::text, status FROM public.qr_tags WHERE id = $1`, tagID).Scan(&ownerID, &currentStatus)
	if err != nil {
		http.Error(w, "Tag not found", http.StatusNotFound)
		return
	}

	if ownerID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	newStatus := "lost"
	if currentStatus == "active" {
		newStatus = "lost"
	} else {
		newStatus = "active"
	}

	_, err = database.DB.Exec(`UPDATE public.qr_tags SET status = $1 WHERE id = $2`, newStatus, tagID)
	if err != nil {
		http.Error(w, "Failed to update status", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success", "new_status": newStatus})
}

func UpdateTagDetails(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value("userID").(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	tagID := r.PathValue("id")
	if tagID == "" {
		http.Error(w, "Missing tag ID", http.StatusBadRequest)
		return
	}

	var req struct {
		ItemName   string  `json:"item_name"`
		Category   string  `json:"category"`
		AssignedTo *string `json:"assigned_to"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	_, err := database.DB.Exec(`
		UPDATE public.qr_tags 
		SET item_name = $1, category = $2, assigned_to = $3
		WHERE id = $4 AND owner_id = $5
	`, req.ItemName, req.Category, req.AssignedTo, tagID, userID)

	if err != nil {
		http.Error(w, "Failed to update details", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func ToggleTagShare(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value("userID").(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	tagID := r.PathValue("id")
	if tagID == "" {
		http.Error(w, "Missing tag ID", http.StatusBadRequest)
		return
	}

	var req struct {
		FriendID          string `json:"friend_id"`
		IsCurrentlyShared bool   `json:"is_currently_shared"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	if req.IsCurrentlyShared {
		// Remove share
		_, err := database.DB.Exec(`DELETE FROM public.shared_tags WHERE tag_id = $1 AND shared_with_id = $2`, tagID, req.FriendID)
		if err != nil {
			http.Error(w, "Failed to remove share", http.StatusInternalServerError)
			return
		}
	} else {
		// Add share
		_, err := database.DB.Exec(`INSERT INTO public.shared_tags (tag_id, shared_by_id, shared_with_id) VALUES ($1, $2, $3)`, tagID, userID, req.FriendID)
		if err != nil {
			http.Error(w, "Failed to share", http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func DeleteTag(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value("userID").(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	tagID := r.PathValue("id")
	if tagID == "" {
		http.Error(w, "Missing tag ID", http.StatusBadRequest)
		return
	}

	_, err := database.DB.Exec(`DELETE FROM public.qr_tags WHERE id = $1 AND owner_id = $2`, tagID, userID)
	if err != nil {
		http.Error(w, "Failed to delete tag", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func GetFilteredTags(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value("userID").(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	filterType := r.URL.Query().Get("type")
	
	query := `
		SELECT id::text, owner_id::text, status, COALESCE(item_name, '') as item_name, COALESCE(category, '') as category, created_at::text, COALESCE(assigned_to, '') as assigned_to
		FROM public.qr_tags
		WHERE owner_id = $1
	`

	switch filterType {
	case "active":
		query += ` AND status IN ('active', 'found')`
	case "lost":
		query += ` AND status = 'lost'`
	case "archived":
		query += ` AND status = 'paused'`
	}
	query += ` ORDER BY created_at DESC`

	rows, err := database.DB.Query(query, userID)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var tags []map[string]interface{}
	for rows.Next() {
		var id, ownerID, status, itemName, category, createdAt, assignedTo string
		if err := rows.Scan(&id, &ownerID, &status, &itemName, &category, &createdAt, &assignedTo); err == nil {
			tags = append(tags, map[string]interface{}{
				"id": id,
				"owner_id": ownerID,
				"status": status,
				"item_name": itemName,
				"category": category,
				"created_at": createdAt,
				"assigned_to": assignedTo,
			})
		}
	}
	if tags == nil {
		tags = []map[string]interface{}{}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{"tags": tags})
}

func GetSharedTagsWithFriend(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value("userID").(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	friendID := r.PathValue("friendId")
	if friendID == "" {
		http.Error(w, "Missing friend ID", http.StatusBadRequest)
		return
	}

	rows, err := database.DB.Query(`
		SELECT id::text, owner_id::text, status, COALESCE(item_name, '') as item_name, COALESCE(category, '') as category
		FROM public.qr_tags
		WHERE owner_id = $1 AND status != 'paused'
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var tags []map[string]interface{}
	for rows.Next() {
		var id, ownerID, status, itemName, category string
		if err := rows.Scan(&id, &ownerID, &status, &itemName, &category); err == nil {
			tags = append(tags, map[string]interface{}{
				"id": id,
				"owner_id": ownerID,
				"status": status,
				"item_name": itemName,
				"category": category,
			})
		}
	}
	if tags == nil {
		tags = []map[string]interface{}{}
	}

	sharedRows, err := database.DB.Query(`SELECT tag_id::text FROM public.shared_tags WHERE shared_with_id = $1 AND shared_by_id = $2`, friendID, userID)
	var sharedWithIds []string
	if err == nil {
		defer sharedRows.Close()
		for sharedRows.Next() {
			var tagID string
			if err := sharedRows.Scan(&tagID); err == nil {
				sharedWithIds = append(sharedWithIds, tagID)
			}
		}
	}
	if sharedWithIds == nil {
		sharedWithIds = []string{}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"tags": tags,
		"shared_with_ids": sharedWithIds,
	})
}

func SetTagStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value("userID").(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	tagID := r.PathValue("id")
	if tagID == "" {
		http.Error(w, "Missing tag ID", http.StatusBadRequest)
		return
	}

	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	// Verify ownership
	var ownerID string
	err := database.DB.QueryRow(`SELECT owner_id::text FROM public.qr_tags WHERE id = $1`, tagID).Scan(&ownerID)
	if err != nil {
		http.Error(w, "Tag not found", http.StatusNotFound)
		return
	}

	if ownerID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	_, err = database.DB.Exec(`UPDATE public.qr_tags SET status = $1 WHERE id = $2`, req.Status, tagID)
	if err != nil {
		http.Error(w, "Failed to set status", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success", "new_status": req.Status})
}
