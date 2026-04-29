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
		log.Fatal("Database URL is missing from .env file")
	}

	// Open the connection
	var err error
	DB, err = sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}

	// Ping the database to make sure the password and links are actualy correct
	err = DB.Ping()
	if err != nil {
		log.Fatalf("Database connection Failed! Check your password and URL. Error: %v", err)
	}
	fmt.Println("Successfully connected to Database")
}