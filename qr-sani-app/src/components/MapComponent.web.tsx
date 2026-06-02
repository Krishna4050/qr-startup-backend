import React from 'react';
// @teovilla wrapper has some TS export issues. Use require or generic view for web fallback
import { View, Text } from 'react-native';

export const Map = (props: any) => {
  return (
    <View style={[{ backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' }, props.style]}>
      <Text>Web Map Preview (Requires API Key for real map)</Text>
      {props.children}
    </View>
  );
};

export const MapMarker = (props: any) => {
  return <View style={{ position: 'absolute', top: '50%', left: '50%' }}>{props.children}</View>;
};
