import { useWindowDimensions, Platform } from 'react-native';

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  const isWeb = Platform.OS === 'web';
  const isMobileWeb = isWeb && isMobile;

  // Base width = 390 (iPhone 12/13/14). 
  // We cap scaling to 1.3x to prevent absurdly huge text on 4K monitors.
  const scale = width / 390;
  const rs = (size: number) => {
    const scaledSize = size * scale;
    // Limit max scaling to 1.3x base size, and min to 0.9x
    return Math.min(Math.max(scaledSize, size * 0.9), size * 1.3);
  };
  
  // Dynamic column counts for grids
  const numColumns = isDesktop ? 4 : isTablet ? 2 : 1;

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    isWeb,
    isMobileWeb,
    scale,
    rs,
    numColumns
  };
}
