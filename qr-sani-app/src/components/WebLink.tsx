import React from 'react';
import { TouchableOpacity, Platform, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import { useNavigation, useLinkTo } from '@react-navigation/native';

/**
 * WebLink — Renders a real <a> tag on web for proper browser behavior
 * (right-click "Open in New Tab", Cmd+Click, middle-click, SEO).
 * On native (iOS/Android), renders a normal TouchableOpacity.
 *
 * Usage:
 *   <WebLink screen="ShopDetails" params={{ id: shop.id }} style={styles.card}>
 *     <Text>Shop Name</Text>
 *   </WebLink>
 */

// Maps screen names to their URL paths based on the linking config in App.tsx.
// This must stay in sync with the linking config.
const SCREEN_URL_MAP: Record<string, (params?: any) => string> = {
  Dashboard: () => '/dashboard',
  Home: () => '/dashboard/Home',
  Services: () => '/dashboard/Services',
  Profile: () => '/dashboard/Profile',
  Scan: () => '/dashboard/Scan',
  VehicleRepairDirectory: (p) => `/directory${p?.location ? `?location=${p.location}` : ''}`,
  ShopDetails: (p) => `/shop/${p?.id || ''}`,
  ChatScreen: (p) => `/chat/${p?.shopId || ''}/${p?.otherUserId || ''}`,
  HostDashboard: () => '/host',
  HostShopDetails: (p) => `/host/shop/${p?.id || ''}`,
  Login: () => '/login',
  Onboarding: () => '/welcome',
  UserMessages: () => '/messages',
  HostMessages: () => '/host/messages',
  PartnerOnboardingIntro: () => '/partner/start',
  Settings: () => '/settings',
};

function getHref(screen: string, params?: any): string {
  const builder = SCREEN_URL_MAP[screen];
  if (builder) return builder(params);
  // Fallback: just use the screen name lowercased
  return `/${screen.toLowerCase()}`;
}

type WebLinkProps = {
  /** The React Navigation screen name to navigate to */
  screen: string;
  /** Navigation params (e.g. { id: 'abc' }) */
  params?: Record<string, any>;
  /** Style applied to the wrapper */
  style?: StyleProp<ViewStyle>;
  /** Children to render inside the link */
  children: React.ReactNode;
  /** activeOpacity for TouchableOpacity on native (default: 0.7) */
  activeOpacity?: number;
  /** Optional onPress callback (runs in addition to navigation) */
  onPress?: () => void;
};

export default function WebLink({ screen, params, style, children, activeOpacity = 0.7, onPress }: WebLinkProps) {
  const navigation = useNavigation<any>();

  const handleNavigate = () => {
    if (onPress) onPress();
    navigation.navigate(screen, params);
  };

  // On native platforms, use the standard TouchableOpacity
  if (Platform.OS !== 'web') {
    return (
      <TouchableOpacity style={style} activeOpacity={activeOpacity} onPress={handleNavigate}>
        {children}
      </TouchableOpacity>
    );
  }

  const href = getHref(screen, params);

  const webProps = Platform.OS === 'web' ? {
    href,
    accessibilityRole: 'link',
    // We override onClick on web to prevent full page reload on normal left clicks,
    // while letting Cmd+Click / middle-click pass through to the <a> tag natively.
    onClick: (e: any) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) {
        return; // Let browser handle it
      }
      e.preventDefault();
      handleNavigate();
    }
  } : {};

  return (
    <TouchableOpacity
      style={style}
      activeOpacity={activeOpacity}
      onPress={Platform.OS !== 'web' ? handleNavigate : undefined}
      {...webProps as any}
    >
      {children}
    </TouchableOpacity>
  );
}
