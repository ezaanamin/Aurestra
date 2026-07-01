import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigationRef, navigateWhenReady } from './navigation/RootNavigation';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar, View, Image } from 'react-native';
import { useSettings, SettingsProvider } from './context/SettingsContext';
import { fetchUserProfile } from './API/slice/API';

// Screens
import LoginScreen from './screen/LoginScreen';
import RegisterScreen from './screen/RegisterScreen';
import ForgotPasswordScreen from './screen/ForgotPasswordScreen';
import EmailVerificationScreen from './screen/EmailVerificationScreen';
import MainTabs from './navigation/MainTabs';
import CurrencyConverterScreen from './screen/CurrencyConverterScreen';
import EditProfileScreen from './screen/EditProfileScreen';
import SetupDecryptionKeyScreen from './screen/SetupDecryptionKeyScreen';
import PaymentMethodsScreen from './screen/PaymentMethodsScreen';
import FullHistoryScreen from './screen/FullHistoryScreen';
import LinkedAccountsScreen from './screen/LinkedAccountsScreen';
import CategoryManagementScreen from './screen/CategoryManagementScreen';
import FinancialInsightsScreen from './screen/FinancialInsightsScreen';
import UncategorizedTransactionsScreen from './screen/UncategorizedTransactionsScreen';
import SpamTransactionsScreen from './screen/SpamTransactionsScreen';
import MonthlyBreakdownScreen from './screen/MonthlyBreakdownScreen';
import BankNotificationLogScreen from './screen/BankNotificationLogScreen';
import LiveApisScreen from './screen/LiveApisScreen';
import BackupManagementScreen from './screen/BackupManagementScreen';

const Stack = createStackNavigator();

const App = () => (
  <SettingsProvider>
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  </SettingsProvider>
);

const Root = () => {
  const [initialRoute, setInitialRoute]   = useState(null);
  const [introFinished, setIntroFinished] = useState(false);
  const dispatch = useDispatch();
  const authStatus = useSelector(state => state.API?.authStatus);
  const { isDarkMode, colors } = useSettings();

  useEffect(() => {
    const monitorLogout = async () => {
      const token = await AsyncStorage.getItem('userToken');
      if (!token && initialRoute && introFinished) {
        navigationRef.current?.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    };
    monitorLogout();
  }, [authStatus, initialRoute, introFinished]);

  const navigationTheme = {
    dark: isDarkMode,
    colors: {
      primary:      colors.primary,
      background:   colors.background,
      card:         colors.card,
      text:         colors.text,
      border:       colors.border,
      notification: colors.error,
    },
  };

  // ── 1. Boot ────────────────────────────────────────────────────────────────
  useEffect(() => {
    checkLoginStatus();
    const timer = setTimeout(() => setIntroFinished(true), 3150);
    return () => clearTimeout(timer);
  }, []);

  const checkLoginStatus = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (userToken) {
        try {
          const user = await dispatch(fetchUserProfile()).unwrap();
          const key = await AsyncStorage.getItem('userDecryptionKey');

          // Both conditions must be true:
          // 1. Local key exists in AsyncStorage
          // 2. Backend confirms key is registered (has_decryption_key)
          if (!key || !user?.has_decryption_key) {
            // Clear stale local key if backend has no record of it
            if (key && !user?.has_decryption_key) {
              await AsyncStorage.removeItem('userDecryptionKey');
            }
            setInitialRoute('SetupDecryptionKey');
          } else {
            setInitialRoute('MainTabs');
          }
        } catch (e) {
          console.log('[App] backend validation failed:', e);
          setInitialRoute('Login');
        }
      } else {
        setInitialRoute('Login');
      }
    } catch (error) {
      console.error('[App] Error checking login status:', error);
      setInitialRoute('Login');
    }
  };

  // ── Splash ─────────────────────────────────────────────────────────────────
  if (initialRoute === null || !introFinished) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <Image
            source={require('./assets/Aurestra_intro.gif')}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </View>
      </SafeAreaProvider>
    );
  }

  // ── Navigator ──────────────────────────────────────────────────────────────
  return (
    <>
      <NavigationContainer ref={navigationRef} theme={navigationTheme}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
          initialRouteName={initialRoute}
        >
          <Stack.Screen name="Login"                     component={LoginScreen} />
          <Stack.Screen name="Register"                  component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword"            component={ForgotPasswordScreen} />
          <Stack.Screen name="EmailVerification"         component={EmailVerificationScreen} />
          <Stack.Screen name="SetupDecryptionKey"        component={SetupDecryptionKeyScreen} />
          <Stack.Screen name="MainTabs"                  component={MainTabs} />
          <Stack.Screen name="EditProfile"               component={EditProfileScreen} />
          <Stack.Screen name="LinkedAccounts"            component={LinkedAccountsScreen} />
          <Stack.Screen name="PaymentMethods"            component={PaymentMethodsScreen} />
          <Stack.Screen name="FullHistory"               component={FullHistoryScreen} />
          <Stack.Screen name="CategoryManagement"        component={CategoryManagementScreen} />
          <Stack.Screen name="FinancialInsights"         component={FinancialInsightsScreen} />
          <Stack.Screen name="UncategorizedTransactions" component={UncategorizedTransactionsScreen} />
          <Stack.Screen name="SpamTransactions"          component={SpamTransactionsScreen} />
          <Stack.Screen name="MonthlyBreakdown"          component={MonthlyBreakdownScreen} />
          <Stack.Screen name="BankNotificationLog"       component={BankNotificationLogScreen} />
          <Stack.Screen name="LiveApis"                  component={LiveApisScreen} />
          <Stack.Screen name="BackupManagement"           component={BackupManagementScreen} />
          <Stack.Screen
            name="CurrencyConverter"
            component={CurrencyConverterScreen}
            options={{ presentation: 'modal' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
};

export default App; 