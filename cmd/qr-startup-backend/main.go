package main

import (
	"fmt"
	"log"
	"net/http"
)

func main(){
	// create a new router (The traffic cop)
	mux := http.NewServeMux()

	// create a health check route
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status": "success", "message": "Finnish QR Startup Backend is running perfectly!"}`))
	})

	//start the server
	port := ":8080"
	fmt.Printf("Server is starting on http://localhost%s\n", port)

	//ListenAndServe pauses the program here and listens for web traffic
	err := http.ListenAndServe(port, mux)
	if err != nil{
		log.Fatalf("Server Crashed: %v", err)
	}
}