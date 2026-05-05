import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  headerGradient: { paddingTop: 80, paddingBottom: 40, paddingHorizontal: 24, alignItems: 'center' },
  iconWrapper: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 16, borderRadius: 20, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', marginBottom: 12 },
  subTitle: { fontSize: 16, color: '#E0E7FF', textAlign: 'center', lineHeight: 24 },
  featuresContainer: { padding: 24, paddingTop: 32 },
  howItWorks: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 24 },
  featureRow: { flexDirection: 'row', marginBottom: 24, alignItems: 'center' },
  featureIconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  featureTextContainer: { flex: 1 },
  featureTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  featureDesc: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  footer: { padding: 24, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: '#F3F4F6' },
  nextBtn: { backgroundColor: '#111827', paddingVertical: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  nextBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginRight: 8 }
});