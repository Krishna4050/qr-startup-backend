package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Krishna4050/qr-startup-backend/database"
)

type FintrafficResponse struct {
	Results []FintrafficFacility `json:"results"`
}

type FintrafficFacility struct {
	ID            int    `json:"id"`
	Name          Name   `json:"name"`
	Location      Loc    `json:"location"`
	Type          string `json:"type"`
	Status        string `json:"status"`
	PricingMethod string `json:"pricingMethod"`
	BuiltCapacity Cap    `json:"builtCapacity"`
}

type Name struct {
	Fi string `json:"fi"`
	En string `json:"en"`
}

type Loc struct {
	Coordinates [][][]float64 `json:"coordinates"`
}

type Cap struct {
	Car int `json:"CAR"`
}

type ParkingSpace struct {
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	Latitude      float64 `json:"latitude"`
	Longitude     float64 `json:"longitude"`
	Capacity      int     `json:"capacity"`
	IsFree        bool    `json:"is_free"`
	PricingInfo   string  `json:"pricing_info"`
	Source        string  `json:"source"`
	LiveOccupancy int     `json:"live_occupancy"`
	PricingZone   string  `json:"pricing_zone"`
	HourlyRate    float64 `json:"hourly_rate"`
	WeekendRate   float64 `json:"weekend_rate"`
	IsResidential bool    `json:"is_residential"`
}

type OverpassResponse struct {
	Elements []OverpassElement `json:"elements"`
}

type OverpassElement struct {
	Id   int64             `json:"id"`
	Lat  float64           `json:"lat"`
	Lon  float64           `json:"lon"`
	Tags map[string]string `json:"tags"`
}

type GeoJSONFeatureCollection struct {
	Features []GeoJSONFeature `json:"features"`
}

type GeoJSONFeature struct {
	ID         string                 `json:"id"`
	Properties map[string]interface{} `json:"properties"`
	Geometry   GeoJSONGeometry        `json:"geometry"`
}

type GeoJSONGeometry struct {
	Type        string        `json:"type"`
	Coordinates []interface{} `json:"coordinates"` // Can be highly nested depending on Polygon vs MultiPolygon
}

var parkingCache []ParkingSpace
var lastCacheTime time.Time

// GetParkingLocations Handler to fetch and return standardized parking locations
func GetParkingLocations(w http.ResponseWriter, r *http.Request) {
	// Simple caching (cache for 15 minutes)
	if len(parkingCache) > 0 && time.Since(lastCacheTime) < 15*time.Minute {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "success",
			"data":   parkingCache,
		})
		return
	}

	// Fetch from Fintraffic LIIPI API
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get("https://parking.fintraffic.fi/api/v1/facilities")
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"status":"error", "message":"Failed to fetch parking data: %v"}`, err), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	var finResponse FintrafficResponse
	if err := json.NewDecoder(resp.Body).Decode(&finResponse); err != nil {
		http.Error(w, `{"status":"error", "message":"Failed to decode parking data"}`, http.StatusInternalServerError)
		return
	}

	var parsedSpaces []ParkingSpace
	for _, f := range finResponse.Results {
		// We only want car parking for now (ignore bicycle)
		if f.Type != "CAR" {
			continue
		}

		// Calculate rough center from the polygon coordinates
		var lat, lng float64
		if len(f.Location.Coordinates) > 0 && len(f.Location.Coordinates[0]) > 0 {
			// Fintraffic uses [Longitude, Latitude]
			lng = f.Location.Coordinates[0][0][0]
			lat = f.Location.Coordinates[0][0][1]
		} else {
			continue
		}

		name := f.Name.En
		if name == "" {
			name = f.Name.Fi
		}

		// Determine if it's free
		isFree := false
		if f.PricingMethod == "PARK_AND_RIDE_247_FREE" || f.PricingMethod == "FREE_12H" {
			isFree = true
		}

		// Simulated Live Occupancy (Realistic based on time of day)
		hour := time.Now().Hour()
		occupancyRate := 0.2 // Base occupancy 20%
		if hour >= 8 && hour <= 17 {
			occupancyRate = 0.7 + (float64(f.ID%30) / 100.0) // 70-100% full during work hours
		} else if hour > 17 && hour <= 22 {
			occupancyRate = 0.5 + (float64(f.ID%20) / 100.0) // 50-70% full evening
		}
		liveOccupancy := int(float64(f.BuiltCapacity.Car) * occupancyRate)
		if liveOccupancy > f.BuiltCapacity.Car {
			liveOccupancy = f.BuiltCapacity.Car
		}

		parsedSpaces = append(parsedSpaces, ParkingSpace{
			ID:            fmt.Sprintf("fintraffic-%d", f.ID),
			Name:          name,
			Latitude:      lat,
			Longitude:     lng,
			Capacity:      f.BuiltCapacity.Car,
			IsFree:        isFree,
			PricingInfo:   f.PricingMethod,
			Source:        "fintraffic",
			LiveOccupancy: liveOccupancy,
			PricingZone:   "Garage",
			HourlyRate:    2.50,
			WeekendRate:   1.50,
			IsResidential: false,
		})
	}

	// Fetch OSM Street Parking
	osmSpaces := fetchOSMParking()
	parsedSpaces = append(parsedSpaces, osmSpaces...)

	// Fetch Helsinki City WFS Parking
	helsinkiSpaces := fetchHelsinkiParking()
	parsedSpaces = append(parsedSpaces, helsinkiSpaces...)

	// Fetch P2P Parking spots
	p2pSpaces := fetchP2PParkingSpots()
	parsedSpaces = append(parsedSpaces, p2pSpaces...)

	// Update cache
	parkingCache = parsedSpaces
	lastCacheTime = time.Now()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"data":   parkingCache,
	})
}

func fetchOSMParking() []ParkingSpace {
	var spaces []ParkingSpace
	client := &http.Client{Timeout: 15 * time.Second}

	// Query OSM for street-side parking in Finland
	// We use an area query for Finland (approx), and limit to 3000 nodes to prevent huge payloads
	query := `[out:json][timeout:15];
area["name"="Suomi"]->.searchArea;
node["amenity"="parking"]["parking"="street_side"](area.searchArea);
out 3000;`

	resp, err := client.PostForm("https://overpass-api.de/api/interpreter", url.Values{"data": {query}})
	if err != nil {
		fmt.Println("OSM Fetch Error:", err)
		return spaces
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Println("OSM Non-OK Status:", resp.StatusCode)
		return spaces
	}

	bodyBytes, _ := io.ReadAll(resp.Body)
	var overpassResp OverpassResponse
	if err := json.Unmarshal(bodyBytes, &overpassResp); err != nil {
		fmt.Println("OSM Decode Error:", err)
		return spaces
	}

	for _, el := range overpassResp.Elements {
		name := el.Tags["name"]
		if name == "" {
			name = el.Tags["addr:street"]
		}
		if name == "" {
			name = "Street Parking"
		}
		
		isFree := true
		if fee, ok := el.Tags["fee"]; ok && strings.ToLower(fee) == "yes" {
			isFree = false
		}

		// Determine Helsinki Zones (Simulated based on coordinates)
		// Helsinki center is ~ 60.17, 24.94
		distLat := el.Lat - 60.17
		distLon := el.Lon - 24.94
		dist := distLat*distLat + distLon*distLon

		pricingZone := "Zone 3"
		hourlyRate := 2.0
		weekendRate := 0.0 // Free on weekends mostly
		if dist < 0.0005 {
			pricingZone = "Zone 1"
			hourlyRate = 4.0
			weekendRate = 2.0
		} else if dist < 0.002 {
			pricingZone = "Zone 2"
			hourlyRate = 2.0
			weekendRate = 0.0
		}

		isResidential := false
		if res, ok := el.Tags["parking:residential"]; ok && strings.ToLower(res) == "yes" {
			isResidential = true
		}
		if _, ok := el.Tags["parking:condition:residents"]; ok {
			isResidential = true
		}

		// Simulated occupancy
		capacity := 10
		if capStr, ok := el.Tags["capacity"]; ok {
			fmt.Sscanf(capStr, "%d", &capacity)
		}
		liveOccupancy := int(float64(capacity) * 0.8) // Typically 80% full

		spaces = append(spaces, ParkingSpace{
			ID:            fmt.Sprintf("osm-%d", el.Id),
			Name:          name,
			Latitude:      el.Lat,
			Longitude:     el.Lon,
			Capacity:      capacity,
			IsFree:        isFree,
			PricingInfo:   fmt.Sprintf("%s Street Parking", pricingZone),
			Source:        "osm",
			LiveOccupancy: liveOccupancy,
			PricingZone:   pricingZone,
			HourlyRate:    hourlyRate,
			WeekendRate:   weekendRate,
			IsResidential: isResidential,
		})
	}

	return spaces
}

func fetchHelsinkiParking() []ParkingSpace {
	var spaces []ParkingSpace
	client := &http.Client{Timeout: 60 * time.Second}

	// We cap features at 4000 to prevent the Helsinki server from timing out on large polygon responses
	wfsURL := "https://kartta.hel.fi/ws/geoserver/avoindata/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=avoindata:Pysakointipaikat_alue&outputFormat=application/json&srsName=EPSG:4326&maxFeatures=4000"
	
	resp, err := client.Get(wfsURL)
	if err != nil {
		fmt.Println("Helsinki WFS Fetch Error:", err)
		return spaces
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Println("Helsinki WFS Non-OK Status:", resp.StatusCode)
		return spaces
	}

	var fc GeoJSONFeatureCollection
	if err := json.NewDecoder(resp.Body).Decode(&fc); err != nil {
		fmt.Println("Helsinki WFS Decode Error:", err)
		return spaces
	}

	for _, feature := range fc.Features {
		// Filter out No Parking zones
		if tyyppi, ok := feature.Properties["tyyppi"].(string); ok {
			if strings.Contains(strings.ToLower(tyyppi), "kielto") {
				continue
			}
		}

		// Extract a single point from the geometry (first coordinate found)
		var lat, lng float64
		foundCoords := false

		// Naive coordinate extraction: just find the first [lng, lat] pair in the deeply nested slice
		var extractFirstCoord func(coords []interface{}) bool
		extractFirstCoord = func(coords []interface{}) bool {
			if len(coords) == 2 {
				if l1, ok1 := coords[0].(float64); ok1 {
					if l2, ok2 := coords[1].(float64); ok2 {
						lng = l1
						lat = l2
						return true
					}
				}
			}
			for _, c := range coords {
				if childSlice, ok := c.([]interface{}); ok {
					if extractFirstCoord(childSlice) {
						return true
					}
				}
			}
			return false
		}

		if extractFirstCoord(feature.Geometry.Coordinates) {
			foundCoords = true
		}

		if !foundCoords {
			continue
		}

		// Determine Name / Type
		name := "Helsinki City Parking"
		if tyyppi, ok := feature.Properties["tyyppi"].(string); ok && tyyppi != "" {
			if tyyppi == "Pysäköintikielto" {
				continue // Skip "No Parking" zones
			}
			name = tyyppi
		}

		luokkaNimi := ""
		if ln, ok := feature.Properties["luokka_nimi"].(string); ok {
			luokkaNimi = ln
			if name == "Helsinki City Parking" && ln != "" {
				name = ln
			}
		}

		capacity := 0
		if capVal, ok := feature.Properties["paikat_des"].(float64); ok {
			capacity = int(capVal)
		} else if capVal, ok := feature.Properties["paikat_ala"].(float64); ok {
			capacity = int(capVal)
		}
		
		isFree := true
		if strings.Contains(strings.ToLower(name), "maksullinen") || strings.Contains(strings.ToLower(name), "kertamaksu") {
			isFree = false
		}

		pricingZone := "Zone 2"
		hourlyRate := 2.0
		weekendRate := 0.0
		isResidential := false
		
		// 1. Check explicitly for Resident Permit Identifier field in the API
		if asukas, ok := feature.Properties["asukaspysakointitunnus"].(string); ok && asukas != "" {
			isResidential = true
			pricingZone = "Resident Zone " + asukas
			name = "Resident Permit Parking (" + asukas + ")"
		} else if strings.Contains(strings.ToLower(luokkaNimi), "asukas") || strings.Contains(strings.ToLower(luokkaNimi), "tunnus") {
			// 2. Fallback checking the luokka_nimi
			isResidential = true
			pricingZone = "Resident Zone"
			name = "Resident Permit Zone"
		}

		liveOccupancy := int(float64(capacity) * 0.6)

		spaces = append(spaces, ParkingSpace{
			ID:            fmt.Sprintf("helsinki-%s", feature.ID),
			Name:          name,
			Latitude:      lat,
			Longitude:     lng,
			Capacity:      capacity,
			IsFree:        isFree,
			PricingInfo:   pricingZone + " Parking",
			Source:        "helsinki",
			LiveOccupancy: liveOccupancy,
			PricingZone:   pricingZone,
			HourlyRate:    hourlyRate,
			WeekendRate:   weekendRate,
			IsResidential: isResidential,
		})
	}

	return spaces
}

func fetchP2PParkingSpots() []ParkingSpace {
	var spaces []ParkingSpace
	rows, err := database.DB.Query(`
		SELECT id, name, latitude, longitude, capacity, hourly_rate, weekend_rate 
		FROM p2p_parking_spots 
		WHERE status = 'approved' AND is_active = true
	`)
	if err != nil {
		fmt.Printf("Error fetching P2P spots: %v\n", err)
		return spaces
	}
	defer rows.Close()

	for rows.Next() {
		var p ParkingSpace
		err := rows.Scan(&p.ID, &p.Name, &p.Latitude, &p.Longitude, &p.Capacity, &p.HourlyRate, &p.WeekendRate)
		if err != nil {
			continue
		}
		p.IsFree = false
		p.PricingInfo = "Private Host"
		p.Source = "p2p"
		p.PricingZone = "Private"
		p.IsResidential = false
		// Prefix ID so frontend knows it's p2p
		p.ID = "p2p-" + p.ID
		spaces = append(spaces, p)
	}
	return spaces
}

type CreateP2PRequest struct {
	Name        string  `json:"name"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	Capacity    int     `json:"capacity"`
	HourlyRate  float64 `json:"hourly_rate"`
	WeekendRate float64 `json:"weekend_rate"`
}

func CreateP2PParkingSpot(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value("userID").(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req CreateP2PRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	// Security: Require phone verification
	var isPhoneVerified bool
	var isEmailVerified bool
	err := database.DB.QueryRow(`SELECT is_phone_verified, is_email_verified FROM public.profiles WHERE id = $1`, userID).Scan(&isPhoneVerified, &isEmailVerified)
	if err != nil || (!isPhoneVerified && !isEmailVerified) {
		http.Error(w, "You must verify your phone number or email before listing a spot.", http.StatusForbidden)
		return
	}

	// Status defaults to 'pending' from the database schema
	_, err = database.DB.Exec(`
		INSERT INTO p2p_parking_spots (host_id, name, latitude, longitude, capacity, hourly_rate, weekend_rate, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, true)
	`, userID, req.Name, req.Latitude, req.Longitude, req.Capacity, req.HourlyRate, req.WeekendRate)

	if err != nil {
		fmt.Printf("Error creating P2P spot: %v\n", err)
		http.Error(w, "Failed to create spot", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "Spot listed successfully!"})
}
