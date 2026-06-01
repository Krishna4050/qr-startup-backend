import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import WebHeader from './WebHeader';
import WebFooter from './WebFooter';

type WebLayoutProps = {
  children: React.ReactNode;
  defaultService?: string;
};

export default function WebLayout({ children, defaultService = 'Vehicle Repair' }: WebLayoutProps) {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <WebHeader defaultService={defaultService} />
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: Platform.OS === 'web' ? '100dvh' as any : '100%', // Use 100dvh to fix mobile browser address bar height issues
    display: 'flex',
    flexDirection: 'column',
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  }
});
