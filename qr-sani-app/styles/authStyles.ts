import { StyleSheet } from 'react-native';

export const authStyles = StyleSheet.create({
  formContainer: {
    flex: 0.6,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30, 
    paddingHorizontal: 30,
    paddingTop: 40,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 25,
  },
  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 15,
    backgroundColor: '#F9FAFB',
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#111827',
  },
  forgotPassword: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  mainButton: {
    backgroundColor: '#0F172A',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  mainButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  footerText: {
    color: '#6B7280',
    fontSize: 14,
  },
  toggleText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: 'bold',
  },
});