import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, ChevronDown, Globe, Lock, Plus } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  ImageBackground,
  Keyboard,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CountryPickerModal from '../../components/modals/CountryPickerModal';
import LanguagePickerModal from '../../components/modals/LanguagePickerModal';
import { COUNTRIES, Country, DEFAULT_COUNTRY } from '../../constants/countries';
import { useLanguage } from '../../i18n/LanguageContext';
import { sendOtp } from '../../services/api/auth.api';
import { useTheme } from '../../theme/ThemeContext';

const HERO_IMAGE = require('../../assets/images/hero-image.jpg');
const MEDICOO_EMBLEM = require('../../assets/images/medicoo-emblem.png');

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { width: winW, height: winH } = useWindowDimensions();

  const { theme, isDark } = useTheme();
  const { t, currentLanguageInfo } = useLanguage();

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  const translateY = useRef(new Animated.Value(0)).current;
  const cardHeight = Math.max(winH * 0.64, 520) + insets.bottom;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = () => {
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    };

    const onHide = () => {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [translateY]);

  const minLength = selectedCountry.maxLength ? selectedCountry.maxLength - 2 : 7;
  const canContinue = phone.length >= minLength;

  const handleContinue = async () => {
    Keyboard.dismiss();
    if (!canContinue || loading) return;
    setLoading(true);
    try {
      const cleanPhone = phone.trim();
      await sendOtp(cleanPhone);
      navigation.navigate('OtpVerification', { phone: cleanPhone });
    } finally {
      setLoading(false);
    }
  };

  const sheetBg = isDark ? '#080E17' : '#EFF2F6';
  const cardBg = isDark ? '#111B27' : '#FFFFFF';
  const cardBorder = isDark ? '#1A2737' : '#FFFFFF';
  const textColor = isDark ? '#E2E8F0' : '#0F172A';
  const subTextColor = isDark ? '#94A3B8' : '#64748B';
  const inputBg = isDark ? '#0D1520' : '#F1F5F9';
  const inputBorder = isDark ? '#1E2D3D' : '#E2E8F0';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Layer 1: Background image with rich emerald gradient overlay */}
      <ImageBackground
        source={HERO_IMAGE}
        style={{ position: 'absolute', top: 0, left: 0, width: winW, height: winH }}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(11, 61, 54, 0.65)', 'rgba(15, 84, 75, 0.2)', 'rgba(11, 61, 54, 0.7)']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFillObject}
        />
      </ImageBackground>

      {/* Layer 2: Top Floating Brand Bar + Language Selector */}
      <View style={[styles.topBar, { top: insets.top + 14 }]}>
        <View style={styles.logoRow}>
          <View style={styles.logoBadge}>
            <Image
              source={MEDICOO_EMBLEM}
              style={styles.logoEmblem}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.logoText}>medicoo</Text>
        </View>

        <TouchableOpacity
          onPress={() => setLanguageModalVisible(true)}
          style={styles.languageTopBtn}
          activeOpacity={0.8}
        >
          <Globe size={16} color="#FFFFFF" />
          <Text style={styles.languageTopText}>
            {currentLanguageInfo.nativeInitial || currentLanguageInfo.code.toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Layer 3: Bottom White Card Sheet */}
      <Animated.View
        style={[
          styles.cardWrapper,
          {
            height: cardHeight,
            backgroundColor: cardBg,
            borderColor: cardBorder,
            transform: [{ translateY }],
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header with Accent Bar */}
          <View style={styles.headerBox}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.headerTitle, { color: textColor }]}>
                {t('welcome_title')}
              </Text>
            </View>
            <Text style={[styles.headerSubtitle, { color: subTextColor }]}>
              {t('welcome_subtitle')}
            </Text>
          </View>

          {/* Mobile Phone Input Row */}
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={[
                styles.countrySelector,
                {
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                },
              ]}
              onPress={() => setCountryModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.flag}>{selectedCountry.flag}</Text>
              <Text style={[styles.countryCode, { color: textColor }]}>
                {selectedCountry.dialCode}
              </Text>
              <ChevronDown size={14} color={subTextColor} />
            </TouchableOpacity>

            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                  color: textColor,
                },
              ]}
              placeholder={t('mobile_placeholder')}
              placeholderTextColor={subTextColor}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              maxLength={selectedCountry.maxLength || 12}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              (!canContinue || loading) && styles.disabledButton,
            ]}
            onPress={handleContinue}
            disabled={!canContinue || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.continueButtonText}>{t('continue')}</Text>
                <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} />
              </>
            )}
          </TouchableOpacity>

          {/* Security Footer */}
          <View style={styles.securityRow}>
            <Lock size={12} color={subTextColor} />
            <Text style={[styles.securityText, { color: subTextColor }]}>
              {t('security_notice')}
            </Text>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Country Picker Modal */}
      <CountryPickerModal
        visible={countryModalVisible}
        selectedCountry={selectedCountry}
        onSelect={setSelectedCountry}
        onClose={() => setCountryModalVisible(false)}
      />

      {/* Language Picker Modal */}
      <LanguagePickerModal
        visible={languageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B3D36',
    overflow: 'hidden',
  },
  topBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
  },
  logoEmblem: {
    width: '100%',
    height: '100%',
  },
  logoText: {
    fontFamily: 'MuseoModerno_700Bold',
    fontSize: 27,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  languageTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  languageTopText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  cardWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 26,
    gap: 16,
  },
  headerBox: {
    marginBottom: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionAccentBar: {
    width: 3.5,
    height: 22,
    borderRadius: 2,
    backgroundColor: '#0FBBA1',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13.5,
    marginTop: 5,
    lineHeight: 19,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 52,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  flag: {
    fontSize: 18,
  },
  countryCode: {
    fontSize: 15,
    fontWeight: '700',
    marginRight: 2,
  },
  textInput: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '600',
  },
  continueButton: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 14,
    height: 52,
    backgroundColor: '#0FBBA1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.55,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  line: {
    flex: 1,
    height: 1,
  },
  orText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleButtonText: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 4,
  },
  securityText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
});
