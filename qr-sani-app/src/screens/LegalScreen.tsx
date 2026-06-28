import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, useWindowDimensions, Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import RenderHtml from 'react-native-render-html';
import WebFooter from '../components/WebFooter';

export default function LegalScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Default to terms if not provided
  const docType = route.params?.type || 'terms';

  const titles: Record<string, string> = {
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    cookies: 'Cookie Policy'
  };

  useEffect(() => {
    fetchDocument(docType);
  }, [docType]);

  const fetchDocument = async (type: string) => {
    setIsLoading(true);
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8080';
      const res = await fetch(`${backendUrl}/api/legal-documents?type=${type}`);
      if (res.ok) {
        const data = await res.json();
        setContent(data.content || '<p>Document not available yet.</p>');
      } else {
        setContent('<p>Error loading document.</p>');
      }
    } catch (e) {
      setContent('<p>Network error while loading document.</p>');
    } finally {
      setIsLoading(false);
    }
  };

  const isWeb = Platform.OS === 'web';
  const containerStyle = isWeb && width > 768 ? styles.webContainer : styles.mobileContainer;

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft color="#0F2D4D" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{titles[docType] || 'Legal Document'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={containerStyle}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#0F2D4D" style={{ marginTop: 50 }} />
          ) : (
            <RenderHtml
              contentWidth={width > 800 ? 800 : width - 40}
              source={{ html: content }}
              baseStyle={{ color: '#334155', fontSize: 16, lineHeight: 24 }}
            />
          )}
        </View>
        <WebFooter />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F2D4D',
  },
  scrollContent: {
    flexGrow: 1,
  },
  mobileContainer: {
    padding: 20,
  },
  webContainer: {
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
    padding: 40,
    backgroundColor: '#FFFFFF',
    marginTop: 40,
    marginBottom: 40,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  }
});
