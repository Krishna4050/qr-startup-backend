import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Modal, TextInput, Platform } from 'react-native';
import { Check, X, Building2, User, Mail, MessageSquare } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

export default function PricingScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [showSalesModal, setShowSalesModal] = useState(false);
  const [salesForm, setSalesForm] = useState({ name: '', email: '', company: '', message: '' });

  const features = [
    { name: 'Smart QR Tags', free: 'Up to 3', premium: 'Unlimited', enterprise: 'Unlimited' },
    { name: 'Privacy First Contact', free: true, premium: true, enterprise: true },
    { name: 'Global Reach', free: true, premium: true, enterprise: true },
    { name: 'Custom Tag Designs', free: false, premium: true, enterprise: true },
    { name: 'Priority Support', free: false, premium: true, enterprise: true },
    { name: 'API Access', free: false, premium: false, enterprise: true },
    { name: 'Dedicated Account Manager', free: false, premium: false, enterprise: true },
    { name: 'White-labeling', free: false, premium: false, enterprise: true },
  ];

  const handleContactSales = () => {
    // In a real app, this would send an API request
    alert('Thank you! Our sales team will contact you shortly.');
    setShowSalesModal(false);
    setSalesForm({ name: '', email: '', company: '', message: '' });
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Simple, transparent pricing</Text>
          <Text style={styles.heroSubtitle}>Choose the perfect plan to protect what matters most.</Text>
        </View>

        {/* Pricing Cards */}
        <View style={[styles.cardsContainer, isMobile && styles.cardsContainerMobile]}>
          {/* Free Tier */}
          <View style={[styles.card, isMobile && styles.cardMobile]}>
            <Text style={styles.cardTier}>Free</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceValue}>0€</Text>
              <Text style={styles.pricePeriod}>/year</Text>
            </View>
            <Text style={styles.cardDesc}>Perfect for individuals starting to protect their essentials.</Text>
            
            <TouchableOpacity 
              style={styles.btnOutline} 
              onPress={() => user ? navigation.navigate('Dashboard') : navigation.navigate('Login')}
            >
              <Text style={styles.btnOutlineText}>{user ? 'Current Plan' : 'Get Started'}</Text>
            </TouchableOpacity>

            <View style={styles.featuresList}>
              <View style={styles.featureItem}><Check color="#00E5FF" size={20} /><Text style={styles.featureText}>Up to 3 QR Tags</Text></View>
              <View style={styles.featureItem}><Check color="#00E5FF" size={20} /><Text style={styles.featureText}>Privacy First Contact</Text></View>
              <View style={styles.featureItem}><Check color="#00E5FF" size={20} /><Text style={styles.featureText}>Global Reach</Text></View>
            </View>
          </View>

          {/* Premium Tier */}
          <View style={[styles.card, styles.cardPopular, isMobile && styles.cardMobile]}>
            <View style={styles.popularBadge}><Text style={styles.popularBadgeText}>MOST POPULAR</Text></View>
            <Text style={styles.cardTier}>Premium</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceValue}>5€</Text>
              <Text style={styles.pricePeriod}>/year</Text>
            </View>
            <Text style={styles.cardDesc}>For power users who want ultimate control and customization.</Text>
            
            <TouchableOpacity 
              style={styles.btnPrimary} 
              onPress={() => user ? alert('Redirecting to Stripe checkout...') : navigation.navigate('Login')}
            >
              <Text style={styles.btnPrimaryText}>Upgrade to Premium</Text>
            </TouchableOpacity>

            <View style={styles.featuresList}>
              <View style={styles.featureItem}><Check color="#0A192F" size={20} /><Text style={styles.featureTextDark}>Unlimited QR Tags</Text></View>
              <View style={styles.featureItem}><Check color="#0A192F" size={20} /><Text style={styles.featureTextDark}>Custom Tag Designs</Text></View>
              <View style={styles.featureItem}><Check color="#0A192F" size={20} /><Text style={styles.featureTextDark}>Priority Support</Text></View>
            </View>
          </View>

          {/* Enterprise Tier */}
          <View style={[styles.card, isMobile && styles.cardMobile]}>
            <Text style={styles.cardTier}>Enterprise</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceValueText}>Custom</Text>
            </View>
            <Text style={styles.cardDesc}>Advanced solutions and white-labeling for large organizations.</Text>
            
            <TouchableOpacity style={styles.btnOutline} onPress={() => setShowSalesModal(true)}>
              <Text style={styles.btnOutlineText}>Contact Sales</Text>
            </TouchableOpacity>

            <View style={styles.featuresList}>
              <View style={styles.featureItem}><Check color="#00E5FF" size={20} /><Text style={styles.featureText}>API Access</Text></View>
              <View style={styles.featureItem}><Check color="#00E5FF" size={20} /><Text style={styles.featureText}>White-labeling Options</Text></View>
              <View style={styles.featureItem}><Check color="#00E5FF" size={20} /><Text style={styles.featureText}>Dedicated Account Manager</Text></View>
            </View>
          </View>
        </View>

        {/* Feature Comparison Table */}
        <View style={styles.tableSection}>
          <Text style={styles.tableTitle}>Compare all features</Text>
          <View style={styles.tableWrapper}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, styles.tableCellFeature, styles.tableHeaderText]}>Features</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText]}>Free</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText]}>Premium</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText]}>Enterprise</Text>
            </View>
            {features.map((feature, idx) => (
              <View key={idx} style={[styles.tableRow, idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]}>
                <Text style={[styles.tableCell, styles.tableCellFeature]}>{feature.name}</Text>
                
                <View style={styles.tableCell}>
                  {typeof feature.free === 'boolean' ? (
                    feature.free ? <Check color="#10B981" size={20} /> : <X color="#94A3B8" size={20} />
                  ) : <Text style={styles.tableCellText}>{feature.free}</Text>}
                </View>

                <View style={styles.tableCell}>
                  {typeof feature.premium === 'boolean' ? (
                    feature.premium ? <Check color="#10B981" size={20} /> : <X color="#94A3B8" size={20} />
                  ) : <Text style={styles.tableCellText}>{feature.premium}</Text>}
                </View>

                <View style={styles.tableCell}>
                  {typeof feature.enterprise === 'boolean' ? (
                    feature.enterprise ? <Check color="#10B981" size={20} /> : <X color="#94A3B8" size={20} />
                  ) : <Text style={styles.tableCellText}>{feature.enterprise}</Text>}
                </View>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* Contact Sales Modal */}
      <Modal visible={showSalesModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowSalesModal(false)}>
              <X color="#64748B" size={24} />
            </TouchableOpacity>
            
            <View style={styles.modalHeader}>
              <Building2 color="#00E5FF" size={32} />
              <Text style={styles.modalTitle}>Contact Sales</Text>
              <Text style={styles.modalSubtitle}>Tell us about your needs and we'll craft a custom Enterprise plan for you.</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Name</Text>
              <View style={styles.inputWrapper}>
                <User color="#94A3B8" size={18} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="John Doe" 
                  value={salesForm.name}
                  onChangeText={(txt) => setSalesForm({...salesForm, name: txt})}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Work Email</Text>
              <View style={styles.inputWrapper}>
                <Mail color="#94A3B8" size={18} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="john@company.com" 
                  keyboardType="email-address"
                  value={salesForm.email}
                  onChangeText={(txt) => setSalesForm({...salesForm, email: txt})}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Company Name</Text>
              <View style={styles.inputWrapper}>
                <Building2 color="#94A3B8" size={18} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Acme Corp" 
                  value={salesForm.company}
                  onChangeText={(txt) => setSalesForm({...salesForm, company: txt})}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>How can we help?</Text>
              <View style={styles.inputWrapper}>
                <MessageSquare color="#94A3B8" size={18} style={[styles.inputIcon, { alignSelf: 'flex-start', marginTop: 12 }]} />
                <TextInput 
                  style={[styles.input, styles.textArea]} 
                  placeholder="Tell us about your requirements..." 
                  multiline={true}
                  numberOfLines={4}
                  value={salesForm.message}
                  onChangeText={(txt) => setSalesForm({...salesForm, message: txt})}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.btnSubmit} onPress={handleContactSales}>
              <Text style={styles.btnSubmitText}>Send Message</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB', // Bright background as requested
  },
  contentContainer: {
    paddingVertical: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 60,
    maxWidth: 800,
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: '#0A192F',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -1,
  },
  heroSubtitle: {
    fontSize: 20,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 28,
  },
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: 30,
    maxWidth: 1200,
    width: '100%',
    marginBottom: 80,
  },
  cardsContainerMobile: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...(Platform.OS === 'web' ? { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' } : { elevation: 2 }),
  },
  cardMobile: {
    width: '100%',
    maxWidth: 400,
  },
  cardPopular: {
    backgroundColor: '#00E5FF',
    borderColor: '#00E5FF',
    transform: [{ scale: 1.05 }],
    ...(Platform.OS === 'web' ? { boxShadow: '0 20px 25px -5px rgba(0, 229, 255, 0.3)' } : { elevation: 10 }),
    zIndex: 10,
  },
  popularBadge: {
    position: 'absolute',
    top: -16,
    alignSelf: 'center',
    backgroundColor: '#0A192F',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  cardTier: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0A192F',
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  priceValue: {
    fontSize: 48,
    fontWeight: '900',
    color: '#0A192F',
    letterSpacing: -2,
  },
  priceValueText: {
    fontSize: 40,
    fontWeight: '900',
    color: '#0A192F',
    letterSpacing: -1,
  },
  pricePeriod: {
    fontSize: 16,
    color: '#64748B',
    marginLeft: 4,
    fontWeight: '600',
  },
  cardDesc: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 24,
    marginBottom: 32,
    minHeight: 48,
  },
  btnOutline: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0A192F',
    alignItems: 'center',
    marginBottom: 32,
  },
  btnOutlineText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0A192F',
  },
  btnPrimary: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#0A192F',
    alignItems: 'center',
    marginBottom: 32,
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  featuresList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '500',
  },
  featureTextDark: {
    fontSize: 15,
    color: '#0A192F',
    fontWeight: '600',
  },
  
  // Table Styles
  tableSection: {
    width: '100%',
    maxWidth: 1000,
  },
  tableTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0A192F',
    textAlign: 'center',
    marginBottom: 40,
  },
  tableWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...(Platform.OS === 'web' ? { boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)' } : { elevation: 3 }),
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  tableRowEven: {
    backgroundColor: '#F8FAFC',
  },
  tableRowOdd: {
    backgroundColor: '#FFFFFF',
  },
  tableHeader: {
    backgroundColor: '#0A192F',
    borderBottomWidth: 0,
  },
  tableHeaderText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  tableCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableCellFeature: {
    flex: 2,
    alignItems: 'flex-start',
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  tableCellText: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 25, 47, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    // @ts-ignore
    backdropFilter: 'blur(4px)',
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 40,
    position: 'relative',
    ...(Platform.OS === 'web' ? { boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' } : { elevation: 20 }),
  },
  modalClose: {
    position: 'absolute',
    top: 24,
    right: 24,
    padding: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0A192F',
    marginTop: 16,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 48,
    color: '#0A192F',
    fontSize: 16,
    // @ts-ignore: web only
    outlineStyle: 'none',
  },
  textArea: {
    height: 100,
    paddingTop: 14,
    paddingBottom: 14,
  },
  btnSubmit: {
    backgroundColor: '#00E5FF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  btnSubmitText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0A192F',
  }
});
