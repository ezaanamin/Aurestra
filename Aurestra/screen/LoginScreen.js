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
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';

import { loginUser, verifyOtp, registerDeviceToken } from '../API/slice/API';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Modal } from 'react-native';
import CustomAlert from '../components/CustomAlert';

const LoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { authStatus, authError, token } = useSelector((state) => state.API);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // OTP State
  const [otpVisible, setOtpVisible] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [timer, setTimer] = useState(300); // 5 minutes in seconds

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Custom Alert State
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

  // Timer Logic
  React.useEffect(() => {
    let interval;
    if (otpVisible && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (!otpVisible) {
      setTimer(300); // Reset when closed
      setOtp(''); // Clear OTP when closed
    }
    return () => clearInterval(interval);
  }, [otpVisible, timer]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  React.useEffect(() => {
    if (token) {
      // Proactively register token on login so it links to user
      registerTokenIfAvailable();
      navigation.replace('MainTabs');
    }
  }, [token, navigation]);

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
      // Removed Alert.alert, Modal handles it
    }
    if (authStatus === 'failed' && authError) {
      showAlert('error', 'Authentication Failed', authError);
    }
  }, [authStatus, authError]);

  // Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle Login
  const handleLogin = () => {
    setEmailError('');
    setPasswordError('');
    let hasError = false;

    if (!email) {
      setEmailError('Email is required');
      hasError = true;
    } else if (!validateEmail(email)) {
      setEmailError('Please enter a valid email');
      hasError = true;
    }

    if (!password) {
      setPasswordError('Password is required');
      hasError = true;
    }

    if (hasError) return;

    dispatch(loginUser({ email, password }));
  };

  const handleVerifyOtp = () => {
    if (!otp || otp.length < 6) {
      setOtpError('Enter a valid 6-digit OTP');
      return;
    }
    dispatch(verifyOtp({ email, otp }));
  };

  // Social Login Handlers
  const handleGoogleLogin = () => {
    showAlert('info', 'Google Login', 'Google authentication would be implemented here');
  };

  const handleAppleLogin = () => {
    showAlert('info', 'Apple Login', 'Apple authentication would be implemented here');
  };

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
          {/* Header with Gradient */}
          <LinearGradient
            colors={['#1E293B', '#334155', '#1E293B']}
            style={styles.header}
          >
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Icon name="wallet" size={40} color="#FFFFFF" />
              </View>
              <Text style={styles.appName}>Aurestra</Text>
              <Text style={styles.appTagline}>Personal Finance Evolved</Text>
            </View>
          </LinearGradient>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>Welcome Back!</Text>
              <Text style={styles.welcomeSubtitle}>Sign in to continue managing your finances</Text>
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={[styles.inputWrapper, emailError && styles.inputWrapperError]}>
                <Icon name="email-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#94A3B8"
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

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={[styles.inputWrapper, passwordError && styles.inputWrapperError]}>
                <Icon name="lock-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setPasswordError('');
                  }}
                  secureTextEntry={!passwordVisible}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setPasswordVisible(!passwordVisible)}
                  style={styles.eyeIcon}
                >
                  <Icon
                    name={passwordVisible ? 'eye-off' : 'eye'}
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
            </View>

            {/* Remember Me & Forgot Password */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberMeContainer}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                  {rememberMe && <Icon name="check" size={16} color="#FFFFFF" />}
                </View>
                <Text style={styles.rememberMeText}>Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={authStatus === 'loading'}
            >
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={styles.loginGradient}
              >
                {authStatus === 'loading' ? (
                  <View style={styles.loadingContainer}>
                    <Icon name="loading" size={20} color="#FFFFFF" />
                    <Text style={styles.loginButtonText}>Processing...</Text>
                  </View>
                ) : (
                  <Text style={styles.loginButtonText}>Sign In</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Login Buttons */}
            <View style={styles.socialButtonsContainer}>
              <TouchableOpacity style={styles.socialButton} onPress={handleGoogleLogin}>
                <Icon name="google" size={24} color="#DB4437" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton} onPress={handleAppleLogin}>
                <Icon name="apple" size={24} color="#000000" />
              </TouchableOpacity>
            </View>


          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* OTP Modal */}
      <Modal visible={otpVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter OTP</Text>
            <Text style={styles.modalSubtitle}>Please enter the 6-digit code sent to {email}</Text>

            <TextInput
              style={styles.otpInput}
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
              textAlign="center"
            />
            {otpError ? <Text style={styles.errorText}>{otpError}</Text> : null}

            <View style={styles.timerContainer}>
              <Icon name="clock-outline" size={16} color={timer < 60 ? '#EF4444' : '#64748B'} />
              <Text style={[styles.timerText, timer < 60 && styles.timerTextWarning]}>
                Code expires in {formatTime(timer)}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.verifyButton, timer === 0 && styles.verifyButtonDisabled]}
              onPress={handleVerifyOtp}
              disabled={timer === 0}
            >
              {authStatus === 'loading' ? (
                <Text style={styles.verifyButtonText}>Verifying...</Text>
              ) : (
                <Text style={styles.verifyButtonText}>Verify & Login</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setOtpVisible(false)} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
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

// ForgotPasswordScreen.js
export const ForgotPasswordScreen = ({ navigation }) => {
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
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1E293B" />
        <View style={styles.successContainer}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.successIconContainer}
          >
            <Icon name="email-check" size={60} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.successTitle}>Check Your Email</Text>
          <Text style={styles.successMessage}>
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
          {/* Header */}
          <LinearGradient
            colors={['#1E293B', '#334155', '#1E293B']}
            style={styles.header}
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
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={[styles.inputWrapper, emailError && styles.inputWrapperError]}>
                <Icon name="email-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#94A3B8"
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 40,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoCircle: {
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
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  appTagline: {
    fontSize: 14,
    color: '#94A3B8',
  },
  formContainer: {
    padding: 24,
  },
  welcomeSection: {
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#1E293B',
    paddingVertical: 14,
  },
  eyeIcon: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  rememberMeText: {
    fontSize: 14,
    color: '#64748B',
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  loginGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 14,
    color: '#64748B',
    marginHorizontal: 16,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  signUpText: {
    fontSize: 14,
    color: '#64748B',
  },
  signUpLink: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  demoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  demoText: {
    fontSize: 12,
    color: '#64748B',
  },
  // Forgot Password Specific Styles
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
  // Success Screen Styles
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
    color: '#1E293B',
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 14,
    color: '#64748B',
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
  resendText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  otpInput: {
    fontSize: 24,
    fontWeight: 'bold',
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
    width: '60%',
    marginBottom: 20,
    paddingVertical: 10,
    color: '#1E293B',
    letterSpacing: 8,
  },
  verifyButton: {
    width: '100%',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  verifyButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  verifyButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  timerText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  timerTextWarning: {
    color: '#EF4444',
    fontWeight: 'bold',
  },
  cancelButton: {
    padding: 10,
  },
  cancelButtonText: {
    color: '#64748B',
    fontWeight: '500',
  }
});

export default LoginScreen;