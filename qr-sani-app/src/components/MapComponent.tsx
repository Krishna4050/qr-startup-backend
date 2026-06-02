import React from 'react';
import MapView, { Marker, MapViewProps, MapMarkerProps } from 'react-native-maps';

export const Map = (props: MapViewProps) => {
  return <MapView {...props} />;
};

export const MapMarker = (props: MapMarkerProps) => {
  return <Marker {...props} />;
};
