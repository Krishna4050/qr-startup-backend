package database

import (
	"database/sql"
	"fmt"
)

// GetTagDetails fetches the public-facing details for a scanned tag
func GetTagDetails(tagCode string) (map[string]interface{}, error) {
	var itemName sql.NullString 
	var status string
	var isClaimed bool

	
	query := `
		SELECT item_name, status, owner_id IS NOT NULL as is_claimed
		FROM qr_tags
		WHERE tag_code = $1
	`
	
	err := DB.QueryRow(query, tagCode).Scan(&itemName, &status, &isClaimed)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"tag_code":   tagCode,
		"item_name":  itemName.String,
		"status":     status,
		"is_claimed": isClaimed,
	}, nil
}

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

// ClaimTag assigns a blan QR tags to a specific user
func ClaimTag(tagID string, userID string) error {
	query := `
			UPDATE qr_tags
			SET owner_id = $1
			WHERE id = $2 AND user_id IS NULL
	`

	// Execute the update
	result, err := DB.Exec(query, userID, tagID)
	if err != nil {
		return err // something went wrong with the database connection
	}

	//Check how many rows were actually updated
	rowsAffected, err := result.RowsAffected()
	if err !=nil {
		return err
	}

	// IF 0 rows were updated, it means the tag either doesn't exits or someone else has already claimed it
	if rowsAffected == 0 {
		return fmt.Errorf("Invalied tag or tag is already claimed by another user")
	}

	return nil
}