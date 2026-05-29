package middleware

import (
	"context"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

//RequireAuth is a middleware that check for a valid database JWT token
func RequireAuth(next http.HandlerFunc) http.HandlerFunc{
	return func(w http.ResponseWriter, r *http.Request) {
		// Grab the Authorization Header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer") {
			http.Error(w, "Unauthorized: Missing token", http.StatusUnauthorized)
			return
		}

		// Extract the token string (and remove the space that comes after 'Bearer ')
		tokenString := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer"))
		// Parse and Verify the cryptographic signature using our database Secret or Public Key
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// Try ECC (P-256) Public Key First (The new Supabase Standard)
			pubKeyStr := os.Getenv("SUPABASE_JWT_PUBLIC_KEY")
			if pubKeyStr != "" {
				if _, ok := token.Method.(*jwt.SigningMethodECDSA); ok {
					// Some environments escape newlines, so we replace them just in case
					pubKeyStr = strings.ReplaceAll(pubKeyStr, "\\n", "\n")
					block, _ := pem.Decode([]byte(pubKeyStr))
					if block == nil {
						return nil, fmt.Errorf("failed to parse PEM block containing the public key")
					}
					pub, err := x509.ParsePKIXPublicKey(block.Bytes)
					if err != nil {
						return nil, err
					}
					return pub, nil
				}
			}

			// Fallback to Legacy HMAC Secret
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); ok {
				jwtSecret := os.Getenv("SUPABASE_JWT_SECRET")
				if jwtSecret == "" {
					return nil, fmt.Errorf("missing legacy secret in environment")
				}
				return []byte(jwtSecret), nil
			}

			return nil, fmt.Errorf("unexpected signing method")
		})

		if err != nil || !token.Valid {
			http.Error(w, "Unauthorized: Invalid token", http.StatusUnauthorized)
			return
		}

		// Execute the User ID (sub in JWT terms) and pass it to the next function
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			http.Error(w, "Unauthorized: Invalid claims", http.StatusUnauthorized)
			return
		}

		userID := claims["sub"].(string)

		//Create a new request context with the USer ID safely inside it
		ctx := context.WithValue(r.Context(), "userID", userID)

		// Let the user pass through to the actual route
		next.ServeHTTP(w, r.WithContext(ctx))

	}
}