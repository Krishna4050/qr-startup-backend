import React from 'react';
import MapView, { Marker } from '@teovilla/react-native-web-maps';

export const Map = (props: any) => {
  // We use any for props here to avoid strict typings from the web wrapper
  return <MapView {...props} />;
};

export const MapMarker = (props: any) => {
  return <Marker {...props} />;
};
