package handlers

import (
	"encoding/json"
	"net/http"
	"fmt"

	"github.com/Krishna4050/qr-startup-backend/database"
)

type LegalDocument struct {
	ID        string `json:"id"`
	DocType   string `json:"doc_type"`
	Content   string `json:"content"`
	UpdatedAt string `json:"updated_at"`
}

type UpdateLegalDocumentRequest struct {
	DocType string `json:"doc_type"`
	Content string `json:"content"`
}

// GetLegalDocumentHandler fetches a legal document by type
func GetLegalDocumentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	docType := r.URL.Query().Get("type")
	if docType == "" {
		http.Error(w, "Missing type parameter", http.StatusBadRequest)
		return
	}

	var doc LegalDocument
	query := `
		SELECT id, doc_type, content, updated_at 
		FROM public.legal_documents 
		WHERE doc_type = $1
	`
	err := database.DB.QueryRow(query, docType).Scan(&doc.ID, &doc.DocType, &doc.Content, &doc.UpdatedAt)
	if err != nil {
		// If not found, return empty content instead of 500 error
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(LegalDocument{DocType: docType, Content: ""})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(doc)
}

// AdminUpdateLegalDocumentHandler creates or updates a legal document
func AdminUpdateLegalDocumentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req UpdateLegalDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.DocType != "terms" && req.DocType != "privacy" && req.DocType != "cookies" {
		http.Error(w, "Invalid doc_type", http.StatusBadRequest)
		return
	}

	query := `
		INSERT INTO public.legal_documents (doc_type, content, updated_at) 
		VALUES ($1, $2, now())
		ON CONFLICT (doc_type) 
		DO UPDATE SET content = EXCLUDED.content, updated_at = now()
	`
	_, err := database.DB.Exec(query, req.DocType, req.Content)
	if err != nil {
		fmt.Printf("Database error updating legal document: %v\n", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}
