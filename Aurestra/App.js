import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider, useDispatch } from 'react-redux';
import { store } from './API/store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigationRef } from './navigation/RootNavigation';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar, View, ActivityIndicator, Text } from 'react-native';
import { useSettings, SettingsProvider } from './context/SettingsContext';
import { registerDeviceToken, fetchUserAccounts, fetchLatestTransactions, fetchUserProfile } from './API/slice/API';

// Screens
import LoginScreen from './screen/LoginScreen';
import MainTabs from './navigation/MainTabs';
import CurrencyConverterScreen from './screen/CurrencyConverterScreen';
import { ForgotPasswordScreen } from './screen/LoginScreen';
import EditProfileScreen from './screen/EditProfileScreen';
import PaymentMethodsScreen from './screen/PaymentMethodsScreen';
import FullHistoryScreen from './screen/FullHistoryScreen';
import LinkedAccountsScreen from './screen/LinkedAccountsScreen';
import CategoryManagementScreen from './screen/CategoryManagementScreen';
import FinancialInsightsScreen from './screen/FinancialInsightsScreen';
import UncategorizedTransactionsScreen from './screen/UncategorizedTransactionsScreen';

const Stack = createStackNavigator();

const App = () => {
  return (
    <Provider store={store}>
      <SettingsProvider>
        <SafeAreaProvider>
          <Root />
        </SafeAreaProvider>
      </SettingsProvider>
    </Provider>
  );
};

const Root = () => {
  const [initialRoute, setInitialRoute] = useState(null);
  const dispatch = useDispatch();
  const { isDarkMode, colors } = useSettings();

  // Standard React Navigation Theme Object
  const navigationTheme = {
    dark: isDarkMode,
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.error,
    },
  };

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const handleDeviceRegistration = async () => {
    try {
      // In a real app, we'd use expo-notifications to get the real token.
      // For this environment, we'll try to find an existing token or use a placeholder
      // if it's a simulated environment.
      let token = await AsyncStorage.getItem('pushToken');

      if (!token) {
        // Fallback for simulation / first run
        token = 'simulated-token-' + Math.random().toString(36).substring(7);
        await AsyncStorage.setItem('pushToken', token);
      }

      console.log('📱 Registering device token:', token);
      dispatch(registerDeviceToken(token));
    } catch (e) {
      console.error('Failed to register device:', e);
    }
  };

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        // Token exists, verify it with backend
        try {
          // We use fetchUserProfile because it is a protected route.
          // If token is valid, it returns 200.
          // If invalid/expired, it returns 401, and interceptor/catch handles it.
          await dispatch(fetchUserProfile()).unwrap();

          // Token is valid and backend is reachable
          setInitialRoute('MainTabs');
          registerDeviceToken(token); // Re-register token
        } catch (e) {
          console.log('Token/Backend validation failed:', e);
          // If 401, interceptor might have fired, but we must set initialRoute to ensure App renders
          setInitialRoute('Login');
        }
      } else {
        setInitialRoute('Login');
      }
    } catch (error) {
      console.error('Error checking login status:', error);
      setInitialRoute('Login');
    }
  };

  if (initialRoute === null) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 20, color: colors.text }}>Loading Aurestra...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background }, // Default background for screens
        }}
        initialRouteName={initialRoute}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen
          name="EditProfile"
          component={EditProfileScreen}
        />
        <Stack.Screen name="LinkedAccounts" component={LinkedAccountsScreen} />
        <Stack.Screen
          name="PaymentMethods"
          component={PaymentMethodsScreen}
        />
        <Stack.Screen name="FullHistory" component={FullHistoryScreen} />
        <Stack.Screen name="CategoryManagement" component={CategoryManagementScreen} />
        <Stack.Screen name="FinancialInsights" component={FinancialInsightsScreen} />
        <Stack.Screen name="UncategorizedTransactions" component={UncategorizedTransactionsScreen} />
        <Stack.Screen
          name="CurrencyConverter"
          component={CurrencyConverterScreen}
          options={{
            presentation: 'modal',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;