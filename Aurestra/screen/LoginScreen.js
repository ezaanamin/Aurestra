// LoginScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { verifyOtp, registerDeviceToken, loginWithGoogle } from '../API/slice/API';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Modal } from 'react-native';
import CustomAlert from '../components/CustomAlert';
import { useSettings } from '../context/SettingsContext';

const LoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { colors, isDarkMode } = useSettings();
  const { authStatus, authError, token } = useSelector((state) => state.API);

  const [email, setEmail] = useState('');
  const [otpVisible, setOtpVisible] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [timer, setTimer] = useState(300);
  const [fadeAnim] = useState(new Animated.Value(0));

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });

  const showAlert = (type, title, message) => {
    setAlertConfig({ visible: true, type, title, message });
  };

  const hideAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  React.useEffect(() => {
    let interval;
    if (otpVisible && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (!otpVisible) {
      setTimer(300);
      setOtp('');
    }
    return () => clearInterval(interval);
  }, [otpVisible, timer]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  React.useEffect(() => {
    if (token && authStatus !== 'failed' && authStatus !== 'loading') {
      registerTokenIfAvailable();
      navigation.replace('MainTabs');
    }
  }, [token, authStatus, navigation]);

  const registerTokenIfAvailable = async () => {
    try {
      const pToken = await AsyncStorage.getItem('pushToken');
      if (pToken) {
        dispatch(registerDeviceToken(pToken));
      }
    } catch (e) {
      console.error('Login register token fail:', e);
    }
  };

  React.useEffect(() => {
    if (authStatus === 'otp_sent') {
      setOtpVisible(true);
    }
    if (authStatus === 'failed' && authError) {
      showAlert('error', 'Authentication Failed', authError);
    }
  }, [authStatus, authError]);

  const handleVerifyOtp = () => {
    if (!otp || otp.length < 6) {
      setOtpError('Enter a valid 6-digit OTP');
      return;
    }
    dispatch(verifyOtp({ email, otp }));
  };

  const handleResendOtp = () => {
    setOtpVisible(false);
    showAlert('info', 'Code Expired', 'Please sign in with Google again to receive a new code.');
    setTimer(300);
    setOtp('');
    setOtpError('');
  };

  const handleGoogleLogin = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      console.log('Google User Info:', userInfo);

      const { idToken, serverAuthCode } = userInfo.data || userInfo;

      if (idToken) {
        const result = await dispatch(loginWithGoogle({ idToken, serverAuthCode })).unwrap();
        if (result.email) {
          setEmail(result.email);
        }
      } else {
        showAlert('error', 'Login Failed', 'No ID Token received from Google');
      }
    } catch (error) {
      console.log('Google Sign-In Error:', error);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // operation in progress
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        showAlert('error', 'Error', 'Google Play Services not available');
      } else {
        const errorMessage = typeof error === 'string' ? error : (error.message || 'Unknown error');
        showAlert('error', 'Login Failed', errorMessage);
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Financial Background Pattern */}
          <View style={styles.backgroundPattern}>
            <LinearGradient
              colors={isDarkMode
                ? ['#0A0E27', '#1A1F3A', '#0A0E27']
                : ['#F0F4FF', '#FFFFFF', '#F0F4FF']
              }
              style={StyleSheet.absoluteFillObject}
            />

            {/* Subtle Grid Pattern */}
            <View style={styles.gridOverlay}>
              {[...Array(8)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.gridLine,
                    {
                      opacity: isDarkMode ? 0.03 : 0.05,
                      borderColor: isDarkMode ? '#60A5FA' : '#3B82F6'
                    }
                  ]}
                />
              ))}
            </View>

            {/* Chart-like decorative elements */}
            <View style={[styles.chartDecor, styles.chartDecor1]}>
              <View style={[styles.chartBar, { height: 40, backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)' }]} />
              <View style={[styles.chartBar, { height: 60, backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)' }]} />
              <View style={[styles.chartBar, { height: 50, backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)' }]} />
            </View>
          </View>

          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            {/* Logo & Branding */}
            <View style={styles.brandSection}>
              <View style={[
                styles.logoWrapper,
                {
                  backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                  borderColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                }
              ]}>
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.logoGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Icon name="chart-line" size={36} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.logoAccent}>
                  <Icon name="currency-usd" size={16} color="#10B981" />
                </View>
              </View>

              <Text style={[styles.appName, { color: colors.text }]}>Aurestra</Text>
              <Text style={[styles.appTagline, { color: colors.textSecondary }]}>
                Smart Financial Management
              </Text>

              {/* Trust Indicators */}
              <View style={styles.trustBadges}>
                <View style={[styles.trustBadge, { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.08)' }]}>
                  <Icon name="shield-check" size={14} color="#10B981" />
                  <Text style={[styles.trustText, { color: colors.textSecondary }]}>Bank-Level Security</Text>
                </View>
                <View style={[styles.trustBadge, { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.08)' }]}>
                  <Icon name="lock" size={14} color="#3B82F6" />
                  <Text style={[styles.trustText, { color: colors.textSecondary }]}>256-bit Encrypted</Text>
                </View>
              </View>
            </View>

            {/* Sign In Card */}
            <View style={[
              styles.signInCard,
              {
                backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: isDarkMode ? 'rgba(148, 163, 184, 0.1)' : 'rgba(226, 232, 240, 0.8)',
              }
            ]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Secure Sign In
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                Access your financial dashboard
              </Text>

              {/* Google Sign In Button */}
              <TouchableOpacity
                style={styles.googleButton}
                onPress={handleGoogleLogin}
                disabled={authStatus === 'loading'}
                activeOpacity={0.9}
              >
                <View style={[
                  styles.googleButtonInner,
                  {
                    backgroundColor: isDarkMode ? '#FFFFFF' : '#FFFFFF',
                    borderColor: isDarkMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                  }
                ]}>
                  {authStatus === 'loading' ? (
                    <View style={styles.loadingContainer}>
                      <Icon name="loading" size={20} color="#1F2937" />
                      <Text style={styles.googleButtonText}>Authenticating...</Text>
                    </View>
                  ) : (
                    <View style={styles.googleButtonContent}>
                      <Icon name="google" size={20} color="#DB4437" />
                      <Text style={styles.googleButtonText}>Continue with Google</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {/* Benefits */}
              <View style={styles.benefitsSection}>
                {[
                  { icon: 'chart-timeline-variant', text: 'Track expenses & income', color: '#3B82F6' },
                  { icon: 'wallet', text: 'Manage multiple accounts', color: '#10B981' },
                  { icon: 'finance', text: 'Smart budgeting tools', color: '#8B5CF6' },
                ].map((benefit, index) => (
                  <View key={index} style={styles.benefitItem}>
                    <View style={[styles.benefitIcon, { backgroundColor: `${benefit.color}15` }]}>
                      <Icon name={benefit.icon} size={16} color={benefit.color} />
                    </View>
                    <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                      {benefit.text}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Footer */}
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                Protected by industry-standard encryption.{'\n'}
                Your data is safe with us.
              </Text>

              <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                By signing in, you agree to our{' '}
                <Text style={styles.linkText}>Terms</Text> and{' '}
                <Text style={styles.linkText}>Privacy Policy</Text>
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* OTP Modal */}
      <Modal visible={otpVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            {
              backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
              borderColor: isDarkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(226, 232, 240, 0.5)',
            }
          ]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrapper}>
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.modalIconGradient}
                >
                  <Icon name="shield-lock" size={28} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Verify Your Identity
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                Enter the security code sent to
              </Text>
              <Text style={[styles.emailDisplay, { color: colors.text }]}>
                {email}
              </Text>
            </View>

            {/* OTP Input */}
            <View style={styles.otpSection}>
              <TextInput
                style={[
                  styles.otpInput,
                  {
                    backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC',
                    color: colors.text,
                    borderWidth: 2,
                    borderColor: otpError ? '#EF4444' : (isDarkMode ? '#334155' : '#E2E8F0'),
                  }
                ]}
                placeholder="• • • • • •"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={(text) => {
                  setOtp(text);
                  setOtpError('');
                }}
                textAlign="center"
                placeholderTextColor={colors.textSecondary}
              />
              {otpError ? (
                <View style={styles.errorContainer}>
                  <Icon name="alert-circle" size={14} color="#EF4444" />
                  <Text style={styles.errorText}>{otpError}</Text>
                </View>
              ) : null}
            </View>

            {/* Timer Badge */}
            <View style={[
              styles.timerBadge,
              {
                backgroundColor: timer < 60
                  ? 'rgba(239, 68, 68, 0.1)'
                  : (isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(241, 245, 249, 1)')
              }
            ]}>
              <Icon
                name="timer-sand"
                size={14}
                color={timer < 60 ? '#EF4444' : '#64748B'}
              />
              <Text style={[
                styles.timerText,
                { color: timer < 60 ? '#EF4444' : colors.textSecondary }
              ]}>
                {timer > 0 ? `Expires in ${formatTime(timer)}` : 'Code expired'}
              </Text>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={[styles.verifyButton, timer === 0 && styles.verifyButtonDisabled]}
              onPress={handleVerifyOtp}
              disabled={timer === 0 || authStatus === 'loading'}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={timer === 0 ? ['#94A3B8', '#94A3B8'] : ['#10B981', '#059669']}
                style={styles.verifyGradient}
              >
                <Icon
                  name={authStatus === 'loading' ? "loading" : "check-circle"}
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.verifyText}>
                  {authStatus === 'loading' ? 'Verifying...' : 'Verify & Continue'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.resendButton, timer > 0 && { opacity: 0.5 }]}
              onPress={handleResendOtp}
              disabled={timer > 0}
            >
              <Icon name="email-sync" size={16} color={colors.textSecondary} />
              <Text style={[styles.resendText, { color: colors.textSecondary }]}>
                {timer > 0 ? `Resend in ${formatTime(timer)}` : 'Resend verification code'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setOtpVisible(false)}
              style={styles.cancelButton}
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={hideAlert}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: StatusBar.currentHeight || 0,
  },
  backgroundPattern: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  gridLine: {
    width: 1,
    height: '100%',
    borderRightWidth: 1,
  },
  chartDecor: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  chartDecor1: {
    bottom: 60,
    left: 30,
  },
  chartBar: {
    width: 24,
    borderRadius: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoWrapper: {
    width: 90,
    height: 90,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    position: 'relative',
  },
  logoGradient: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoAccent: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  appTagline: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 20,
  },
  trustBadges: {
    flexDirection: 'row',
    gap: 10,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  trustText: {
    fontSize: 11,
    fontWeight: '600',
  },
  signInCard: {
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 14,
    marginBottom: 28,
    fontWeight: '400',
  },
  googleButton: {
    marginBottom: 28,
  },
  googleButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    letterSpacing: 0.2,
  },
  benefitsSection: {
    gap: 14,
    marginBottom: 24,
    paddingTop: 4,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  footerText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
  },
  termsText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  linkText: {
    color: '#10B981',
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  modalIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 20,
    marginBottom: 18,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  modalIconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 6,
  },
  emailDisplay: {
    fontSize: 14,
    fontWeight: '600',
  },
  otpSection: {
    marginBottom: 20,
  },
  otpInput: {
    fontSize: 28,
    fontWeight: '700',
    borderRadius: 14,
    paddingVertical: 14,
    letterSpacing: 10,
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignSelf: 'center',
  },
  timerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  verifyButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
    elevation: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  verifyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  verifyText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  verifyButtonDisabled: {
    opacity: 0.5,
    elevation: 0,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    marginBottom: 10,
  },
  resendText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Additional Styles for Forgot Password & Success
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  backToLoginButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  loginGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  fpHeader: {
    paddingTop: 40,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 20,
    padding: 8,
    zIndex: 10,
  },
  forgotPasswordHeader: {
    alignItems: 'center',
    paddingTop: 20,
  },
  forgotIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  forgotPasswordTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  forgotPasswordSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  formContainer: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  inputWrapperError: {
    borderColor: '#EF4444',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  backToLoginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  backToLoginLinkText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
});

// ForgotPasswordScreen.js
export const ForgotPasswordScreen = ({ navigation }) => {
  const { colors, isDarkMode } = useSettings();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleResetPassword = () => {
    setEmailError('');

    if (!email) {
      setEmailError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email');
      return;
    }

    // Simulate API call
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setEmailSent(true);
    }, 1500);
  };

  if (emailSent) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.headerBackground} />
        <View style={styles.successContainer}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.successIconContainer}
          >
            <Icon name="email-check" size={60} color="#FFFFFF" />
          </LinearGradient>
          <Text style={[styles.successTitle, { color: colors.text }]}>Check Your Email</Text>
          <Text style={[styles.successMessage, { color: colors.textSecondary }]}>
            We've sent password reset instructions to {email}
          </Text>
          <TouchableOpacity
            style={styles.backToLoginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.loginGradient}
            >
              <Text style={styles.loginButtonText}>Back to Login</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setEmailSent(false)}>
            <Text style={styles.resendText}>Didn't receive the email? Resend</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E293B" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Main Visual Header */}
          <LinearGradient
            colors={isDarkMode ? ['#020617', '#1E293B', '#020617'] : ['#1E293B', '#334155', '#1E293B']}
            style={styles.fpHeader}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.forgotPasswordHeader}>
              <View style={styles.forgotIconCircle}>
                <Icon name="lock-reset" size={40} color="#FFFFFF" />
              </View>
              <Text style={styles.forgotPasswordTitle}>Forgot Password?</Text>
              <Text style={styles.forgotPasswordSubtitle}>
                No worries, we'll send you reset instructions
              </Text>
            </View>
          </LinearGradient>

          {/* Form */}
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email Address</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }, emailError && styles.inputWrapperError]}>
                <Icon name="email-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setEmailError('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            </View>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleResetPassword}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={styles.loginGradient}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <Icon name="loading" size={20} color="#FFFFFF" />
                    <Text style={styles.loginButtonText}>Sending...</Text>
                  </View>
                ) : (
                  <Text style={styles.loginButtonText}>Reset Password</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backToLoginLink}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-left" size={16} color="#3B82F6" />
              <Text style={styles.backToLoginLinkText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;