package middleware

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type JWKS struct {
	Keys []JWK `json:"keys"`
}

type JWK struct {
	Kty string `json:"kty"`
	Crv string `json:"crv"`
	X   string `json:"x"`
	Y   string `json:"y"`
}

// Decode base64url string to big.Int
func decodeBase64URL(s string) (*big.Int, error) {
	// Add padding if missing
	if pad := len(s) % 4; pad != 0 {
		s += strings.Repeat("=", 4-pad)
	}
	bytes, err := base64.URLEncoding.DecodeString(s)
	if err != nil {
		return nil, err
	}
	return new(big.Int).SetBytes(bytes), nil
}

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
			// Try ECC (P-256) JWKS JSON First (The new Supabase Standard)
			jwksJsonStr := os.Getenv("SUPABASE_JWKS_JSON")
			if jwksJsonStr != "" {
				if _, ok := token.Method.(*jwt.SigningMethodECDSA); ok {
					var jwks JWKS
					if err := json.Unmarshal([]byte(jwksJsonStr), &jwks); err != nil {
						return nil, fmt.Errorf("failed to parse JWKS JSON")
					}
					if len(jwks.Keys) == 0 {
						return nil, fmt.Errorf("no keys found in JWKS")
					}

					jwk := jwks.Keys[0] // Use the first key
					if jwk.Kty != "EC" || jwk.Crv != "P-256" {
						return nil, fmt.Errorf("unsupported key type or curve in JWKS")
					}

					xInt, err := decodeBase64URL(jwk.X)
					if err != nil {
						return nil, fmt.Errorf("invalid x coordinate")
					}
					yInt, err := decodeBase64URL(jwk.Y)
					if err != nil {
						return nil, fmt.Errorf("invalid y coordinate")
					}

					pubKey := &ecdsa.PublicKey{
						Curve: elliptic.P256(),
						X:     xInt,
						Y:     yInt,
					}
					return pubKey, nil
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