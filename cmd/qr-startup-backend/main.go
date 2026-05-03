package main

import (
	"fmt"
	"log"
	"net/http"
	"os" //Built-in package to read environment variable

	"github.com/Krishna4050/qr-startup-backend/database"
	"github.com/Krishna4050/qr-startup-backend/handlers"
	"github.com/Krishna4050/qr-startup-backend/middleware"
	"github.com/joho/godotenv"
)

func main(){
	// Loading the env file first
	err := godotenv.Load()
	if err != nil{
		log.Println("Warning: No .env file found. Relying on system variables")
	}

	//Connect to database
	database.ConnectDB()

	//Fetch the port from .env file
	port := os.Getenv("PORT")
	if port == "" {
			port = "8080" // Fallback just in case
	}
	// create a new router (The traffic cop)
	mux := http.NewServeMux()

	// create a health check route
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status": "success", "message": "Finnish QR Startup Backend is running perfectly!"}`))
	})

	// Route to our Twilio
	mux.HandleFunc("GET /api/send-sms", handlers.SendVerificationSMS)
	mux.HandleFunc("POST /api/call-owner", handlers.ProxyCallWebhook)
	mux.HandleFunc("POST /api/tags/claim", middleware.RequireAuth(handlers.ClaimTagHandler))
	mux.HandleFunc("POST /api/verify/start", handlers.StartVerification)
	mux.HandleFunc("POST /api/verify/check", handlers.CheckVerificationAndCall)

	//start the server
	fmt.Printf("Server is starting on http://localhost%s\n", port)

	//ListenAndServe pauses the program here and listens for web traffic
	err = http.ListenAndServe(":"+port, mux)
	if err != nil{
		log.Fatalf("Server Crashed: %v", err)
	}
}