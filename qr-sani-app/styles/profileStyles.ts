import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { padding: 24, paddingTop: 60, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#F3F4F6' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  subTitle: { fontSize: 14, color: '#6B7280' },
  form: { padding: 24 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#9CA3AF', marginTop: 16, marginBottom: 12, letterSpacing: 1 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 16 },
  footer: { padding: 24, backgroundColor: '#FFFFFF' },
  saveBtn: { backgroundColor: '#4F46E5', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  skipBtn: { paddingVertical: 12, alignItems: 'center' },
  skipBtnText: { color: '#4B5563', fontSize: 16, fontWeight: '600' }
});