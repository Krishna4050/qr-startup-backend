package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

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

		// For dev, allow all origins so Expo physical devices work
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			w.Header().Set("Access-Control-Allow-Origin", "*")
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
	mux.HandleFunc("POST /api/flights/search", handlers.SearchFlights)
	mux.HandleFunc("GET /api/flights/dates", handlers.SearchFlightDates)
	mux.HandleFunc("GET /api/flights/airports", handlers.SearchAirports)
	mux.HandleFunc("POST /api/flights/links", handlers.CreateDuffelLink)
	mux.HandleFunc("POST /api/webhooks/duffel", handlers.HandleDuffelWebhook)
	mux.HandleFunc("GET /api/flights/orders", handlers.GetUserFlightOrders)
	mux.HandleFunc("POST /api/flights/cancel", handlers.CancelFlightOrder)
	mux.HandleFunc("POST /api/flights/email-ticket", handlers.EmailTicketManual)
	mux.HandleFunc("POST /api/invite", handlers.SendInviteEmail)
	mux.HandleFunc("POST /api/security/login", handlers.LoginSecurityCheck)
	mux.HandleFunc("/api/host/welcome-email", handlers.WelcomeEmailHandler)
	mux.HandleFunc("/api/host/verified-email", handlers.VerifiedEmailHandler)
	mux.HandleFunc("/api/host/message-notification-email", handlers.MessageNotificationEmailHandler)
	mux.HandleFunc("GET /api/admin/settings", handlers.GetSettingsHandler)
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
	mux.HandleFunc("GET /api/admin/flight-settings", handlers.GetFlightSettingsHandler)
	mux.HandleFunc("POST /api/admin/flight-settings", handlers.UpdateFlightSettingsHandler)
	mux.HandleFunc("GET /api/public/shops", handlers.GetPublicDirectoryHandler)
	mux.HandleFunc("POST /api/call-shop", handlers.CallShop)
	mux.HandleFunc("POST /api/call-shop-webhook", handlers.CallShopWebhook)
	mux.HandleFunc("GET /api/dashboard", middleware.RequireAuth(handlers.GetDashboardData))

	// --- NEW: Shop & Host Upload APIs ---
	mux.HandleFunc("GET /api/host/shop/{id}", middleware.RequireAuth(handlers.GetHostShopDetailsHandler))
	mux.HandleFunc("POST /api/upload", middleware.RequireAuth(handlers.UploadAssetHandler))
	
	// --- NEW: Profile & Messages APIs ---
	mux.HandleFunc("GET /api/profile", middleware.RequireAuth(handlers.GetProfile))
	mux.HandleFunc("POST /api/profile", middleware.RequireAuth(handlers.UpdateProfile))
	mux.HandleFunc("GET /api/profile/check-username", middleware.RequireAuth(handlers.CheckUsername))
	mux.HandleFunc("GET /api/messages", middleware.RequireAuth(handlers.GetUserMessages))
	mux.HandleFunc("POST /api/auth/verify-contact", handlers.CheckContactAndTurnstileHandler)
	
	// --- NEW: Custom User Phone Verification APIs ---
	mux.HandleFunc("POST /api/user/phone/send-otp", middleware.RequireAuth(handlers.SendUserPhoneOTP))
	mux.HandleFunc("POST /api/user/phone/verify-otp", middleware.RequireAuth(handlers.VerifyUserPhoneOTP))
	
	// Directory API
	mux.HandleFunc("GET /api/directory", middleware.RequireAuth(handlers.GetServicesDirectoryHandler))
	
	// Parking Aggregator API
	mux.HandleFunc("GET /api/parking", middleware.RequireAuth(handlers.GetParkingLocations))

	// CORS config
	// Tag Manage API
	mux.HandleFunc("GET /api/tags/manage/{id}", middleware.RequireAuth(handlers.GetTagManageData))
	mux.HandleFunc("POST /api/tags/{id}/toggle-status", middleware.RequireAuth(handlers.ToggleTagStatus))
	mux.HandleFunc("POST /api/tags/{id}/set-status", middleware.RequireAuth(handlers.SetTagStatus))
	mux.HandleFunc("POST /api/tags/{id}/update", middleware.RequireAuth(handlers.UpdateTagDetails))
	mux.HandleFunc("POST /api/tags/{id}/share", middleware.RequireAuth(handlers.ToggleTagShare))
	mux.HandleFunc("DELETE /api/tags/{id}", middleware.RequireAuth(handlers.DeleteTag))
	mux.HandleFunc("GET /api/tags/filter", middleware.RequireAuth(handlers.GetFilteredTags))
	mux.HandleFunc("GET /api/tags/shared/{friendId}", middleware.RequireAuth(handlers.GetSharedTagsWithFriend))

	// Shops API
	mux.HandleFunc("GET /api/shops/status", middleware.RequireAuth(handlers.GetHostStatus))
	mux.HandleFunc("GET /api/host/dashboard", middleware.RequireAuth(handlers.GetHostDashboardData))

	// Network API
	mux.HandleFunc("GET /api/network", middleware.RequireAuth(handlers.GetTrustedNetwork))
	mux.HandleFunc("POST /api/network/invite", middleware.RequireAuth(handlers.FinalizeNetworkInvite))
	mux.HandleFunc("DELETE /api/network/{id}", middleware.RequireAuth(handlers.RemoveNetworkMember))

	//start the server
	fmt.Printf("Server is starting on http://localhost:%s\n", port)

	// --- NEW: Keep-Alive Ping for Free Tier Hosts ---
	// Render and other free hosts sleep after 15 mins of inactivity. 
	// Pinging the external URL routes through the load balancer, keeping the instance awake!
	externalURL := os.Getenv("RENDER_EXTERNAL_URL")
	if externalURL != "" {
		go func() {
			ticker := time.NewTicker(14 * time.Minute)
			for range ticker.C {
				resp, err := http.Get(externalURL + "/api/health")
				if err == nil {
					resp.Body.Close()
					log.Println("Keep-alive ping sent to prevent sleep")
				} else {
					log.Printf("Keep-alive ping failed: %v", err)
				}
			}
		}()
	}

	//ListenAndServe pauses the program here and listens for web traffic
	err = http.ListenAndServe(":"+port, enableCORS(mux))
	if err != nil{
		log.Fatalf("Server Crashed: %v", err)
	}
}