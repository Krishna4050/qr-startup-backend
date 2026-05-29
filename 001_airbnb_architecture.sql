-- ==============================================================================
-- AIRBNB ARCHITECTURE MIGRATION - PART 1: EXPLORE PATH (SEARCH)
-- ==============================================================================

-- 1. Enable the PostGIS extension (Free & Open Source geospatial engine)
-- This replaces the need for expensive tools like Elasticsearch
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Add geospatial columns to our shop_locations table
-- This allows us to perform lightning-fast radius searches
ALTER TABLE shop_locations ADD COLUMN IF NOT EXISTS location geography(Point, 4326);

-- 3. Create a Spatial Index
-- This is the equivalent of an Elasticsearch index, allowing us to search
-- through millions of shops in milliseconds.
CREATE INDEX IF NOT EXISTS shop_locations_geo_index 
ON shop_locations 
USING GIST (location);

-- ==============================================================================
-- AIRBNB ARCHITECTURE MIGRATION - PART 2: COMMIT PATH (BOOKING)
-- ==============================================================================

-- Create a dedicated table for reservations/bookings
-- This handles the "Soft Hold" pattern described in the Airbnb architecture
CREATE TABLE IF NOT EXISTS service_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES shop_locations(id) NOT NULL,
    guest_id UUID REFERENCES auth.users(id) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('soft_hold', 'confirmed', 'cancelled', 'completed')),
    hold_expires_at TIMESTAMPTZ, -- For 10-minute payment window holds
    booking_date DATE NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    payment_intent_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index to quickly check for double-bookings on a specific date for a specific shop
CREATE INDEX IF NOT EXISTS idx_reservations_shop_date 
ON service_reservations (shop_id, booking_date) 
WHERE status IN ('soft_hold', 'confirmed');
