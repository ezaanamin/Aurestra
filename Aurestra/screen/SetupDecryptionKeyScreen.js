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
import { useDispatch } from 'react-redux';
import { API_BASE_URL } from '../API_URL';
import { fetchUserProfile } from '../API/slice/API';

const schema = z.object({
  decryptionKey: z.string().min(8, "Key must be at least 8 characters long.")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter.")
    .regex(/[0-9]/, "Must contain at least one number.")
    .regex(/[^A-Za-z0-9]/, "Must contain at least one special character."),
  confirmKey: z.string()
}).refine((data) => data.decryptionKey === data.confirmKey, {
  message: "Keys do not match.",
  path: ["confirmKey"],
});

const SetupDecryptionKeyScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });

  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { decryptionKey: '', confirmKey: '' },
  });

  const showAlert = (type, title, message) => setAlertConfig({ visible: true, type, title, message });
  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const handleSetupKey = async (data) => {
    try {
      // 1. Save locally
      await AsyncStorage.setItem('userDecryptionKey', data.decryptionKey);
      
      // 2. Save to backend database
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        await axios.post(
          `${API_BASE_URL}/api/profile`,
          { decryption_key: data.decryptionKey },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        // Refresh profile state in Redux
        await dispatch(fetchUserProfile());
      }
      
      showAlert('success', 'Key Setup Successful', 'Your decryption key has been securely saved.');
      setTimeout(() => {
        navigation.replace('MainTabs');
      }, 2500);
    } catch (error) {
      console.error('Setup Key Error:', error);
      const serverMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to save the decryption key securely to the server.';
      showAlert('error', 'Setup Failed', serverMessage);
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
              <Icon name="shield-key-outline" size={40} color="#22E6A8" />
            </View>
            <Text style={styles.brandName}>Secure Vault</Text>
            <Text style={styles.brandHint}>SETUP DECRYPTION KEY</Text>
            <Text style={styles.description}>
              Aurestra uses end-to-end encryption. Your data is encrypted on your device and cannot be read by anyone else, including us. Please set a strong decryption key to secure your vault.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Controller control={control} name="decryptionKey" render={({ field: { onChange, value } }) => (
              <View>
                <AuthInput icon="key-variant" placeholder="Decryption Key" value={value} onChangeText={onChange} isPassword secureTextEntry />
                {errors.decryptionKey && <Text style={styles.errorText}>{errors.decryptionKey.message}</Text>}
              </View>
            )} />

            <Controller control={control} name="confirmKey" render={({ field: { onChange, value } }) => (
              <View>
                <AuthInput icon="key-check" placeholder="Confirm Decryption Key" value={value} onChangeText={onChange} isPassword secureTextEntry />
                {errors.confirmKey && <Text style={styles.errorText}>{errors.confirmKey.message}</Text>}
              </View>
            )} />

            <View style={styles.warningBox}>
              <Icon name="alert-circle-outline" size={20} color="#F59E0B" />
              <Text style={styles.warningText}>
                Do not lose this key! If you lose it, your data cannot be recovered. We do not store a copy of your key.
              </Text>
            </View>

            <TouchableOpacity onPress={handleSubmit(handleSetupKey)} style={styles.submitBtn}>
              <LinearGradient colors={['#22E6A8', '#10B981']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitBtnGradient}>
                <Text style={styles.submitBtnText}>Save Securely & Continue</Text>
                <Icon name="shield-check" size={20} color="#064E3B" style={{ marginLeft: 8 }} />
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
  submitBtn: { width: '100%', borderRadius: 16, overflow: 'hidden' },
  submitBtnGradient: { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { color: '#064E3B', fontSize: 16, fontWeight: '700' },
});

export default SetupDecryptionKeyScreen;
