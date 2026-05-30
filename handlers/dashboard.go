package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/Krishna4050/qr-startup-backend/database"
)

type DashboardProfile struct {
	DisplayName string `json:"display_name"`
	Username    string `json:"username"`
	AvatarURL   string `json:"avatar_url"`
}

type DashboardTag struct {
	ID        string `json:"id"`
	OwnerID   string `json:"owner_id"`
	Status    string `json:"status"`
	Name      string `json:"name"`
	TagType   string `json:"tag_type"`
	CreatedAt string `json:"created_at"`
	IsShared  bool   `json:"is_shared"`
	OwnerName string `json:"owner_name"`
}

type DashboardAlert struct {
	ID        string `json:"id"`
	UserID    string `json:"user_id"`
	TagID     string `json:"tag_id"`
	Message   string `json:"message"`
	CreatedAt string `json:"created_at"`
}

type DashboardResponse struct {
	Profile             DashboardProfile `json:"profile"`
	MyVisibleTags       []DashboardTag   `json:"my_visible_tags"`
	SharedVisibleTags   []DashboardTag   `json:"shared_visible_tags"`
	PausedTagsCount     int              `json:"paused_tags_count"`
	Alerts              []DashboardAlert `json:"alerts"`
	UnreadNotifications int              `json:"unread_notifications"`
	NetworkMembers      int              `json:"network_members"`
}

func GetDashboardData(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value("userID").(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Also extract user email if possible, for network members query.
	// For simplicity in this endpoint, we'll try to fetch the email from auth.users if needed,
	// or we just query by owner_id. Let's fetch email first.
	var userEmail string
	err := database.DB.QueryRow(`SELECT email FROM auth.users WHERE id = $1`, userID).Scan(&userEmail)
	if err != nil {
		userEmail = "" // fallback
	}

	response := DashboardResponse{
		MyVisibleTags:     []DashboardTag{},
		SharedVisibleTags: []DashboardTag{},
		Alerts:            []DashboardAlert{},
	}

	// 1. Fetch Profile
	database.DB.QueryRow(`
		SELECT COALESCE(display_name, ''), COALESCE(username, ''), COALESCE(avatar_url, '')
		FROM public.profiles WHERE id = $1
	`, userID).Scan(&response.Profile.DisplayName, &response.Profile.Username, &response.Profile.AvatarURL)

	// 2. Fetch My Tags
	rows, err := database.DB.Query(`
		SELECT id::text, owner_id::text, 
		       CASE WHEN is_active THEN 'active' ELSE 'paused' END as status, 
		       COALESCE(item_name, '') as name, 
		       'general' as tag_type, 
		       created_at::text
		FROM public.qr_tags
		WHERE owner_id = $1
		ORDER BY created_at DESC
	`, userID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var tag DashboardTag
			if err := rows.Scan(&tag.ID, &tag.OwnerID, &tag.Status, &tag.Name, &tag.TagType, &tag.CreatedAt); err == nil {
				switch tag.Status {
				case "active", "lost", "found":
					response.MyVisibleTags = append(response.MyVisibleTags, tag)
				case "paused":
					response.PausedTagsCount++
				}
			}
		}
	} else {
		fmt.Println("Error fetching qr_tags:", err)
	}

	// 3. Fetch Shared Tags
	sharedRows, err := database.DB.Query(`
		SELECT q.id::text, q.owner_id::text, 
		       CASE WHEN q.is_active THEN 'active' ELSE 'paused' END as status, 
		       COALESCE(q.item_name, '') as name, 
		       'general' as tag_type, 
		       q.created_at::text,
		       COALESCE(p.display_name, p.username, 'A Friend')
		FROM public.shared_tags s
		JOIN public.qr_tags q ON s.tag_id = q.id
		LEFT JOIN public.profiles p ON q.owner_id = p.id
		WHERE s.shared_with_id = $1
	`, userID)
	if err == nil {
		defer sharedRows.Close()
		for sharedRows.Next() {
			var tag DashboardTag
			tag.IsShared = true
			if err := sharedRows.Scan(&tag.ID, &tag.OwnerID, &tag.Status, &tag.Name, &tag.TagType, &tag.CreatedAt, &tag.OwnerName); err == nil {
				switch tag.Status {
				case "active", "lost":
					response.SharedVisibleTags = append(response.SharedVisibleTags, tag)
				case "paused":
					response.PausedTagsCount++
				}
			}
		}
	} else {
		fmt.Println("Error fetching shared_tags:", err)
	}

	// 4. Fetch Alerts (limit 5)
	alertRows, err := database.DB.Query(`
		SELECT id::text, user_id::text, COALESCE(tag_id::text, ''), COALESCE(message, ''), created_at::text
		FROM public.alerts
		WHERE user_id = $1
		ORDER BY created_at DESC LIMIT 5
	`, userID)
	if err == nil {
		defer alertRows.Close()
		for alertRows.Next() {
			var alert DashboardAlert
			if err := alertRows.Scan(&alert.ID, &alert.UserID, &alert.TagID, &alert.Message, &alert.CreatedAt); err == nil {
				response.Alerts = append(response.Alerts, alert)
			}
		}
	} else {
		fmt.Println("Error fetching alerts:", err)
	}

	// 5. Fetch Unread Notifications
	database.DB.QueryRow(`
		SELECT COUNT(*) FROM public.notifications WHERE user_id = $1 AND is_read = false
	`, userID).Scan(&response.UnreadNotifications)

	// 6. Fetch Network Members
	if userEmail != "" {
		database.DB.QueryRow(`
			SELECT COUNT(*) FROM public.trusted_network 
			WHERE status = 'accepted' AND (owner_id = $1 OR member_email ILIKE $2)
		`, userID, userEmail).Scan(&response.NetworkMembers)
	} else {
		database.DB.QueryRow(`
			SELECT COUNT(*) FROM public.trusted_network 
			WHERE status = 'accepted' AND owner_id = $1
		`, userID).Scan(&response.NetworkMembers)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
