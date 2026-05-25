package main

import (
	"fmt"
	"log"
	"net/http"
	"os" 

	"github.com/Krishna4050/qr-startup-backend/database"
	"github.com/Krishna4050/qr-startup-backend/handlers"
	"github.com/Krishna4050/qr-startup-backend/middleware"
	"github.com/joho/godotenv"
)

// enableCORS tells the browser that it is safe to talk to our server
func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		
		//  Get the website trying to talk to us
		origin := r.Header.Get("Origin")

		// 2. Our VIP list of allowed Next.js websites
		allowedOrigins := []string{
			"http://localhost:3000",
			"http://localhost:3001",
			"http://localhost:8081",
			"https://ats.krishnaadhikari.com",
			"https://sani.krishnaadhikari.com",
			"https://app.krishnaadhikari.com",
		}

		//  If the website is on the list, let them through!
		for _, allowed := range allowedOrigins {
			if origin == allowed {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				break
			}
		}

		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, Authorization")

		// if it is a preflight check, just say OK and return early
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return 
		}

		next.ServeHTTP(w, r)
	})
}

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
	mux.HandleFunc("GET /api/tags/{id}", handlers.GetTagHandler)
	mux.HandleFunc("POST /api/invite", handlers.SendInviteEmail)
	mux.HandleFunc("POST /api/security/login", handlers.LoginSecurityCheck)
	mux.HandleFunc("/api/host/welcome-email", handlers.WelcomeEmailHandler)
	mux.HandleFunc("GET /api/admin/settings", handlers.GetSettingsHandler)
	mux.HandleFunc("/api/host/verified-email", handlers.VerifiedEmailHandler)
	mux.HandleFunc("POST /api/admin/update-setting", handlers.AdminUpdateSettingHandler)
	mux.HandleFunc("POST /api/admin/check-email", handlers.CheckAdminEmailHandler)
	mux.HandleFunc("GET /api/admin/stats", handlers.AdminGetStatsHandler)
	mux.HandleFunc("GET /api/admin/tags", handlers.AdminGetTagsHandler)
	mux.HandleFunc("GET /api/admin/users", handlers.AdminGetUsersHandler)
	mux.HandleFunc("POST /api/admin/user-action", handlers.AdminUserActionHandler)
	mux.HandleFunc("GET /api/admin/logs", handlers.AdminGetLogsHandler)
	mux.HandleFunc("GET /api/admin/hosts", handlers.AdminGetHostsHandler)
	mux.HandleFunc("POST /api/admin/hosts/verify", handlers.AdminVerifyHostHandler)
	mux.HandleFunc("POST /api/host/register", handlers.RegisterHostHandler)
	mux.HandleFunc("POST /api/admin/communicate", handlers.AdminCommunicateHandler)
	mux.HandleFunc("GET /api/public/shops", handlers.GetPublicDirectoryHandler)

	//start the server
	fmt.Printf("Server is starting on http://localhost:%s\n", port)

	//ListenAndServe pauses the program here and listens for web traffic
	err = http.ListenAndServe(":"+port, enableCORS(mux))
	if err != nil{
		log.Fatalf("Server Crashed: %v", err)
	}
}