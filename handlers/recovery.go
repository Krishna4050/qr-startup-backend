package handlers

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/Krishna4050/qr-startup-backend/database"
	"github.com/resend/resend-go/v2"
	"github.com/twilio/twilio-go"
	api "github.com/twilio/twilio-go/rest/api/v2010"
)

type RecoveryOTPData struct {
	Code      string
	ExpiresAt time.Time
	Attempts  int
	TargetID  string // Can be UserID or primary Email depending on flow
}

var (
	recoveryMutex      sync.Mutex
	recoveryOTPCache   = make(map[string]RecoveryOTPData)
	recoveryLockoutMap = make(map[string]time.Time)
)

func generate8DigitOTP() string {
	max := big.NewInt(100000000)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "00000000"
	}
	return fmt.Sprintf("%08d", n.Int64())
}

func isLockedOut(identifier string) bool {
	recoveryMutex.Lock()
	defer recoveryMutex.Unlock()
	lockTime, exists := recoveryLockoutMap[identifier]
	if exists {
		if time.Now().Before(lockTime) {
			return true
		}
		delete(recoveryLockoutMap, identifier)
	}
	return false
}

func registerFailedAttempt(identifier string) bool {
	recoveryMutex.Lock()
	defer recoveryMutex.Unlock()
	
	data, exists := recoveryOTPCache[identifier]
	if !exists {
		return false
	}
	
	data.Attempts++
	recoveryOTPCache[identifier] = data
	
	if data.Attempts >= 3 {
		recoveryLockoutMap[identifier] = time.Now().Add(24 * time.Hour)
		delete(recoveryOTPCache, identifier)
		return true // Locked out
	}
	return false // Not locked out yet
}

func sendRecoverySMS(phone, code string) error {
	var twilioEnabled bool
	err := database.DB.QueryRow("SELECT setting_value FROM system_settings WHERE setting_key = 'twilio_sms_enabled'").Scan(&twilioEnabled)
	if err != nil || !twilioEnabled {
		fmt.Printf("[ADMIN DISABLED] Mock SMS to %s: Your recovery code is %s\n", phone, code)
		return nil
	}

	projectNumber := os.Getenv("TWILIO_PHONE_NUMBER")
	client := twilio.NewRestClient()
	params := &api.CreateMessageParams{}
	params.SetTo(phone)
	params.SetFrom(projectNumber)
	params.SetBody(fmt.Sprintf("Your secure QR Startup recovery code is: %s. It expires in 5 minutes.", code))

	_, err = client.Api.CreateMessage(params)
	return err
}

func sendRecoveryEmail(email, code string) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		fmt.Printf("[MOCK EMAIL] To %s: Your recovery code is %s\n", email, code)
		return nil
	}
	client := resend.NewClient(apiKey)

	htmlContent := fmt.Sprintf(`<h2>Account Recovery</h2><p>Your secure 8-digit recovery code is:</p><h3>%s</h3><p>It expires in 5 minutes. Do not share this code with anyone.</p>`, code)

	params := &resend.SendEmailRequest{
		From:    "Security <security@krishnaadhikari.com>",
		To:      []string{email},
		Subject: "Your Account Recovery Code",
		Html:    htmlContent,
	}

	_, err := client.Emails.Send(params)
	return err
}

type ForgotEmailRequest struct {
	Contact string `json:"contact"` // Phone or Recovery Email
}

// POST /api/auth/recovery/forgot-email/send-otp
func ForgotEmailSendOTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ForgotEmailRequest
	json.NewDecoder(r.Body).Decode(&req)

	if isLockedOut(req.Contact) {
		http.Error(w, "Too many failed attempts. Try again in 24 hours.", http.StatusTooManyRequests)
		return
	}

	var primaryEmail string
	err := database.DB.QueryRow(`
		SELECT u.email 
		FROM public.profiles p 
		JOIN auth.users u ON u.id = p.id 
		WHERE p.phone_number = $1 OR p.recovery_email = $1 
		LIMIT 1`, req.Contact).Scan(&primaryEmail)

	if err != nil {
		http.Error(w, "No account matches this contact information.", http.StatusNotFound)
		return
	}

	code := generate8DigitOTP()
	recoveryMutex.Lock()
	recoveryOTPCache[req.Contact] = RecoveryOTPData{
		Code:      code,
		ExpiresAt: time.Now().Add(5 * time.Minute),
		Attempts:  0,
		TargetID:  primaryEmail,
	}
	recoveryMutex.Unlock()

	// Detect if it's a phone or email
	if req.Contact[0] == '+' || (req.Contact[0] >= '0' && req.Contact[0] <= '9') {
		sendRecoverySMS(req.Contact, code)
	} else {
		sendRecoveryEmail(req.Contact, code)
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

type OTPVerifyRequest struct {
	Contact string `json:"contact"`
	Code    string `json:"code"`
}

// POST /api/auth/recovery/forgot-email/verify-otp
func ForgotEmailVerifyOTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req OTPVerifyRequest
	json.NewDecoder(r.Body).Decode(&req)

	if isLockedOut(req.Contact) {
		http.Error(w, "Too many failed attempts. Try again in 24 hours.", http.StatusTooManyRequests)
		return
	}

	recoveryMutex.Lock()
	data, exists := recoveryOTPCache[req.Contact]
	recoveryMutex.Unlock()

	if !exists {
		http.Error(w, "No pending recovery request found or it expired.", http.StatusBadRequest)
		return
	}

	if time.Now().After(data.ExpiresAt) {
		recoveryMutex.Lock()
		delete(recoveryOTPCache, req.Contact)
		recoveryMutex.Unlock()
		http.Error(w, "Code expired. Please request a new one.", http.StatusBadRequest)
		return
	}

	if data.Code != req.Code {
		locked := registerFailedAttempt(req.Contact)
		if locked {
			http.Error(w, "Too many failed attempts. Try again in 24 hours.", http.StatusTooManyRequests)
		} else {
			http.Error(w, "Invalid verification code", http.StatusUnauthorized)
		}
		return
	}

	// Success! Return the email.
	recoveryMutex.Lock()
	delete(recoveryOTPCache, req.Contact)
	recoveryMutex.Unlock()

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"email": data.TargetID})
}

// PASSWORD RECOVERY
// POST /api/auth/recovery/forgot-password/send-otp
func ForgotPasswordSendOTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ForgotEmailRequest // Reuse struct since it just needs "contact"
	json.NewDecoder(r.Body).Decode(&req)

	if isLockedOut(req.Contact) {
		http.Error(w, "Too many failed attempts. Try again in 24 hours.", http.StatusTooManyRequests)
		return
	}

	// For password reset, they enter the target contact they want the OTP sent to.
	// We need to verify that this contact is associated with an account.
	var userID string
	err := database.DB.QueryRow(`
		SELECT p.id 
		FROM public.profiles p 
		JOIN auth.users u ON u.id = p.id 
		WHERE u.email = $1 OR p.phone_number = $1 OR p.recovery_email = $1 
		LIMIT 1`, req.Contact).Scan(&userID)

	if err != nil {
		http.Error(w, "Account not found or contact invalid.", http.StatusNotFound)
		return
	}

	code := generate8DigitOTP()
	recoveryMutex.Lock()
	recoveryOTPCache[req.Contact] = RecoveryOTPData{
		Code:      code,
		ExpiresAt: time.Now().Add(5 * time.Minute),
		Attempts:  0,
		TargetID:  userID,
	}
	recoveryMutex.Unlock()

	if req.Contact[0] == '+' || (req.Contact[0] >= '0' && req.Contact[0] <= '9') {
		sendRecoverySMS(req.Contact, code)
	} else {
		sendRecoveryEmail(req.Contact, code)
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// POST /api/auth/recovery/forgot-password/verify-otp
func ForgotPasswordVerifyOTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req OTPVerifyRequest
	json.NewDecoder(r.Body).Decode(&req)

	if isLockedOut(req.Contact) {
		http.Error(w, "Too many failed attempts. Try again in 24 hours.", http.StatusTooManyRequests)
		return
	}

	recoveryMutex.Lock()
	data, exists := recoveryOTPCache[req.Contact]
	recoveryMutex.Unlock()

	if !exists {
		http.Error(w, "No pending recovery request found.", http.StatusBadRequest)
		return
	}

	if time.Now().After(data.ExpiresAt) {
		recoveryMutex.Lock()
		delete(recoveryOTPCache, req.Contact)
		recoveryMutex.Unlock()
		http.Error(w, "Code expired. Please request a new one.", http.StatusBadRequest)
		return
	}

	if data.Code != req.Code {
		locked := registerFailedAttempt(req.Contact)
		if locked {
			http.Error(w, "Too many failed attempts. Try again in 24 hours.", http.StatusTooManyRequests)
		} else {
			http.Error(w, "Invalid verification code", http.StatusUnauthorized)
		}
		return
	}

	// Success! We keep the token in the cache but mark it verified, or we issue a temporary reset token.
	// For simplicity, we can issue a JWT or just generate a new reset token in cache.
	resetToken := generate8DigitOTP() + generate8DigitOTP()
	
	recoveryMutex.Lock()
	delete(recoveryOTPCache, req.Contact)
	// We use the reset token as the new key, so the user can use it once to reset the password.
	recoveryOTPCache[resetToken] = RecoveryOTPData{
		Code:      "VERIFIED",
		ExpiresAt: time.Now().Add(10 * time.Minute),
		TargetID:  data.TargetID,
	}
	recoveryMutex.Unlock()

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"reset_token": resetToken})
}

type ResetPasswordRequest struct {
	ResetToken      string `json:"reset_token"`
	NewPassword     string `json:"new_password"`
	SignoutAll      bool   `json:"signout_all"`
}

// POST /api/auth/recovery/forgot-password/reset
func ForgotPasswordReset(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ResetPasswordRequest
	json.NewDecoder(r.Body).Decode(&req)

	recoveryMutex.Lock()
	data, exists := recoveryOTPCache[req.ResetToken]
	if exists {
		delete(recoveryOTPCache, req.ResetToken)
	}
	recoveryMutex.Unlock()

	if !exists || time.Now().After(data.ExpiresAt) {
		http.Error(w, "Invalid or expired reset session.", http.StatusUnauthorized)
		return
	}

	userID := data.TargetID

	// Update the password securely using pg_crypto via Supabase GoTrue auth.users table
	// Wait, Postgres directly updating encrypted_password requires crypt(password, gen_salt('bf'))
	_, err := database.DB.Exec(`UPDATE auth.users SET encrypted_password = crypt($1, gen_salt('bf')) WHERE id = $2`, req.NewPassword, userID)
	if err != nil {
		fmt.Printf("Failed to update password: %v\n", err)
		http.Error(w, "Failed to update password", http.StatusInternalServerError)
		return
	}

	if req.SignoutAll {
		// Invalidate all active sessions
		database.DB.Exec(`DELETE FROM auth.refresh_tokens WHERE session_id IN (SELECT id FROM auth.sessions WHERE user_id = $1)`, userID)
		database.DB.Exec(`DELETE FROM auth.sessions WHERE user_id = $1`, userID)
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}
