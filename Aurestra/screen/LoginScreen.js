import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { loginWithEmail, loginWithGoogle } from '../API/slice/API';
import CustomAlert from '../components/CustomAlert';
import AuthInput from '../components/AuthInput';
import LinearGradient from 'react-native-linear-gradient';
import axios from 'axios';
import { API_BASE_URL } from '../API_URL';

GoogleSignin.configure({
  webClientId: '1097204683072-t6shb28hsc38u7d903g290h2olv7c1o3.apps.googleusercontent.com',
  offlineAccess: true,
  scopes: ['profile', 'email'],
});

const schema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

const LoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { authStatus, token, user } = useSelector((state) => state.API);

  const [alertConfig, setAlertConfig] = React.useState({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });

  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const showAlert = (type, title, message) => setAlertConfig({ visible: true, type, title, message });
  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  React.useEffect(() => {
    if (!(token && authStatus !== 'failed' && authStatus !== 'loading')) {
      console.log("[LoginScreen] useEffect skipped: token =", !!token, "authStatus =", authStatus);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        console.log("[LoginScreen] useEffect running. Checking decryption key... user =", user);
        const key = await AsyncStorage.getItem('userDecryptionKey');
        console.log("[LoginScreen] Local decryption key in storage:", !!key);

        if (!cancelled) {
          // Must have local key AND backend must confirm key is registered
          if (!key || !user?.has_decryption_key) {
            console.log("[LoginScreen] Missing key or backend has no key. Redirecting to SetupDecryptionKey...");
            if (key && !user?.has_decryption_key) {
              console.log("[LoginScreen] Clearing stale local key...");
              await AsyncStorage.removeItem('userDecryptionKey');
            }
            navigation.replace('SetupDecryptionKey');
          } else {
            console.log("[LoginScreen] Key exists and is verified. Redirecting to MainTabs...");
            navigation.replace('MainTabs');
          }
        }
      } catch (err) {
        console.error("[LoginScreen] Error inside navigation useEffect:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [token, authStatus, user, navigation, dispatch]);

  const onGoogleButtonPress = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signOut();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo?.data?.idToken || userInfo?.idToken;
      const authData = userInfo?.data?.user || userInfo?.user;
      
      if (!idToken || !authData?.email) {
        showAlert('error', 'Login Failed', 'Failed to retrieve Google credentials.');
        return;
      }
      await dispatch(loginWithGoogle({ email: authData.email, idToken })).unwrap();
    } catch (error) {
      if (error.code !== statusCodes.SIGN_IN_CANCELLED && error.code !== statusCodes.IN_PROGRESS) {
        showAlert('error', 'Login Failed', error.message || 'Unknown error');
      }
    }
  };

  const handleEmailLogin = async (data) => {
    try {
      await dispatch(loginWithEmail(data)).unwrap();
    } catch (error) {
      if (typeof error === 'object' && error?.requires_verification) {
        navigation.navigate('EmailVerification', { email: data.email });
      } else {
        showAlert('error', 'Login Failed', typeof error === 'string' ? error : (error?.message || 'Invalid credentials'));
      }
    }
  };

  const isLoading = authStatus === 'loading';
  const isPostAuth = !!token && (authStatus === 'succeeded' || authStatus === 'authenticated');


  if (isLoading || isPostAuth) {
    return (
      <SafeAreaView style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <ActivityIndicator size="large" color="#22E6A8" />
        <Text style={{ color: '#FFFFFF', marginTop: 16, fontSize: 16, fontWeight: '600' }}>
          {isPostAuth ? "Initializing your secure vault..." : "Authenticating..."}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={styles.glowTopLeft} />
            <View style={styles.glowBottomRight} />
          </View>
          <View style={styles.brandSection}>
            <View style={styles.logoRing}>
              <Image source={require('../assets/logo.png')} style={styles.logoImage} resizeMode="cover" />
            </View>
            <Text style={styles.brandName}>Welcome Back</Text>
            <Text style={styles.brandHint}>SIGN IN TO CONTINUE</Text>
          </View>
          <View style={styles.formCard}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <View>
                  <AuthInput
                    icon="email-outline"
                    placeholder="Email Address"
                    value={value}
                    onChangeText={onChange}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
                </View>
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <View>
                  <AuthInput
                    icon="lock-outline"
                    placeholder="Password"
                    value={value}
                    onChangeText={onChange}
                    secureTextEntry
                  />
                  {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
                </View>
              )}
            />
            <View style={styles.forgotPasswordContainer}>
              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.loginButtonWrapper} onPress={handleSubmit(handleEmailLogin)}>
              <LinearGradient colors={['#22E6A8', '#10B981']} style={styles.loginButton} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={styles.loginButtonText}>Sign In</Text>
                <Icon name="arrow-right" size={20} color="#064E3B" style={styles.loginIcon} />
              </LinearGradient>
            </TouchableOpacity>
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>
            <TouchableOpacity style={styles.googleButton} onPress={onGoogleButtonPress}>
              <Icon name="google" size={24} color="#DB4437" style={styles.googleIcon} />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <CustomAlert visible={alertConfig.visible} type={alertConfig.type} title={alertConfig.title} message={alertConfig.message} onClose={hideAlert} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, minHeight: '100%' },
  glowTopLeft: { position: 'absolute', top: -100, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(34, 230, 168, 0.15)', transform: [{ scale: 2 }] },
  glowBottomRight: { position: 'absolute', bottom: -100, right: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(16, 185, 129, 0.15)', transform: [{ scale: 2 }] },
  brandSection: { alignItems: 'center', marginBottom: 40, marginTop: 40 },
  logoRing: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(34, 230, 168, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(34, 230, 168, 0.3)' },
  logoImage: { width: 44, height: 44, tintColor: '#22E6A8' },
  brandName: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5, marginBottom: 8 },
  brandHint: { fontSize: 12, color: '#94A3B8', letterSpacing: 2, fontWeight: '600' },
  formCard: { backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: -12, marginBottom: 12, marginLeft: 16 },
  forgotPasswordContainer: { alignItems: 'flex-end', marginBottom: 24 },
  forgotPasswordText: { color: '#22E6A8', fontSize: 14, fontWeight: '600' },
  loginButtonWrapper: { shadowColor: '#22E6A8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8, marginBottom: 24 },
  loginButton: { height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  loginButtonText: { color: '#064E3B', fontSize: 16, fontWeight: 'bold', marginRight: 8 },
  loginIcon: { opacity: 0.8 },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  dividerText: { color: '#64748B', paddingHorizontal: 16, fontSize: 14, fontWeight: '500' },
  googleButton: { height: 56, backgroundColor: '#FFFFFF', borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  googleIcon: { width: 24, height: 24, marginRight: 12 },
  googleButtonText: { color: '#1E293B', fontSize: 16, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 'auto', paddingTop: 32 },
  footerText: { color: '#94A3B8', fontSize: 15 },
  footerLink: { color: '#22E6A8', fontSize: 15, fontWeight: 'bold' }
});

export default LoginScreen;
