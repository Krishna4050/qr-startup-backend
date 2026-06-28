package main

import (
	"fmt"
	"log"

	"github.com/Krishna4050/qr-startup-backend/database"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(".env"); err != nil {
		log.Println("Warning loading .env file")
	}

	database.ConnectDB()

	if database.DB == nil {
		log.Fatal("Database connection failed")
	}

	query := `
	CREATE TABLE IF NOT EXISTS public.legal_documents (
		id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
		doc_type VARCHAR NOT NULL UNIQUE,
		content TEXT,
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
	);
	`

	_, err := database.DB.Exec(query)
	if err != nil {
		log.Fatalf("Failed to create table: %v", err)
	}

	fmt.Println("Successfully created public.legal_documents table!")
}
