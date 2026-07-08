import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Modal, Platform, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Shield } from 'lucide-react-native';

const CONSENT_KEY = '@gdpr_cookie_consent';

export default function CookieConsentModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    checkConsent();
  }, []);

  const checkConsent = async () => {
    try {
      const stored = await AsyncStorage.getItem(CONSENT_KEY);
      if (!stored) {
        setIsVisible(true);
      }
    } catch (e) {
      console.error('Failed to read consent from AsyncStorage', e);
    }
  };

  const saveConsent = async (prefs: { analytics: boolean; marketing: boolean }) => {
    try {
      await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify({
        necessary: true,
        analytics: prefs.analytics,
        marketing: prefs.marketing,
        timestamp: new Date().toISOString()
      }));
      setIsVisible(false);
    } catch (e) {
      console.error('Failed to save consent', e);
    }
  };

  const handleAcceptAll = () => {
    saveConsent({ analytics: true, marketing: true });
  };

  const handleRejectAll = () => {
    saveConsent({ analytics: false, marketing: false });
  };

  const handleSavePreferences = () => {
    saveConsent({ analytics, marketing });
  };

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <Shield color="#0F2D4D" size={28} />
              <Text style={styles.title}>Your Privacy Choices</Text>
            </View>
            
            <Text style={styles.description}>
              We and our partners use technologies, such as cookies, and gather browsing data to give you the best online experience and to personalize the content and advertising shown to you.
            </Text>

            {!showDetails ? (
              <TouchableOpacity onPress={() => setShowDetails(true)}>
                <Text style={styles.linkText}>Customize Preferences</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.detailsContainer}>
                {/* Strictly Necessary */}
                <View style={styles.toggleRow}>
                  <View style={styles.toggleTextContainer}>
                    <Text style={styles.toggleTitle}>Strictly Necessary</Text>
                    <Text style={styles.toggleDescription}>Required for the website/app to function. Cannot be disabled.</Text>
                  </View>
                  <Switch value={true} disabled trackColor={{ true: '#10B981', false: '#D1D5DB' }} />
                </View>

                {/* Analytics */}
                <View style={styles.toggleRow}>
                  <View style={styles.toggleTextContainer}>
                    <Text style={styles.toggleTitle}>Analytics & Statistics</Text>
                    <Text style={styles.toggleDescription}>Help us improve our services by collecting anonymous usage data.</Text>
                  </View>
                  <Switch 
                    value={analytics} 
                    onValueChange={setAnalytics} 
                    trackColor={{ true: '#10B981', false: '#D1D5DB' }} 
                  />
                </View>

                {/* Marketing */}
                <View style={styles.toggleRow}>
                  <View style={styles.toggleTextContainer}>
                    <Text style={styles.toggleTitle}>Marketing</Text>
                    <Text style={styles.toggleDescription}>Used to deliver personalized advertisements across different platforms.</Text>
                  </View>
                  <Switch 
                    value={marketing} 
                    onValueChange={setMarketing} 
                    trackColor={{ true: '#10B981', false: '#D1D5DB' }} 
                  />
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={handleSavePreferences}>
                  <Text style={styles.saveButtonText}>Save Preferences</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={handleRejectAll}>
                <Text style={styles.secondaryButtonText}>Reject All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleAcceptAll}>
                <Text style={styles.primaryButtonText}>Accept All</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 600,
    borderRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 12,
  },
  description: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 16,
  },
  linkText: {
    fontSize: 14,
    color: '#0A66C2',
    fontWeight: '600',
    marginBottom: 24,
    textDecorationLine: 'underline',
  },
  detailsContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  toggleTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  saveButton: {
    marginTop: 16,
    backgroundColor: '#E5E7EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#0F2D4D',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
