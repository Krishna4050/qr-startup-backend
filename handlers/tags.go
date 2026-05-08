package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/Krishna4050/qr-startup-backend/database"
)

// Request body structure
type ClaimsTagRequest struct {
	TagID string `json:"tag_id"`
}


// GetTagHandler handles GET requests from the Next.js Finder Web App
func GetTagHandler(w http.ResponseWriter, r *http.Request) {
	// Go 1.22+ lets us easily grab the ID from the URL path
	tagID := r.PathValue("id")
	if tagID == "" {
		http.Error(w, "Missing tag ID", http.StatusBadRequest)
		return
	}

	// Call our database function
	details, err := database.GetTagDetails(tagID)
	if err != nil {
		// --- ADD THIS LINE so we can see the real error in your terminal! ---
		fmt.Printf("Database Error for tag %s: %v\n", tagID, err)

		http.Error(w, "Tag not found or database error", http.StatusNotFound)
		return
	}

	// Send the success response back to Next.js
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(details)
}



func ClaimTagHandler(w http.ResponseWriter, r *http.Request) {
	// Get the securely verified User ID from the middleware context
	userID := r.Context().Value("userID").(string)

	// Read the Tag ID from the JSON request body
	var req ClaimsTagRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err !=nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Call our Sevure SQL look database function 
	err := database.ClaimTag(req.TagID, userID)
	if err != nil {
		// If the tag is invalid or already claimed, send and error
		http.Error(w, err.Error(), http.StatusConflict)
		return
	}

	// Send success response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status": "success",
		"message": "Tag successfully claimed and linked to your account!",
	})
}
