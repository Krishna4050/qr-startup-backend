package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
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
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	Capacity    int     `json:"capacity"`
	IsFree      bool    `json:"is_free"`
	PricingInfo string  `json:"pricing_info"`
	Source      string  `json:"source"`
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

		parsedSpaces = append(parsedSpaces, ParkingSpace{
			ID:          fmt.Sprintf("fintraffic-%d", f.ID),
			Name:        name,
			Latitude:    lat,
			Longitude:   lng,
			Capacity:    f.BuiltCapacity.Car,
			IsFree:      isFree,
			PricingInfo: f.PricingMethod,
			Source:      "fintraffic",
		})
	}

	// Fetch OSM Street Parking (Fallback to empty list on error to prevent blocking)
	osmSpaces := fetchOSMParking()
	parsedSpaces = append(parsedSpaces, osmSpaces...)

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
	// We use an area query for Finland (approx), and limit to 1000 nodes to prevent huge payloads
	query := `[out:json][timeout:10];
area["name"="Suomi"]->.searchArea;
node["amenity"="parking"]["parking"="street_side"](area.searchArea);
out 1000;`

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
			name = "Street Parking"
		}
		
		isFree := true
		if fee, ok := el.Tags["fee"]; ok && strings.ToLower(fee) == "yes" {
			isFree = false
		}

		spaces = append(spaces, ParkingSpace{
			ID:          fmt.Sprintf("osm-%d", el.Id),
			Name:        name,
			Latitude:    el.Lat,
			Longitude:   el.Lon,
			Capacity:    10, // Default arbitrary capacity for street parking if unknown
			IsFree:      isFree,
			PricingInfo: "Street Side Parking",
			Source:      "osm",
		})
	}

	return spaces
}
