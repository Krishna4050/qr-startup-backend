import React from 'react';
import MapView, { Marker, MapViewProps, MarkerProps } from 'react-native-maps';

export const Map = (props: MapViewProps) => {
  return <MapView {...props} />;
};

export const MapMarker = (props: MarkerProps) => {
  return <Marker {...props} />;
};
