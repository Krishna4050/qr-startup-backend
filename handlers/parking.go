package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
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
		})
	}

	// Update cache
	parkingCache = parsedSpaces
	lastCacheTime = time.Now()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"data":   parkingCache,
	})
}
