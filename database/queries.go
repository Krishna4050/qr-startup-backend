package database

import (
	"database/sql"
	"fmt"
)

//GetOwnerPhone looks up a tag by its ID and finds the owners verified phone Number
func GetOwnerPhone(tagID string) (string, error){
	var phoneNumber string
	
}