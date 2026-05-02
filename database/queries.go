package database

import (
	"database/sql"
	"fmt"
)

//GetOwnerPhone looks up a tag by its ID and finds the owners verified phone Number
func GetOwnerPhone(tagID string) (string, error){
	var phoneNumber string

	// The SQL queries
	query := `
			SELECT profiles.phone_number
			FROM qr_tags
			JOIN profiles ON qr_tags.user_id = profiles.id
			WHERE qr_tags.id = $1 AND profiles.is_phone_verified = TRUE
	`
	// Execute the query using global DB connection
	err := DB.QueryRow(query, tagID).Scan(&phoneNumber)

	// Error handling if tag doesn't exit or phone number is not verified
	if err != nil {
		if err == sql.ErrNoRows{
			return "", fmt.Errorf("Tag not found or Phone Number is not Verified")
		}
		return "", err
	}
	return phoneNumber, nil
}