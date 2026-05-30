package handlers

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

// generateRandomHex generates a securely random hex string
func generateRandomHex(n int) string {
	b := make([]byte, n)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// UploadAssetHandler securely proxies file uploads to Supabase Storage via REST
func UploadAssetHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value("user_id").(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// 10MB limit
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "File too large", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "No file provided", http.StatusBadRequest)
		return
	}
	defer file.Close()

	bucket := r.FormValue("bucket")
	if bucket == "" {
		http.Error(w, "Bucket is required", http.StatusBadRequest)
		return
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_SERVICE_KEY")

	if supabaseURL == "" || supabaseKey == "" {
		http.Error(w, "Server configuration error", http.StatusInternalServerError)
		return
	}

	// Read file content
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, "Failed to read file", http.StatusInternalServerError)
		return
	}

	// Create unique path based on user_id to prevent collision
	ext := ""
	if header.Header.Get("Content-Type") == "image/jpeg" {
		ext = ".jpg"
	} else if header.Header.Get("Content-Type") == "image/png" {
		ext = ".png"
	} else if header.Header.Get("Content-Type") == "application/pdf" {
		ext = ".pdf"
	} else {
		// Attempt to derive from filename
		if len(header.Filename) > 4 && header.Filename[len(header.Filename)-4] == '.' {
			ext = header.Filename[len(header.Filename)-4:]
		}
	}
	path := fmt.Sprintf("%s/%s%s", userID, generateRandomHex(16), ext)

	uploadURL := fmt.Sprintf("%s/storage/v1/object/%s/%s", supabaseURL, bucket, path)

	// Proxy to Supabase via REST
	req, err := http.NewRequest("POST", uploadURL, bytes.NewReader(fileBytes))
	if err != nil {
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		return
	}

	req.Header.Set("Authorization", "Bearer "+supabaseKey)
	req.Header.Set("Content-Type", header.Header.Get("Content-Type"))

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil || resp.StatusCode >= 400 {
		fmt.Printf("Supabase upload failed: %v, status: %d\n", err, resp.StatusCode)
		if resp != nil {
			bodyBytes, _ := io.ReadAll(resp.Body)
			fmt.Printf("Supabase response: %s\n", string(bodyBytes))
		}
		http.Error(w, "Failed to upload file to storage", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	publicURL := fmt.Sprintf("%s/storage/v1/object/public/%s/%s", supabaseURL, bucket, path)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"publicUrl": publicURL,
	})
}
