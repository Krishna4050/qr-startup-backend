import React from 'react';
import MapView, { Marker, MapViewProps, MapMarkerProps } from 'react-native-maps';

export const Map = React.forwardRef((props: MapViewProps, ref: any) => {
  return <MapView ref={ref} {...props} />;
});

export const MapMarker = (props: MapMarkerProps) => {
  return <Marker {...props} />;
};
