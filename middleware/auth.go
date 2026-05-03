package middleware

import (
	"context"
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

		// Extract the token string
		tokenString := strings.TrimPrefix(authHeader, "Bearer")
		jwtSecret := os.Getenv("SUPABASE_JWT_SECRET")

		// Parse and Verify the cryptographic signature using our database Secret
		token, err := jwt.Parse(tokenString, func (token *jwt.Token) (interface{}, error)  {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return []byte(jwtSecret), nil
			
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