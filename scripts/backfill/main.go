package main

import (
	"database/sql"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	godotenv.Load(".env")
	dbUrl := os.Getenv("SUPABASE_DB_URL")
	apiKey := os.Getenv("DUFFEL_API_KEY")

	if dbUrl == "" || apiKey == "" {
		log.Fatal("Missing SUPABASE_DB_URL or DUFFEL_API_KEY")
	}

	db, err := sql.Open("postgres", dbUrl)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	rows, err := db.Query("SELECT id, duffel_order_id FROM flight_bookings WHERE flight_details IS NULL")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	client := &http.Client{Timeout: 10 * time.Second}

	for rows.Next() {
		var id int
		var duffelID string
		if err := rows.Scan(&id, &duffelID); err != nil {
			log.Println("Scan error:", err)
			continue
		}

		req, _ := http.NewRequest("GET", "https://api.duffel.com/air/orders/"+duffelID, nil)
		req.Header.Set("Authorization", "Bearer "+apiKey)
		req.Header.Set("Duffel-Version", "v2")
		req.Header.Set("Accept", "application/json")

		resp, err := client.Do(req)
		if err != nil || resp.StatusCode != 200 {
			log.Printf("Failed to fetch order %s: %v (status %d)", duffelID, err, resp.StatusCode)
			continue
		}

		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		_, err = db.Exec("UPDATE flight_bookings SET flight_details = $1 WHERE id = $2", string(body), id)
		if err != nil {
			log.Printf("Failed to update order %d: %v", id, err)
		} else {
			fmt.Printf("Successfully backfilled order %d (%s)\n", id, duffelID)
		}
	}
}
