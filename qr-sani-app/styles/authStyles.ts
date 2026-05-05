import { StyleSheet } from 'react-native';

export const authStyles = StyleSheet.create({
  formContainer: {
    width: '100%',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  formTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#384358', // Premium White
    marginBottom: 32,
    marginTop: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F2D4D', // Soft Tan
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Glassmorphism (slightly see-through)
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
    color: '#DED1C6', 
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#fffff', // White typing text
  },
  mainButton: {
    backgroundColor: '#F2F3F4', // Cream/White Button
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  mainButtonText: {
    color: '#0F2D4D', // Dark Navy Text inside the button
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#DED1C6',
    fontSize: 14,
  },
  toggleText: {
    color: '#F2F3F4',
    fontSize: 14,
    fontWeight: 'bold',
  },
});