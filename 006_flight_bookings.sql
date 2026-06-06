CREATE TABLE IF NOT EXISTS flight_bookings (
    id SERIAL PRIMARY KEY,
    user_id UUID, -- References auth.users but can be null for guests
    duffel_order_id VARCHAR(255) NOT NULL UNIQUE,
    booking_reference VARCHAR(50) NOT NULL, -- The PNR (e.g. ZYXCBA)
    total_amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    tax_amount NUMERIC(10, 2),
    status VARCHAR(50) NOT NULL, -- e.g. 'created', 'cancelled'
    passenger_email VARCHAR(255) NOT NULL,
    passenger_name VARCHAR(255),
    flight_details JSONB, -- Store origin, destination, departure time to avoid extra API calls
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_flight_bookings_user_id ON flight_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_flight_bookings_email ON flight_bookings(passenger_email);
