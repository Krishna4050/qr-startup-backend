package main

import (
	"database/sql"
	"fmt"
	_ "github.com/lib/pq"
	"log"
)

func main() {
	connStr := "postgres://postgres:postgres@localhost:54322/postgres?sslmode=disable"
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}
	rows, err := db.Query("SELECT * FROM public.alerts LIMIT 1")
	if err != nil {
		log.Fatal(err)
	}
	cols, _ := rows.Columns()
	fmt.Println("Columns:", cols)
}
