package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	_ "github.com/lib/pq" // This underscore tells GO: load this behind the scenes so database/sql can use it
)

// DB is our global database connection pool that the rest of our app can use 
var DB *sql.DB

//ConnectDB reads .env files, open the pipeline and check if it works
func ConnectDB(){
	//Get the URL from .env file
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Println("Warning: Database URL is missing from .env file. Database will be disabled.")
		return
	}

	// Open the connection
	var err error
	DB, err = sql.Open("postgres", dsn)
	if err != nil {
		log.Printf("Failed to open database: %v. Database will be disabled.\n", err)
		return
	}

	// Ping the database to make sure the password and links are actualy correct
	err = DB.Ping()
	if err != nil {
		log.Printf("Database connection Failed! Check your password and URL. Error: %v\n", err)
		return
	}
	fmt.Println("Successfully connected to Database")
}