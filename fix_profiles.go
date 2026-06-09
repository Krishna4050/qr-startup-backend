package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		// Just connect using default localhost if possible or hardcode if we know it
		// But let's check .env
        fmt.Println("No DATABASE_URL")
		return
	}
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	res, err := db.Exec(`UPDATE public.profiles SET display_name = 'User', username = 'User' WHERE display_name IN ('0', '583.51 EUR') OR username IN ('0', '583.51 EUR')`)
	if err != nil {
		log.Fatal(err)
	}
	rows, _ := res.RowsAffected()
	fmt.Printf("Fixed %d rows in public.profiles\n", rows)
}
