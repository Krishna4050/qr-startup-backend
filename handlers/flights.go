package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

// FlightSearchRequest payload from the frontend
type FlightSearchRequest struct {
	Origin        string `json:"origin"`
	Destination   string `json:"destination"`
	DepartureDate string `json:"departureDate"`
	ReturnDate    string `json:"returnDate,omitempty"`
	Type          string `json:"type"`
	Guests        int    `json:"guests"`
}

// FlightOffer represents a standard ticket offer from either Duffel or Amadeus
type FlightOffer struct {
	ID          string  `json:"id"`
	Provider    string  `json:"provider"` // "duffel" or "amadeus"
	Airline     string  `json:"airline"`
	FlightNum   string  `json:"flightNum"`
	Departure   string  `json:"departure"`
	Arrival     string  `json:"arrival"`
	Duration    string  `json:"duration"`
	Price       float64 `json:"price"`
	Currency    string  `json:"currency"`
	IsDirect    bool    `json:"isDirect"`
}

// SearchFlights handles the POST /api/flights/search endpoint
// It executes a concurrent fan-out request to both Duffel and Amadeus APIs (mocked for Phase 1)
func SearchFlights(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req FlightSearchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	log.Printf("[Flight Engine] Starting hybrid arbitrage search for route: %s -> %s", req.Origin, req.Destination)

	var wg sync.WaitGroup
	var mu sync.Mutex
	var allOffers []FlightOffer

	// 1. Fan-out to Duffel API (Mocked for Phase 1)
	wg.Add(1)
	go func() {
		defer wg.Done()
		duffelOffers := fetchDuffelFlights(req)
		mu.Lock()
		allOffers = append(allOffers, duffelOffers...)
		mu.Unlock()
	}()

	// 2. Fan-out to Amadeus API (Mocked for Phase 1)
	wg.Add(1)
	go func() {
		defer wg.Done()
		amadeusOffers := fetchAmadeusFlights(req)
		mu.Lock()
		allOffers = append(allOffers, amadeusOffers...)
		mu.Unlock()
	}()

	// Wait for both APIs to return
	wg.Wait()

	// 3. Arbitrage Engine: Sort by price and eliminate duplicates
	// (Placeholder logic: we just return all for now, in Phase 2 we implement strict duplicate elimination based on flight number)
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"data":   allOffers,
	})
}

// Mock Duffel API call
func fetchDuffelFlights(req FlightSearchRequest) []FlightOffer {
	// Simulate network latency
	time.Sleep(600 * time.Millisecond)
	
	return []FlightOffer{
		{
			ID:        "duf_1",
			Provider:  "duffel",
			Airline:   "Finnair",
			FlightNum: "AY131",
			Departure: fmt.Sprintf("%s 08:00", req.DepartureDate),
			Arrival:   fmt.Sprintf("%s 11:30", req.DepartureDate),
			Duration:  "3h 30m",
			Price:     145.50,
			Currency:  "EUR",
			IsDirect:  true,
		},
		{
			ID:        "duf_2",
			Provider:  "duffel",
			Airline:   "Norwegian",
			FlightNum: "D8-442",
			Departure: fmt.Sprintf("%s 14:00", req.DepartureDate),
			Arrival:   fmt.Sprintf("%s 17:45", req.DepartureDate),
			Duration:  "3h 45m",
			Price:     89.00,
			Currency:  "EUR",
			IsDirect:  true,
		},
	}
}

// Mock Amadeus API call
func fetchAmadeusFlights(req FlightSearchRequest) []FlightOffer {
	// Simulate network latency
	time.Sleep(800 * time.Millisecond)
	
	return []FlightOffer{
		{
			ID:        "amd_1",
			Provider:  "amadeus",
			Airline:   "Finnair",
			FlightNum: "AY131", // Same flight as Duffel, but Amadeus GDS price is higher!
			Departure: fmt.Sprintf("%s 08:00", req.DepartureDate),
			Arrival:   fmt.Sprintf("%s 11:30", req.DepartureDate),
			Duration:  "3h 30m",
			Price:     165.00, // 20 EUR more expensive via GDS
			Currency:  "EUR",
			IsDirect:  true,
		},
		{
			ID:        "amd_2",
			Provider:  "amadeus",
			Airline:   "Lufthansa",
			FlightNum: "LH849",
			Departure: fmt.Sprintf("%s 10:15", req.DepartureDate),
			Arrival:   fmt.Sprintf("%s 15:20", req.DepartureDate),
			Duration:  "5h 05m",
			Price:     210.00,
			Currency:  "EUR",
			IsDirect:  false,
		},
	}
}

// --- AIRPORT AUTOCOMPLETE LOGIC ---

type Airport struct {
	Iata    string `json:"iata"`
	Iso     string `json:"iso"`
	Name    string `json:"name"`
	Type    string `json:"type"`
	Size    string `json:"size"`
	Country string `json:"country,omitempty"` // we map ISO to a generic name or just use iso
}

var (
	airportsCache []Airport
	airportsMutex sync.RWMutex
	airportsLoaded bool
)

func loadAirports() {
	airportsMutex.Lock()
	defer airportsMutex.Unlock()

	if airportsLoaded {
		return
	}

	data, err := os.ReadFile("data/airports.json")
	if err != nil {
		log.Printf("Failed to read airports.json: %v", err)
		return
	}

	var allAirports []Airport
	if err := json.Unmarshal(data, &allAirports); err != nil {
		log.Printf("Failed to unmarshal airports.json: %v", err)
		return
	}

	// Filter out empty iata codes
	for _, a := range allAirports {
		if a.Iata != "" {
			a.Country = a.Iso
			airportsCache = append(airportsCache, a)
		}
	}

	airportsLoaded = true
	log.Printf("Loaded %d airports into memory", len(airportsCache))
}

// SearchAirports handles GET /api/flights/airports?q=...
func SearchAirports(w http.ResponseWriter, r *http.Request) {
	if !airportsLoaded {
		loadAirports()
	}

	// Set CORS headers for the frontend to be able to call this endpoint
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	q := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("q")))
	if q == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]Airport{})
		return
	}

	airportsMutex.RLock()
	defer airportsMutex.RUnlock()

	var results []Airport
	for _, a := range airportsCache {
		if strings.Contains(strings.ToLower(a.Name), q) || strings.Contains(strings.ToLower(a.Iata), q) || strings.Contains(strings.ToLower(a.Iso), q) {
			results = append(results, a)
			if len(results) >= 15 { // Max 15 suggestions
				break
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}
