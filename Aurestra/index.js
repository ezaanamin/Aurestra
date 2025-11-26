import React, { useEffect } from 'react';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { Provider } from 'react-redux';
import { store } from './API/store';
import BackgroundFetch from 'react-native-background-fetch';
import axios from 'axios';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { API_BASE_URL } from './API_URL';

// ---------------------------
// Local Notification
// ---------------------------
const sendLocalNotification = async (title, message) => {
  const channelId = await notifee.createChannel({
    id: 'default',
    name: 'Default',
    importance: AndroidImportance.HIGH,
  });

  await notifee.displayNotification({
    title,
    body: message,
    android: { channelId, smallIcon: 'ic_launcher' },
  });
};

// ---------------------------
// Device Token Registration
// ---------------------------
const registerDeviceToken = async () => {
  try {
    const token = await messaging().getToken();
    console.log('📱 FCM Token:', token);
    await axios.post(`${API_BASE_URL}/api/register-device`, { token });
    console.log('📲 Device token sent to backend');
  } catch (err) {
    console.log('❌ Token registration failed:', err.message);
  }
};

// ---------------------------
// Check Easypaisa Transactions
// ---------------------------
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
    console.log('[Easypaisa] Error fetching transactions:', err.message);
  }
};

// ---------------------------
// Background Fetch Task
// ---------------------------
const onBackgroundFetch = async (taskId) => {
  console.log('[BackgroundFetch] Task executed:', taskId);
  await checkNewEasypaisaTransactions();
  BackgroundFetch.finish(taskId);
};

// ---------------------------
// Background Fetch Configuration
// ---------------------------
const configureBackgroundFetch = () => {
  BackgroundFetch.configure(
    {
      minimumFetchInterval: 15, // minutes
      stopOnTerminate: false,
      startOnBoot: true,
      enableHeadless: true,
      requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
    },
    onBackgroundFetch,
    (err) => console.log('❌ BackgroundFetch failed to start:', err)
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

// ---------------------------
// App Initialization
// ---------------------------
const initApp = async () => {
  try {
    const authStatus = await messaging().requestPermission();
    console.log('[FCM] Permission:', authStatus);

    await registerDeviceToken();
    await checkNewEasypaisaTransactions(); // First check on startup
    await sendLocalNotification('Test Notification', 'App started successfully');

    configureBackgroundFetch(); // Setup background fetch
  } catch (err) {
    console.log('❌ initApp error:', err.message);
  }
};

// ---------------------------
// Redux App Wrapper
// ---------------------------
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
