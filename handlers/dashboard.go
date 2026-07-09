package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/Krishna4050/qr-startup-backend/database"
	"github.com/lib/pq"
)

type DashboardProfile struct {
	DisplayName string `json:"display_name"`
	Username    string `json:"username"`
	AvatarURL   string `json:"avatar_url"`
	FirstName       string `json:"first_name"`
	LastName        string `json:"last_name"`
	IsEmailVerified bool   `json:"is_email_verified"`
	IsPhoneVerified bool   `json:"is_phone_verified"`
}

type DashboardTag struct {
	ID        string `json:"id"`
	OwnerID   string `json:"owner_id"`
	Status    string `json:"status"`
	Name      string `json:"item_name"`
	TagType   string `json:"tag_type"`
	CreatedAt string `json:"created_at"`
	IsShared  bool   `json:"is_shared"`
	OwnerName string `json:"owner_name"`
}

type DashboardAlert struct {
	ID        string `json:"id"`
	UserID    string `json:"user_id"`
	TagID       string `json:"tag_id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	AlertType   string `json:"alert_type"`
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
		SELECT COALESCE(p.display_name, ''), COALESCE(p.username, ''), COALESCE(p.avatar_url, ''), COALESCE(p.first_name, ''), COALESCE(p.last_name, ''), 
		       COALESCE(p.is_email_verified, false) OR (u.email_confirmed_at IS NOT NULL), 
		       COALESCE(p.is_phone_verified, false) OR (u.phone_confirmed_at IS NOT NULL)
		FROM public.profiles p
		JOIN auth.users u ON p.id = u.id
		WHERE p.id = $1
	`, userID).Scan(&response.Profile.DisplayName, &response.Profile.Username, &response.Profile.AvatarURL, &response.Profile.FirstName, &response.Profile.LastName, &response.Profile.IsEmailVerified, &response.Profile.IsPhoneVerified)

	// 2. Fetch My Tags
	rows, err := database.DB.Query(`
		SELECT id::text, owner_id::text, status, COALESCE(item_name, '') as name, COALESCE(category, '') as tag_type, created_at::text
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
		SELECT q.id::text, q.owner_id::text, q.status, COALESCE(q.item_name, '') as name, COALESCE(q.category, '') as tag_type, q.created_at::text,
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
		SELECT id::text, user_id::text, COALESCE(tag_id::text, ''), COALESCE(title, ''), created_at::text
		FROM public.alerts
		WHERE user_id = $1
		ORDER BY created_at DESC LIMIT 5
	`, userID)
	if err == nil {
		defer alertRows.Close()
		for alertRows.Next() {
			var alert DashboardAlert
			if err := alertRows.Scan(&alert.ID, &alert.UserID, &alert.TagID, &alert.Title, &alert.CreatedAt); err == nil {
				// Fill missing fields that frontend expects
				alert.Description = alert.Title
				alert.AlertType = "SYSTEM_ALERT"
				response.Alerts = append(response.Alerts, alert)
			} else {
				fmt.Println("Error scanning alert:", err)
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

// GetHostDashboardData fetches host's basic profile and all shop listings.
func GetHostDashboardData(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value("userID").(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// 1. Fetch Profile Name
	var firstName string
	database.DB.QueryRow(`
		SELECT COALESCE(first_name, display_name, 'Partner') 
		FROM public.profiles WHERE id = $1
	`, userID).Scan(&firstName)

	// 2. Fetch Shops
	rows, err := database.DB.Query(`
		SELECT 
			id::text, 
			verification_status, 
			COALESCE(shop_name, ''), 
			COALESCE(city, ''),
			COALESCE((SELECT array_agg(photo_url) FROM shop_photos WHERE location_id = shop_locations.id), '{}'::text[]) as photos
		FROM public.shop_locations 
		WHERE owner_id = $1
		ORDER BY created_at DESC
	`, userID)

	if err != nil {
		fmt.Printf("Database error fetching host dashboard: %v\n", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type HostShop struct {
		ID                 string   `json:"id"`
		VerificationStatus string   `json:"verification_status"`
		ShopName           string   `json:"shop_name"`
		City               string   `json:"city"`
		ShopPhotos         []string `json:"shop_photos"`
	}

	var shops []HostShop
	for rows.Next() {
		var s HostShop
		var photos pq.StringArray
		if err := rows.Scan(&s.ID, &s.VerificationStatus, &s.ShopName, &s.City, &photos); err == nil {
			s.ShopPhotos = photos
			shops = append(shops, s)
		}
	}
	if shops == nil {
		shops = []HostShop{}
	}

	response := map[string]interface{}{
		"first_name": firstName,
		"shops":      shops,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
