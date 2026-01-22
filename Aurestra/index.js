import React, { useEffect } from 'react';
import { AppRegistry, PermissionsAndroid, Alert, ToastAndroid } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { Provider } from 'react-redux';
import { store } from './API/store';

import BackgroundFetch from 'react-native-background-fetch';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';

import SmsListener from 'react-native-android-sms-listener';
import SmsAndroid from 'react-native-get-sms-android';
import { API_BASE_URL } from './API_URL';
import { registerDeviceToken as registerDeviceTokenThunk, processSMS, processSMSBatch, setLastSmsCheck, fetchUserAccounts } from './API/slice/API';
import { readAllSMS, requestSMSPermission, sendLocalNotification } from './utils/smsHelper';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Config } from './Config';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: Config.GOOGLE_WEB_CLIENT_ID,
  offlineAccess: true,
  forceCodeForRefreshToken: true,
  scopes: [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/drive.file'
  ],
});

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: Config.GOOGLE_WEB_CLIENT_ID,
  offlineAccess: true,
  forceCodeForRefreshToken: true,
  scopes: [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/drive.file'
  ],
});

// SMS logic moved to utils/smsHelper.js

// --------------------------------------------------
// Parse Finance SMS from 8810
// --------------------------------------------------
const parseFinanceSMS = (smsBody) => {
  try {
    const lower = smsBody.toLowerCase();

    // 1️⃣ Type: credit or debit
    let type = null;
    if (lower.includes('credited')) type = 'credit';
    else if (lower.includes('debited')) type = 'debit';

    // 2️⃣ Amount: PKR 86.21, Rs. 100.00
    const amountMatch = smsBody.match(/(?:PKR|Rs\.?)\s?([\d,.]+)/i);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null;

    // 3️⃣ Source / Bank
    let source = null;
    if (/BAHL/i.test(smsBody)) source = 'BAHL';
    else if (/EasyPaisa/i.test(smsBody)) source = 'EasyPaisa';
    else if (/Raast/i.test(smsBody)) source = 'Raast';
    else source = 'Unknown';

    // 4️⃣ Date
    // Format example: "on 30/08/2025 at 18:03:59"
    const dateMatch = smsBody.match(/on (\d{2}\/\d{2}\/\d{4}) at ([\d:]{8})/i);
    let date = null;
    if (dateMatch) {
      date = new Date(`${dateMatch[1]} ${dateMatch[2]}`.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1'));
    }

    return { type, amount, source, date };
  } catch (err) {
    console.log('❌ parseFinanceSMS error:', err.message);
    return null;
  }
};


// --------------------------------------------------
// Listen for new unread 8810 SMS
// --------------------------------------------------
const listenForUnreadFinanceSMS = async () => {
  const hasPermission = await requestSMSPermission();
  if (!hasPermission) return;

  SmsListener.addListener(async (message) => {
    // Only process SMS from 8810, 8812, or BAHL
    const validSenders = ['8810', '8812', 'BAHL', 'BankALHabib', 'AL-Habib'];
    if ((validSenders.includes(message.originatingAddress)) && message.read === 0) {
      console.log('💰 New Unread Finance SMS detected from:', message.originatingAddress);

      // Dispatch to Redux (handles API call and state storage)
      try {
        const result = await store.dispatch(processSMS({
          message: message.body,
          sender: message.originatingAddress
        })).unwrap();

        console.log('✅ SMS Processed:', result);

        if (result.status === 'success') {
          // REFRESH ACCOUNTS IMMEDIATELY TO UPDATE BALANCE ON UI
          store.dispatch(fetchUserAccounts());

          const txn = result.transaction;
          await sendLocalNotification(
            'New Transaction',
            `${txn.type.toUpperCase()}: PKR ${txn.amount} at ${txn.receiver || txn.sender || 'Merchant'}`
          );
        }
      } catch (err) {
        console.log('❌ Failed to process SMS:', err);
      }
    }
  });
};

// --------------------------------------------------
// Device Token Registration
// --------------------------------------------------
const registerDeviceToken = async () => {
  try {
    const token = await messaging().getToken();
    console.log('📱 FCM Token:', token);

    // Use Redux thunk for consistent registration logic
    store.dispatch(registerDeviceTokenThunk(token));
    console.log('📲 Device token registration dispatched');

  } catch (err) {
    console.log('❌ Token registration failed:', err.message);
  }
};

// --------------------------------------------------
// Check Easypaisa Transactions
// --------------------------------------------------
const checkNewEasypaisaTransactions = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/easypaisa/latest`);
    const count = response.data.count || 0;

    if (count > 0) {
      await sendLocalNotification(
        'New Easypaisa Transaction',
        `You have ${count} new transaction(s)`
      );
      console.log(`[Easypaisa] ${count} new transaction(s) found.`);
    } else {
      console.log('[Easypaisa] No new transactions.');
    }
  } catch (err) {
    console.log('[Easypaisa] Error:', err.message);
  }
};

// --------------------------------------------------
// Background Fetch Task
// --------------------------------------------------
const onBackgroundFetch = async (taskId) => {
  console.log('[BackgroundFetch] Task executed:', taskId);

  // Only run protected background tasks if user is authenticated
  try {
    const userToken = await AsyncStorage.getItem('userToken');
    if (userToken) {
      await checkNewEasypaisaTransactions();

      // Check SMS in background (silent mode)
      await readAllSMS(true);
    }
    // otherwise: skip protected background tasks (silent)
  } catch (err) {
    // silent error handling
  }

  BackgroundFetch.finish(taskId);
};

// --------------------------------------------------
// Configure Background Fetch
// --------------------------------------------------
const configureBackgroundFetch = () => {
  BackgroundFetch.configure(
    {
      minimumFetchInterval: 15,
      stopOnTerminate: false,
      startOnBoot: true,
      enableHeadless: true,
      requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
    },
    onBackgroundFetch,
    (err) => console.log('❌ BackgroundFetch failed:', err)
  );

  BackgroundFetch.status((status) => {
    const msg = {
      [BackgroundFetch.STATUS_RESTRICTED]: 'restricted',
      [BackgroundFetch.STATUS_DENIED]: 'denied',
      [BackgroundFetch.STATUS_AVAILABLE]: 'available',
    }[status];

    console.log('[BackgroundFetch] Status:', msg);
  });
};

// --------------------------------------------------
// Init App
// --------------------------------------------------
const initApp = async () => {
  try {
    const authStatus = await messaging().requestPermission();
    console.log('[FCM] Permission:', authStatus);

    // Only perform device registration and protected checks if user is logged in
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (userToken) {
        await registerDeviceToken();
        await checkNewEasypaisaTransactions();
      }
    } catch (err) {
      // silent error handling
    }

    configureBackgroundFetch();

    // Read all SMS once at startup
    console.log('🚀 App Loaded: Starting initial SMS check...');
    await readAllSMS();

    // Listen for unread 8810 finance SMS
    await listenForUnreadFinanceSMS();

    // Setup 5-minute periodic sync
    // Setup 5-minute periodic sync (Foreground)
    setInterval(() => {
      console.log('⏰ 5-Minute Timer Triggered: Checking SMS...');
      readAllSMS(true); // Treat as background to avoid perms popup
    }, 5 * 60 * 1000);

  } catch (err) {
    console.log('❌ initApp error:', err.message);
  }
};

// --------------------------------------------------
// Redux Wrapper
// --------------------------------------------------
const ReduxApp = () => {
  useEffect(() => {
    initApp();
  }, []);

  return (
    <Provider store={store}>
      <App />
    </Provider>
  );
};

AppRegistry.registerComponent(appName, () => ReduxApp);
