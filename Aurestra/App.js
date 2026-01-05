import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider, useDispatch } from 'react-redux';
import { store } from './API/store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigationRef } from './navigation/RootNavigation';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SettingsProvider } from './context/SettingsContext';
import { registerDeviceToken, fetchUserAccounts, fetchLatestTransactions } from './API/slice/API';

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

const Stack = createStackNavigator();

const App = () => {
  const [initialRoute, setInitialRoute] = useState(null);
  const dispatch = useDispatch();

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
      setInitialRoute(token ? 'MainTabs' : 'Login');
    } catch (error) {
      console.error('Error checking login status:', error);
      setInitialRoute('Login');
    }
  };

  if (initialRoute === null) {
    return null; // Or a Splash Screen
  }

  return (
    <Provider store={store}>
      <SettingsProvider>
        <SafeAreaProvider>
          <NavigationContainer ref={navigationRef}>
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
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
              <Stack.Screen
                name="CurrencyConverter"
                component={CurrencyConverterScreen}
                options={{
                  presentation: 'modal',
                }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </SettingsProvider>
    </Provider>
  );
};

export default App;