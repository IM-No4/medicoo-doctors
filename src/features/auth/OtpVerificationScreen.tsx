import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, ChevronLeft, Lock, Plus } from 'lucide-react-native';
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
import { useDispatch } from 'react-redux';

import { bootSuccess } from '../../bootstrap/boot.slice';
import StatusModal, { StatusType } from '../../components/modals/StatusModal';
import { useLanguage } from '../../i18n/LanguageContext';
import { loginSuccess } from '../../redux/slices/authSlice';
import { sendOtp, verifyOtp } from '../../services/api/auth.api';
import { useTheme } from '../../theme/ThemeContext';
import { getDeviceId, getFCMToken } from '../../utils/deviceUtils';
import { setToken } from '../../utils/tokenManagement';

const HERO_IMAGE = require('../../assets/images/hero-image.jpg');
const MEDICOO_EMBLEM = require('../../assets/images/medicoo-emblem.png');

type RouteParams = {
  params: {
    phone?: string;
  };
};

export default function OtpVerificationScreen() {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'params'>>();
  const { width: winW, height: winH } = useWindowDimensions();

  const { theme, isDark } = useTheme();
  const { t } = useLanguage();

  const { phone } = route.params || {};

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputs = useRef<Array<TextInput | null>>([]);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const translateY = useRef(new Animated.Value(0)).current;

  const [statusModal, setStatusModal] = useState<{
    visible: boolean;
    status: StatusType;
    title: string;
    message: string;
  }>({
    visible: false,
    status: 'idle',
    title: '',
    message: '',
  });

  const cardHeight = Math.max(winH * 0.54, 440) + insets.bottom;

  useEffect(() => {
    if (timeLeft === 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

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

  const handleVerifyOtp = async () => {
    Keyboard.dismiss();
    const otpString = otp.join('');
    if (otpString.length !== 6 || loading) return;

    setLoading(true);
    try {
      const fcmToken = await getFCMToken();
      const deviceId = await getDeviceId();
      const res = await verifyOtp(phone!, otpString, fcmToken ?? undefined, deviceId);

      if (res?.access_token) {
        await setToken('access_token', res.access_token);
        dispatch(loginSuccess({ token: res.access_token, onboardingComplete: true, mobile: phone }));
        dispatch(bootSuccess({ isAuthenticated: true, onboardingCompleted: true }));
      }
    } catch (error: any) {
      if (error?.response?.status === 400) {
        setStatusModal({
          visible: true,
          status: 'error',
          title: 'OTP Expired',
          message: 'The OTP has expired. Please request a new one.',
        });
      } else {
        setStatusModal({
          visible: true,
          status: 'error',
          title: 'Error',
          message: 'Failed to verify OTP. Please try again.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleResendOtp = async () => {
    Keyboard.dismiss();
    setLoading(true);
    try {
      await sendOtp(phone!);
      setStatusModal({
        visible: true,
        status: 'success',
        title: 'OTP Sent',
        message: 'A new OTP has been sent to your mobile number.',
      });
      setOtp(['', '', '', '', '', '']);
      setTimeLeft(30);
      inputs.current[0]?.focus();
    } catch (error) {
      setStatusModal({
        visible: true,
        status: 'error',
        title: 'Error',
        message: 'Failed to send OTP. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const isComplete = otp.join('').length === 6;

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

      {/* Layer 1: Background Image with Gradient Overlay */}
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

      {/* Layer 2: Medicoo Brand Logo */}
      <View style={[styles.logoRow, { top: insets.top + 16 }]}>
        <View style={styles.logoBadge}>
          <Image
            source={MEDICOO_EMBLEM}
            style={styles.logoEmblem}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.logoText}>medicoo</Text>
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
          {/* Header Box */}
          <View style={styles.headerBox}>
            <View style={styles.headerRow}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={[styles.backButton, { backgroundColor: inputBg, borderColor: inputBorder }]}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ChevronLeft size={20} color={textColor} />
              </TouchableOpacity>

              <View style={styles.headerTextGroup}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.headerTitle, { color: textColor }]} numberOfLines={1}>
                    {t('verification_code_title')}
                  </Text>
                </View>
                <View style={styles.destinationRow}>
                  <Text style={[styles.headerSubtitle, { color: subTextColor }]}>
                    {t('code_sent_to')} {phone}
                  </Text>
                  <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
                    <Text style={styles.editLink}>
                      {t('edit')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* OTP Input Boxes */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputs.current[index] = ref;
                }}
                style={[
                  styles.otpBox,
                  {
                    backgroundColor: inputBg,
                    borderColor: inputBorder,
                    color: textColor,
                  },
                  digit
                    ? {
                        borderColor: '#0FBBA1',
                        backgroundColor: isDark ? '#062420' : '#E6FAF6',
                      }
                    : null,
                ]}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(value) => handleOtpChange(value, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                autoFocus={index === 0}
                returnKeyType={index === 5 ? 'done' : 'next'}
                onSubmitEditing={index === 5 ? handleVerifyOtp : undefined}
              />
            ))}
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              (!isComplete || loading) && styles.disabledButton,
            ]}
            onPress={handleVerifyOtp}
            disabled={!isComplete || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.continueButtonText}>{t('verify_continue')}</Text>
                <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} />
              </>
            )}
          </TouchableOpacity>

          {/* Resend Code */}
          <View style={styles.resendContainer}>
            <Text style={[styles.resendText, { color: subTextColor }]}>
              {t('didnt_receive_code')}{' '}
            </Text>
            <TouchableOpacity
              onPress={handleResendOtp}
              disabled={loading || timeLeft > 0}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.resendLink,
                  timeLeft > 0 && { color: subTextColor },
                ]}
              >
                {timeLeft > 0 ? `${t('resend_in')} ${timeLeft}s` : t('resend_otp')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Security Footnote */}
          <View style={styles.securityRow}>
            <Lock size={12} color={subTextColor} />
            <Text style={[styles.securityText, { color: subTextColor }]}>
              {t('security_notice')}
            </Text>
          </View>
        </ScrollView>
      </Animated.View>

      <StatusModal
        visible={statusModal.visible}
        status={statusModal.status}
        title={statusModal.title}
        message={statusModal.message}
        onClose={() => setStatusModal((prev) => ({ ...prev, visible: false }))}
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
  logoRow: {
    position: 'absolute',
    left: 24,
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
    gap: 18,
  },
  headerBox: {
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  headerTextGroup: {
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionAccentBar: {
    width: 3.5,
    height: 20,
    borderRadius: 2,
    backgroundColor: '#0FBBA1',
    marginRight: 9,
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  headerSubtitle: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  editLink: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0FBBA1',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 52,
    borderWidth: 1.5,
    borderRadius: 14,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
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
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendText: {
    fontSize: 13,
    fontWeight: '500',
  },
  resendLink: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0FBBA1',
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
