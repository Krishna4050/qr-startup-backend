import React, { useState, useCallback } from 'react';
import { ScrollView, RefreshControl, ScrollViewProps } from 'react-native';

// We define the custom props our component will accept
interface RefreshableScrollProps extends ScrollViewProps {
  onRefreshAction: () => Promise<void>; // The function to run when the user pulls down
  children: React.ReactNode;            // The actual content of the screen
}

export default function RefreshableScroll({ onRefreshAction, children, ...props }: RefreshableScrollProps) {
  const [refreshing, setRefreshing] = useState(false);

  // This handles the animation timing while your data fetches
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefreshAction(); // Runs whatever fetch function you pass into it
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setRefreshing(false); // Turns off the spinner when done
    }
  }, [onRefreshAction]);

  return (
    <ScrollView
      {...props} // Passes down any styles or settings (like hiding scrollbars)
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#0F2D4D" // iOS Spinner Color (matches your dark navy theme)
          colors={['#0F2D4D']} // Android Spinner Color
        />
      }
    >
      {children}
    </ScrollView>
  );
}