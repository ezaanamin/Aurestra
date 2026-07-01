import React, { useState } from 'react';
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import CustomAlert from '../components/CustomAlert';
import AuthInput from '../components/AuthInput';
import LinearGradient from 'react-native-linear-gradient';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { API_BASE_URL } from '../API_URL';
import { fetchUserProfile } from '../API/slice/API';

// ── Schema for first-time SETUP (new key + confirm) ──────────────────────────
const setupSchema = z.object({
  decryptionKey: z.string().min(8, 'Key must be at least 8 characters long.')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter.')
    .regex(/[0-9]/, 'Must contain at least one number.')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character.'),
  confirmKey: z.string(),
}).refine((data) => data.decryptionKey === data.confirmKey, {
  message: 'Keys do not match.',
  path: ['confirmKey'],
});

// ── Schema for UNLOCK (existing key, no confirm needed) ──────────────────────
const unlockSchema = z.object({
  decryptionKey: z.string().min(1, 'Please enter your decryption key.'),
  confirmKey: z.string().optional(),
});

const SetupDecryptionKeyScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.API?.user);

  // If the backend already has a key hash registered, we are in UNLOCK mode
  const isUnlockMode = !!user?.has_decryption_key;

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });

  const { control, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(isUnlockMode ? unlockSchema : setupSchema),
    defaultValues: { decryptionKey: '', confirmKey: '' },
  });

  const showAlert = (type, title, message) => setAlertConfig({ visible: true, type, title, message });
  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const handleSubmitKey = async (data) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showAlert('error', 'Session Expired', 'Your session has expired. Please log in again.');
        navigation.replace('Login');
        return;
      }

      if (isUnlockMode) {
        // ── UNLOCK: Verify key against the backend hash ─────────────────────
        // POST to /api/profile sends the key; backend verifies hash match.
        // If it doesn't match, backend returns 400 "Incorrect decryption key."
        await axios.post(
          `${API_BASE_URL}/api/profile`,
          { decryption_key: data.decryptionKey },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Key verified — save locally and continue
        await AsyncStorage.setItem('userDecryptionKey', data.decryptionKey);
        await dispatch(fetchUserProfile());

        showAlert('success', 'Vault Unlocked', 'Your vault has been successfully unlocked.');
        setTimeout(() => navigation.replace('MainTabs'), 2000);
      } else {
        // ── SETUP: First-time key creation ─────────────────────────────────
        // Save locally first so the request interceptor can attach it
        await AsyncStorage.setItem('userDecryptionKey', data.decryptionKey);

        await axios.post(
          `${API_BASE_URL}/api/profile`,
          { decryption_key: data.decryptionKey },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        await dispatch(fetchUserProfile());

        showAlert('success', 'Key Setup Successful', 'Your decryption key has been securely saved.');
        setTimeout(() => navigation.replace('MainTabs'), 2500);
      }
    } catch (error) {
      console.error('[SetupDecryptionKeyScreen] Error:', error?.response?.data || error?.message);
      const serverMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        (isUnlockMode
          ? 'Incorrect decryption key. Please try again.'
          : 'Failed to save the decryption key securely.');

      // Clear the stale local key on unlock failure so it doesn't poison requests
      if (isUnlockMode) {
        await AsyncStorage.removeItem('userDecryptionKey');
      }

      showAlert('error', isUnlockMode ? 'Unlock Failed' : 'Setup Failed', serverMessage);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={styles.glowTopLeft} />
          </View>

          <View style={styles.brandSection}>
            <View style={styles.iconRing}>
              <Icon
                name={isUnlockMode ? 'lock-open-variant-outline' : 'shield-key-outline'}
                size={40}
                color="#22E6A8"
              />
            </View>
            <Text style={styles.brandName}>
              {isUnlockMode ? 'Unlock Vault' : 'Secure Vault'}
            </Text>
            <Text style={styles.brandHint}>
              {isUnlockMode ? 'ENTER YOUR DECRYPTION KEY' : 'SETUP DECRYPTION KEY'}
            </Text>
            <Text style={styles.description}>
              {isUnlockMode
                ? 'Enter your vault decryption key to access your encrypted financial data on this device.'
                : 'Aurestra uses end-to-end encryption. Set a strong decryption key to secure your vault. Do not lose it — we cannot recover it for you.'}
            </Text>
          </View>

          <View style={styles.formCard}>
            <Controller
              control={control}
              name="decryptionKey"
              render={({ field: { onChange, value } }) => (
                <View>
                  <AuthInput
                    icon="key-variant"
                    placeholder={isUnlockMode ? 'Enter Decryption Key' : 'Decryption Key'}
                    value={value}
                    onChangeText={onChange}
                    isPassword
                    secureTextEntry
                  />
                  {errors.decryptionKey && (
                    <Text style={styles.errorText}>{errors.decryptionKey.message}</Text>
                  )}
                </View>
              )}
            />

            {!isUnlockMode && (
              <Controller
                control={control}
                name="confirmKey"
                render={({ field: { onChange, value } }) => (
                  <View>
                    <AuthInput
                      icon="key-check"
                      placeholder="Confirm Decryption Key"
                      value={value}
                      onChangeText={onChange}
                      isPassword
                      secureTextEntry
                    />
                    {errors.confirmKey && (
                      <Text style={styles.errorText}>{errors.confirmKey.message}</Text>
                    )}
                  </View>
                )}
              />
            )}

            <View style={styles.warningBox}>
              <Icon
                name={isUnlockMode ? 'information-outline' : 'alert-circle-outline'}
                size={20}
                color={isUnlockMode ? '#22E6A8' : '#F59E0B'}
              />
              <Text style={[styles.warningText, isUnlockMode && styles.infoText]}>
                {isUnlockMode
                  ? 'This is the key you set up when you first created your account. It never leaves your device.'
                  : 'Do not lose this key! If you lose it, your data cannot be recovered. We do not store a copy of your key.'}
              </Text>
            </View>

            <TouchableOpacity onPress={handleSubmit(handleSubmitKey)} style={styles.submitBtn}>
              <LinearGradient
                colors={['#22E6A8', '#10B981']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitBtnGradient}
              >
                <Text style={styles.submitBtnText}>
                  {isUnlockMode ? 'Unlock Vault' : 'Save Securely & Continue'}
                </Text>
                <Icon
                  name={isUnlockMode ? 'lock-open-variant' : 'shield-check'}
                  size={20}
                  color="#064E3B"
                  style={{ marginLeft: 8 }}
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
      <CustomAlert {...alertConfig} onClose={hideAlert} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40, alignItems: 'center', justifyContent: 'center' },
  glowTopLeft: { position: 'absolute', top: -80, left: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(34,230,168,0.1)' },
  brandSection: { alignItems: 'center', marginBottom: 32 },
  iconRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: 'rgba(34,230,168,0.4)', padding: 4, marginBottom: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(34,230,168,0.1)' },
  brandName: { fontSize: 28, fontWeight: '800', color: '#F0F6FF', letterSpacing: -0.5, marginBottom: 8 },
  brandHint: { fontSize: 11, letterSpacing: 3, color: '#22E6A8', fontWeight: '600', marginBottom: 16 },
  description: { textAlign: 'center', color: '#94A3B8', fontSize: 14, lineHeight: 22, paddingHorizontal: 10 },
  formCard: { width: '100%', backgroundColor: 'rgba(15,23,42,0.6)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(34,230,168,0.15)', padding: 20 },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: -12, marginBottom: 12, marginLeft: 8 },
  warningBox: { flexDirection: 'row', backgroundColor: 'rgba(245,158,11,0.1)', padding: 12, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)' },
  warningText: { color: '#FCD34D', fontSize: 13, marginLeft: 10, flex: 1, lineHeight: 18 },
  infoText: { color: '#22E6A8' },
  submitBtn: { width: '100%', borderRadius: 16, overflow: 'hidden' },
  submitBtnGradient: { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { color: '#064E3B', fontSize: 16, fontWeight: '700' },
});

export default SetupDecryptionKeyScreen;
