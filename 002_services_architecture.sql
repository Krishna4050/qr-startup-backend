-- 002_services_architecture.sql
-- Run this in your Supabase SQL Editor to create tables and seed data for the new services!

-- 1. Create a unified generic table for new services to easily manage them
CREATE TABLE IF NOT EXISTS public.global_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type VARCHAR(50) NOT NULL, -- 'bike', 'parking', 'hotel', 'transit', 'train', 'flight'
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) DEFAULT 'Finland',
    price_indicator VARCHAR(50),
    rating DECIMAL(3,2) DEFAULT 4.5,
    photos JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb, -- Store specific details (e.g., flight times, hotel amenities)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast searching by type and city
CREATE INDEX idx_global_services_type_city ON public.global_services(service_type, city);

-- 2. Seed Data
-- Bike Repair
INSERT INTO public.global_services (service_type, title, subtitle, city, price_indicator, rating, photos, metadata) VALUES
('bike', 'Helsinki City Bikes', 'Quick tune-ups and fixes', 'Helsinki', '€15 - €50', 4.8, '["https://images.unsplash.com/photo-1511994298241-608e28f14fde"]', '{"amenities": ["Fast repair", "Electric bikes"]}'),
('bike', 'Espoo Wheelies', 'Full service bike mechanics', 'Espoo', '€20 - €80', 4.6, '["https://images.unsplash.com/photo-1532298229144-0ec0c57515c7"]', '{"amenities": ["Tire change", "Brakes"]}');

-- Pay Parking
INSERT INTO public.global_services (service_type, title, subtitle, city, price_indicator, rating, photos, metadata) VALUES
('parking', 'Kamppi Underground', 'Secure 24/7 parking', 'Helsinki', '€4/hr', 4.3, '["https://images.unsplash.com/photo-1573348722427-f1d6819fdf98"]', '{"spots": 200, "ev_charging": true}'),
('parking', 'Tampere Central Park', 'Open air city parking', 'Tampere', '€2/hr', 4.0, '["https://images.unsplash.com/photo-1506521781263-d8422e82f27a"]', '{"spots": 50, "ev_charging": false}');

-- Hotels & Stays
INSERT INTO public.global_services (service_type, title, subtitle, city, price_indicator, rating, photos, metadata) VALUES
('hotel', 'Clarion Hotel Helsinki', 'Modern skyline views', 'Helsinki', '€150/night', 4.9, '["https://images.unsplash.com/photo-1551882547-ff40c0d5b9af"]', '{"amenities": ["Pool", "Gym", "Breakfast"]}'),
('hotel', 'Radisson Blu', 'Luxury in the city center', 'Espoo', '€120/night', 4.7, '["https://images.unsplash.com/photo-1566073771259-6a8506099945"]', '{"amenities": ["Spa", "Free WiFi"]}');

-- Transit
INSERT INTO public.global_services (service_type, title, subtitle, city, price_indicator, rating, photos, metadata) VALUES
('transit', 'HSL Metro', 'Fast city connections', 'Helsinki', '€3.10', 4.5, '["https://images.unsplash.com/photo-1515162816999-a0c47dc192f7"]', '{"routes": ["M1", "M2"]}');

-- Trains
INSERT INTO public.global_services (service_type, title, subtitle, city, price_indicator, rating, photos, metadata) VALUES
('train', 'VR InterCity', 'Helsinki to Tampere', 'Helsinki', '€25', 4.6, '["https://images.unsplash.com/photo-1474487548417-781cb71495f3"]', '{"duration": "1h 30m"}');

-- Flights
INSERT INTO public.global_services (service_type, title, subtitle, city, price_indicator, rating, photos, metadata) VALUES
('flight', 'Finnair AY123', 'Helsinki to London', 'Helsinki', '€180', 4.8, '["https://images.unsplash.com/photo-1436491865332-7a61a109cc05"]', '{"duration": "3h 10m"}');
