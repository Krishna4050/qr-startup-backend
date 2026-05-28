import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { ShieldCheck, Globe, MessageCircle, Camera, Briefcase } from 'lucide-react-native';
import WebLink from './WebLink';

export default function WebFooter() {
  if (Platform.OS !== 'web') return null;

  return (
    <View style={styles.footerContainer}>
      <View style={styles.contentWrapper}>
        <View style={styles.grid}>
          {/* Brand Column */}
          <View style={styles.column}>
            <View style={styles.brandRow}>
              <ShieldCheck color="#E11D48" size={28} />
              <Text style={styles.brandText}>smarttags</Text>
            </View>
            <Text style={styles.description}>
              Protecting your most valuable belongings with smart, community-driven QR tags.
            </Text>
            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialIcon}><Globe color="#8892B0" size={20} /></TouchableOpacity>
              <TouchableOpacity style={styles.socialIcon}><MessageCircle color="#8892B0" size={20} /></TouchableOpacity>
              <TouchableOpacity style={styles.socialIcon}><Camera color="#8892B0" size={20} /></TouchableOpacity>
              <TouchableOpacity style={styles.socialIcon}><Briefcase color="#8892B0" size={20} /></TouchableOpacity>
            </View>
          </View>

          {/* Links Columns */}
          <View style={styles.column}>
            <Text style={styles.columnHeader}>Services</Text>
            <WebLink screen="Services" style={styles.link}><Text style={styles.linkText}>Our Services</Text></WebLink>
            <WebLink screen="VehicleRepairDirectory" style={styles.link}><Text style={styles.linkText}>Vehicle Repair</Text></WebLink>
            <WebLink screen="PartnerOnboardingIntro" style={styles.link}><Text style={styles.linkText}>Partner With Us</Text></WebLink>
          </View>

          <View style={styles.column}>
            <Text style={styles.columnHeader}>Company</Text>
            <WebLink screen="Home" style={styles.link}><Text style={styles.linkText}>About Us</Text></WebLink>
            <WebLink screen="Home" style={styles.link}><Text style={styles.linkText}>Careers</Text></WebLink>
            <WebLink screen="Home" style={styles.link}><Text style={styles.linkText}>Contact</Text></WebLink>
          </View>

          <View style={styles.column}>
            <Text style={styles.columnHeader}>Legal</Text>
            <WebLink screen="Home" style={styles.link}><Text style={styles.linkText}>Privacy Policy</Text></WebLink>
            <WebLink screen="Home" style={styles.link}><Text style={styles.linkText}>Terms of Service</Text></WebLink>
            <WebLink screen="Home" style={styles.link}><Text style={styles.linkText}>Cookie Policy</Text></WebLink>
          </View>
        </View>

        <View style={styles.bottomRow}>
          <Text style={styles.copyright}>© {new Date().getFullYear()} SmartTags. All rights reserved.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footerContainer: {
    backgroundColor: '#0A192F',
    paddingTop: 64,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#172A45',
    width: '100%',
  },
  contentWrapper: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 48,
    gap: 32,
  },
  column: {
    minWidth: 150,
    flex: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
    letterSpacing: -0.5,
  },
  description: {
    color: '#8892B0',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 280,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 16,
  },
  socialIcon: {
    padding: 8,
    backgroundColor: '#112240',
    borderRadius: 8,
  },
  columnHeader: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
  },
  link: {
    marginBottom: 12,
  },
  linkText: {
    color: '#8892B0',
    fontSize: 14,
  },
  bottomRow: {
    borderTopWidth: 1,
    borderTopColor: '#172A45',
    paddingTop: 32,
    alignItems: 'center',
  },
  copyright: {
    color: '#8892B0',
    fontSize: 13,
  },
});
