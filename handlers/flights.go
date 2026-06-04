package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
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
	HasCarryOnBag   bool    `json:"hasCarryOnBag"`
	CheckedBagPrice float64 `json:"checkedBagPrice"`
	CarryOnBagPrice float64 `json:"carryOnBagPrice"`
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
		return []FlightOffer{}
	}

	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return []FlightOffer{}
	}

	httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	httpReq.Header.Set("Duffel-Version", "v1")
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		log.Printf("Error calling duffel: %v", err)
		return []FlightOffer{}
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return []FlightOffer{}
	}

	if resp.StatusCode != 200 {
		log.Printf("Duffel API error %d: %s", resp.StatusCode, string(body))
		return []FlightOffer{}
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
		return []FlightOffer{}
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

		offers = append(offers, FlightOffer{
			ID:            offer.ID,
			Provider:      "duffel",
			Airline:       firstSegment.OperatingCarrier.Name,
			FlightNum:     firstSegment.OperatingCarrierFlightNumber,
			Departure:     firstSegment.DepartingAt,
			Arrival:       offer.Slices[0].Segments[len(offer.Slices[0].Segments)-1].ArrivingAt,
			Duration:      offer.Slices[0].Duration,
			Price:         price,
			Currency:      offer.TotalCurrency,
			IsDirect:      isDirect,
			Stops:         stops,
			HasCheckedBag: hasChecked,
			HasCarryOnBag: hasCarryOn,
		})
	}

	// Sort offers by price ascending
	sort.Slice(offers, func(i, j int) bool {
		return offers[i].Price < offers[j].Price
	})

	// Take Top 20 offers to avoid massive parallel requests
	limit := 20
	if len(offers) < limit {
		limit = len(offers)
	}
	offers = offers[:limit]

	// Concurrently fetch available_services for these 20 offers
	var wg sync.WaitGroup
	for i := range offers {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			
			// Default estimated prices if Duffel doesn't return any
			offers[idx].CheckedBagPrice = 40.0
			offers[idx].CarryOnBagPrice = 15.0

			reqURL := fmt.Sprintf("https://api.duffel.com/air/offers/%s?return_available_services=true", offers[idx].ID)
			svcReq, err := http.NewRequest("GET", reqURL, nil)
			if err != nil { return }
			svcReq.Header.Set("Authorization", "Bearer "+apiKey)
			svcReq.Header.Set("Duffel-Version", "v2")
			svcReq.Header.Set("Accept", "application/json")

			client := &http.Client{Timeout: 5 * time.Second}
			res, err := client.Do(svcReq)
			if err != nil || res.StatusCode != 200 { return }
			defer res.Body.Close()

			body, _ := io.ReadAll(res.Body)
			
			var singleOffer struct {
				Data struct {
					AvailableServices []struct {
						Type        string `json:"type"`
						TotalAmount string `json:"total_amount"`
						Metadata    struct {
							Type string `json:"type"`
						} `json:"metadata"`
					} `json:"available_services"`
				} `json:"data"`
			}
			
			if err := json.Unmarshal(body, &singleOffer); err == nil {
				foundChecked := false
				foundCarry := false
				for _, svc := range singleOffer.Data.AvailableServices {
					if svc.Type == "baggage" {
						amt, _ := strconv.ParseFloat(svc.TotalAmount, 64)
						if svc.Metadata.Type == "checked" && !foundChecked {
							offers[idx].CheckedBagPrice = amt
							foundChecked = true
						} else if svc.Metadata.Type == "carry_on" && !foundCarry {
							offers[idx].CarryOnBagPrice = amt
							foundCarry = true
						}
					}
				}
			}
		}(i)
	}
	wg.Wait()

	return offers
}

// SearchFlightDates handles GET /api/flights/dates
// It fetches the lowest prices for +/- 3 days from the target date concurrently.
func SearchFlightDates(w http.ResponseWriter, r *http.Request) {
	origin := r.URL.Query().Get("origin")
	destination := r.URL.Query().Get("destination")
	dateStr := r.URL.Query().Get("date") // Format: YYYY-MM-DD

	if origin == "" || destination == "" || dateStr == "" {
		http.Error(w, "Missing params", http.StatusBadRequest)
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

var isoToCountry = map[string]string{
	"US": "United States", "GB": "United Kingdom", "IT": "Italy", "ES": "Spain",
	"FR": "France", "DE": "Germany", "JP": "Japan", "CN": "China",
	"IN": "India", "BR": "Brazil", "CA": "Canada", "AU": "Australia",
	"RU": "Russia", "MX": "Mexico", "ZA": "South Africa", "TR": "Turkey",
	"AE": "United Arab Emirates", "SA": "Saudi Arabia", "EG": "Egypt", "FI": "Finland",
	"SE": "Sweden", "NO": "Norway", "DK": "Denmark", "NL": "Netherlands",
	"CH": "Switzerland", "AT": "Austria", "BE": "Belgium", "GR": "Greece",
	"PT": "Portugal", "IE": "Ireland", "NZ": "New Zealand", "SG": "Singapore",
	"MY": "Malaysia", "TH": "Thailand", "VN": "Vietnam", "ID": "Indonesia",
	"PH": "Philippines", "KR": "South Korea", "TW": "Taiwan", "HK": "Hong Kong",
}

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
			if countryName, exists := isoToCountry[a.Iso]; exists {
				a.Country = countryName
			} else {
				a.Country = a.Iso
			}
			airportsCache = append(airportsCache, a)
		}
	}

	airportsLoaded = true
	log.Printf("Loaded %d airports into memory", len(airportsCache))
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
