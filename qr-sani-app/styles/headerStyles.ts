import { StyleSheet } from 'react-native';

export const headerStyles = StyleSheet.create({
  headerContainer: {
    flex: 0.45, 
    paddingHorizontal: 30,
    justifyContent: 'center',
    paddingTop: 40,
  },
  iconContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 24,
  },
});