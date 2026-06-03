import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { renderToString } from 'react-dom/server';

// Inject CSS dynamically so we don't have to mess with Expo webpack config
const injectLeafletCSS = () => {
  if (typeof document !== 'undefined' && !document.getElementById('leaflet-css')) {
    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    
    // Inject a small style fix for our custom markers
    const style = document.createElement('style');
    style.innerHTML = `
      .custom-leaflet-marker { background: transparent; border: none; }
    `;
    document.head.appendChild(style);
  }
};

const MapEventsHandler = ({ onRegionChangeComplete }: { onRegionChangeComplete?: Function }) => {
  useMapEvents({
    moveend: (e) => {
      if (!onRegionChangeComplete) return;
      const map = e.target;
      const center = map.getCenter();
      const zoom = map.getZoom();
      const lngDelta = 360 / Math.pow(2, zoom);
      const latDelta = lngDelta * Math.cos(center.lat * Math.PI / 180);
      onRegionChangeComplete({
        latitude: center.lat,
        longitude: center.lng,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta
      });
    }
  });
  return null;
};

export const Map = React.forwardRef((props: any, ref: any) => {
  useEffect(() => {
    injectLeafletCSS();
  }, []);

  const center = props.initialRegion 
    ? [props.initialRegion.latitude, props.initialRegion.longitude] 
    : [60.1699, 24.9384];

  // We use CartoDB Positron for a beautiful, minimalist, light map (Apple Maps aesthetic)
  return (
    <View style={props.style || styles.mapContainer}>
      <MapContainer 
        center={center as any} 
        zoom={13} 
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        zoomControl={false}
        ref={(map) => {
          if (map) {
            if (ref) {
              if (typeof ref === 'function') ref(map);
              else {
                ref.current = map;
                // Emulate React Native Maps animateToRegion
                ref.current.animateToRegion = (region: any) => {
                  const zoom = region.longitudeDelta ? Math.round(Math.log2(360 / region.longitudeDelta)) : 14;
                  map.flyTo([region.latitude, region.longitude], zoom, { duration: 1 });
                };
              }
            }
          }
        }}
      >
        <MapEventsHandler onRegionChangeComplete={props.onRegionChangeComplete} />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        {props.children}
      </MapContainer>
    </View>
  );
});

export const MapMarker = (props: any) => {
  if (!props.coordinate) return null;
  
  const position = [props.coordinate.latitude, props.coordinate.longitude];
  
  // Render the RNW children into a static HTML string for Leaflet's divIcon
  // We MUST set pointerEvents: 'none' here so the inner HTML doesn't swallow clicks before they reach Leaflet's event handler
  const htmlStr = renderToString(
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
      {props.children}
    </div>
  );

  const customIcon = L.divIcon({
    html: htmlStr,
    className: 'custom-leaflet-marker',
    iconSize: [60, 30],
    iconAnchor: [30, 15]
  });

  return (
    <Marker 
      position={position as any} 
      icon={customIcon}
      eventHandlers={{
        click: () => {
          if (props.onPress) props.onPress();
        }
      }}
    />
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    width: '100%',
    height: '100%'
  }
});
