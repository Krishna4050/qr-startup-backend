import React from 'react';
import { View, Platform, useWindowDimensions, StyleSheet } from 'react-native';

export default function ResponsiveWrapper({ children, bg = '#F3F4F6' }: { children: React.ReactNode, bg?: string }) {
  const { width, height } = useWindowDimensions();
  const isDesktop = width > 768;

  // On Mobile, just return the standard full-screen children
  if (Platform.OS !== 'web' || !isDesktop) {
    return <View style={{ flex: 1, backgroundColor: bg }}>{children}</View>;
  }

  // On Web Desktop, constrain the width so it looks elegant and not stretched
  return (
    <View style={[styles.webBackground, { backgroundColor: bg, minHeight: height }]}>
      <View style={styles.webContainer}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webBackground: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webContainer: {
    width: '100%',
    maxWidth: 480, // Mobile-pro width. (Increase to 1024 for a wider dashboard layout later)
    height: '100%',
    maxHeight: 900,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  }
});