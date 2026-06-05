package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
	"sort"
	"strconv"
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
	CabinClass    string `json:"cabinClass"`
	DirectOnly    bool   `json:"directOnly"`
}

// FlightOffer represents a standard ticket offer from either Duffel or Amadeus
type FlightOffer struct {
	ID              string  `json:"id"`
	Provider        string  `json:"provider"`
	Airline         string  `json:"airline"`
	FlightNum       string  `json:"flightNum"`
	Departure       string  `json:"departure"`
	Arrival         string  `json:"arrival"`
	Duration        string  `json:"duration"`
	Price           float64 `json:"price"`
	Currency        string  `json:"currency"`
	IsDirect        bool    `json:"isDirect"`
	Stops           int     `json:"stops"`
	HasCheckedBag   bool    `json:"hasCheckedBag"`
	HasCarryOnBag   bool     `json:"hasCarryOnBag"`
	CheckedBagPrice float64  `json:"checkedBagPrice"`
	CarryOnBagPrice float64  `json:"carryOnBagPrice"`
	LayoverAirports []string `json:"layoverAirports"`
	LayoverDuration int      `json:"layoverDuration"` // Total layover in minutes
	DepartureTime   string   `json:"departureTime"`   // Format: HH:mm
}

// SearchFlights handles the POST /api/flights/search endpoint
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

	// Industry-standard Input Validation
	iataRegex := regexp.MustCompile(`^[A-Z]{3}$`)
	if !iataRegex.MatchString(req.Origin) || !iataRegex.MatchString(req.Destination) {
		http.Error(w, "Invalid Origin or Destination code", http.StatusBadRequest)
		return
	}

	if _, err := time.Parse("2006-01-02", req.DepartureDate); err != nil {
		http.Error(w, "Invalid DepartureDate format", http.StatusBadRequest)
		return
	}

	if req.ReturnDate != "" {
		if _, err := time.Parse("2006-01-02", req.ReturnDate); err != nil {
			http.Error(w, "Invalid ReturnDate format", http.StatusBadRequest)
			return
		}
	}

	if req.Guests < 1 || req.Guests > 9 {
		http.Error(w, "Guests must be between 1 and 9", http.StatusBadRequest)
		return
	}

	validCabins := map[string]bool{"economy": true, "premium_economy": true, "business": true, "first": true}
	if !validCabins[strings.ToLower(req.CabinClass)] {
		http.Error(w, "Invalid CabinClass", http.StatusBadRequest)
		return
	}

	log.Printf("[Flight Engine] Starting live search for route: %s -> %s", req.Origin, req.Destination)

	// Exclusively use live Duffel API
	allOffers := fetchDuffelFlights(req)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"data":   allOffers,
	})
}

// Real Duffel API call
func fetchDuffelFlights(req FlightSearchRequest) []FlightOffer {
	apiKey := os.Getenv("DUFFEL_API_KEY")
	if apiKey == "" {
		log.Println("WARNING: DUFFEL_API_KEY not set. Returning empty duffel results.")
		return []FlightOffer{}
	}

	url := "https://api.duffel.com/air/offer_requests"

	// Construct passenger array based on Guests count
	var passengers []map[string]interface{}
	guests := req.Guests
	if guests < 1 {
		guests = 1
	}
	for i := 0; i < guests; i++ {
		passengers = append(passengers, map[string]interface{}{"type": "adult"})
	}

	// Determine cabin class
	cabinClass := "economy"
	switch strings.ToLower(req.CabinClass) {
	case "premium economy":
		cabinClass = "premium_economy"
	case "business":
		cabinClass = "business"
	case "first":
		cabinClass = "first"
	}

	// Construct slices
	slices := []map[string]interface{}{
		{
			"origin":         req.Origin,
			"destination":    req.Destination,
			"departure_date": req.DepartureDate,
		},
	}
	
	if req.Type == "round-trip" && req.ReturnDate != "" {
		slices = append(slices, map[string]interface{}{
			"origin":         req.Destination,
			"destination":    req.Origin,
			"departure_date": req.ReturnDate,
		})
	}

	payload := map[string]interface{}{
		"data": map[string]interface{}{
			"slices":     slices,
			"passengers": passengers,
			"cabin_class": cabinClass,
		},
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		log.Printf("Error marshaling duffel request: %v", err)
		return []FlightOffer{{Provider: "Error", Airline: "Marshal Failed"}}
	}

	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return []FlightOffer{{Provider: "Error", Airline: "NewRequest Failed"}}
	}

	httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	httpReq.Header.Set("Duffel-Version", "v2")
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		log.Printf("Error calling duffel: %v", err)
		return []FlightOffer{{Provider: "Error", Airline: "Client.Do Failed: " + err.Error()}}
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return []FlightOffer{}
	}

	if resp.StatusCode != 200 && resp.StatusCode != 201 {
		log.Printf("Duffel API error %d: %s", resp.StatusCode, string(body))
		return []FlightOffer{{Provider: fmt.Sprintf("Duffel Error %d", resp.StatusCode), Airline: string(body)}}
	}

	var duffelRes struct {
		Data struct {
			Offers []struct {
				ID         string `json:"id"`
				TotalAmount string `json:"total_amount"`
				TotalCurrency string `json:"total_currency"`
				Slices     []struct {
					Duration string `json:"duration"`
					Segments []struct {
						Origin struct {
							IATA string `json:"iata_code"`
						} `json:"origin"`
						Destination struct {
							IATA string `json:"iata_code"`
						} `json:"destination"`
						OperatingCarrier struct {
							Name string `json:"name"`
						} `json:"operating_carrier"`
						OperatingCarrierFlightNumber string `json:"operating_carrier_flight_number"`
						DepartingAt string `json:"departing_at"`
						ArrivingAt  string `json:"arriving_at"`
					} `json:"segments"`
				} `json:"slices"`
				Passengers []struct {
					Baggages []struct {
						Type     string `json:"type"`
						Quantity int    `json:"quantity"`
					} `json:"baggages"`
				} `json:"passengers"`
			} `json:"offers"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &duffelRes); err != nil {
		log.Printf("Error unmarshaling duffel response: %v", err)
		return []FlightOffer{{Provider: "Error", Airline: "Unmarshal Failed: " + err.Error()}}
	}

	var offers []FlightOffer
	for _, offer := range duffelRes.Data.Offers {
		if len(offer.Slices) == 0 || len(offer.Slices[0].Segments) == 0 {
			continue
		}

		// Filter for direct flights if requested
		if req.DirectOnly && len(offer.Slices[0].Segments) > 1 {
			continue
		}
		
		// If round trip, check return slice too
		if req.DirectOnly && len(offer.Slices) > 1 && len(offer.Slices[1].Segments) > 1 {
			continue
		}

		firstSegment := offer.Slices[0].Segments[0]
		price, _ := strconv.ParseFloat(offer.TotalAmount, 64)
		
		isDirect := len(offer.Slices[0].Segments) == 1
		stops := len(offer.Slices[0].Segments) - 1
		
		hasChecked := false
		hasCarryOn := false
		if len(offer.Passengers) > 0 {
			for _, bag := range offer.Passengers[0].Baggages {
				if bag.Type == "checked" && bag.Quantity > 0 {
					hasChecked = true
				}
				if bag.Type == "carry_on" && bag.Quantity > 0 {
					hasCarryOn = true
				}
			}
		}

		var layoverAirports []string
		var layoverDurationMinutes int

		// Parse Layovers
		if stops > 0 {
			for i := 0; i < len(offer.Slices[0].Segments)-1; i++ {
				seg1 := offer.Slices[0].Segments[i]
				seg2 := offer.Slices[0].Segments[i+1]
				
				layoverAirports = append(layoverAirports, seg1.Destination.IATA)
				
				// Parse times
				arrTime, err1 := time.Parse(time.RFC3339, seg1.ArrivingAt)
				depTime, err2 := time.Parse(time.RFC3339, seg2.DepartingAt)
				if err1 == nil && err2 == nil {
					layoverDurationMinutes += int(depTime.Sub(arrTime).Minutes())
				}
			}
		}

		// Extract HH:mm from Departure
		depTimeStr := ""
		depParsed, err := time.Parse(time.RFC3339, firstSegment.DepartingAt)
		if err == nil {
			depTimeStr = depParsed.Format("15:04")
		} else {
			// Fallback string split
			parts := strings.Split(firstSegment.DepartingAt, "T")
			if len(parts) > 1 {
				depTimeStr = parts[1][:5]
			}
		}

		// Apply standard estimated baggage fees if missing
		checkedBagPrice := 0.0
		carryOnBagPrice := 0.0
		if !hasChecked {
			checkedBagPrice = 45.0
		}
		if !hasCarryOn {
			carryOnBagPrice = 15.0
		}

		offers = append(offers, FlightOffer{
			ID:              offer.ID,
			Provider:        "duffel",
			Airline:         firstSegment.OperatingCarrier.Name,
			FlightNum:       firstSegment.OperatingCarrierFlightNumber,
			Departure:       firstSegment.DepartingAt,
			Arrival:         offer.Slices[0].Segments[len(offer.Slices[0].Segments)-1].ArrivingAt,
			Duration:        offer.Slices[0].Duration,
			Price:           price,
			Currency:        offer.TotalCurrency,
			IsDirect:        isDirect,
			Stops:           stops,
			HasCheckedBag:   hasChecked,
			HasCarryOnBag:   hasCarryOn,
			CheckedBagPrice: checkedBagPrice,
			CarryOnBagPrice: carryOnBagPrice,
			LayoverAirports: layoverAirports,
			LayoverDuration: layoverDurationMinutes,
			DepartureTime:   depTimeStr,
		})
	}

	// Sort offers by price ascending
	sort.Slice(offers, func(i, j int) bool {
		return offers[i].Price < offers[j].Price
	})

	// Removed limit of 20 - returning all flights!
	
	// Estimated prices are now applied directly in the mapping loop.

	return offers
}

// SearchFlightDates handles GET /api/flights/dates
// It fetches the lowest prices for +/- 3 days from the target date concurrently.
func SearchFlightDates(w http.ResponseWriter, r *http.Request) {
	origin := r.URL.Query().Get("origin")
	destination := r.URL.Query().Get("destination")
	dateStr := r.URL.Query().Get("date") // Format: YYYY-MM-DD

	iataRegex := regexp.MustCompile(`^[A-Z]{3}$`)
	if origin == "" || destination == "" || dateStr == "" || !iataRegex.MatchString(origin) || !iataRegex.MatchString(destination) {
		http.Error(w, "Missing or invalid params", http.StatusBadRequest)
		return
	}

	targetDate, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		http.Error(w, "Invalid date format", http.StatusBadRequest)
		return
	}

	// Calculate +/- 3 days
	var datesToFetch []string
	for i := -3; i <= 3; i++ {
		d := targetDate.AddDate(0, 0, i)
		if d.Before(time.Now().Truncate(24 * time.Hour)) {
			continue // Skip past dates
		}
		datesToFetch = append(datesToFetch, d.Format("2006-01-02"))
	}

	var wg sync.WaitGroup
	var mu sync.Mutex
	datePrices := make(map[string]float64)

	for _, d := range datesToFetch {
		wg.Add(1)
		go func(fetchDate string) {
			defer wg.Done()
			req := FlightSearchRequest{
				Origin:        origin,
				Destination:   destination,
				DepartureDate: fetchDate,
				Type:          "one-way",
				Guests:        1,
				CabinClass:    "economy",
			}
			offers := fetchDuffelFlights(req)
			
			if len(offers) > 0 {
				minPrice := offers[0].Price
				for _, o := range offers {
					if o.Price < minPrice {
						minPrice = o.Price
					}
				}
				mu.Lock()
				datePrices[fetchDate] = minPrice
				mu.Unlock()
			}
		}(d)
	}

	wg.Wait()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"data":   datePrices,
	})
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

// SearchAirports handles GET /api/flights/airports?q=...
// It now hits the live Duffel Places API for real-time global autocomplete!
func SearchAirports(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	q := r.URL.Query().Get("q")
	if q == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]Airport{})
		return
	}

	apiKey := os.Getenv("DUFFEL_API_KEY")
	if apiKey == "" {
		log.Println("WARNING: DUFFEL_API_KEY not set. Cannot search airports.")
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]Airport{})
		return
	}

	url := fmt.Sprintf("https://api.duffel.com/places/suggestions?query=%s", q)
	httpReq, err := http.NewRequest("GET", url, nil)
	if err != nil {
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		return
	}

	httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	httpReq.Header.Set("Duffel-Version", "v2")
	httpReq.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		log.Printf("Error calling duffel places: %v", err)
		http.Error(w, "Failed to fetch places", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Failed to read response", http.StatusInternalServerError)
		return
	}

	if resp.StatusCode != 200 {
		log.Printf("Duffel Places API error %d: %s", resp.StatusCode, string(body))
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]Airport{})
		return
	}

	var duffelRes struct {
		Data []struct {
			Name            string `json:"name"`
			IataCode        string `json:"iata_code"`
			Type            string `json:"type"`
			CountryName     string `json:"country_name"`
			IataCountryCode string `json:"iata_country_code"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &duffelRes); err != nil {
		log.Printf("Error unmarshaling duffel places response: %v", err)
		http.Error(w, "Failed to parse places", http.StatusInternalServerError)
		return
	}

	var results []Airport
	for _, p := range duffelRes.Data {
		name := p.Name
		if p.Type == "city" {
			name = name + " (Any)"
		}
		results = append(results, Airport{
			Name:    name,
			Iata:    p.IataCode,
			Type:    p.Type,
			Country: p.CountryName,
			Iso:     p.IataCountryCode,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}
