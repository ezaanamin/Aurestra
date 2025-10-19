/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { Provider } from 'react-redux';
import { store } from './API/store';
import BackgroundFetch from 'react-native-background-fetch';
import axios from 'axios';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';

const API_BASE_URL = 'https://01df9cf68733.ngrok-free.app'; // replace with your backend

// --- Send push notification helper ---
const sendPushNotification = async (title, message) => {
  // Create a channel (required for Android)
  const channelId = await notifee.createChannel({
    id: 'default',
    name: 'Default Channel',
    importance: AndroidImportance.HIGH,
  });

  await notifee.displayNotification({
    title,
    body: message,
    android: {
      channelId,
      smallIcon: 'ic_launcher', // change if you have custom icon
    },
  });
};

// --- Check for new Easypaisa transactions ---
const checkNewEasypaisaTransactions = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/easypaisa/latest`);
    if (response.data.count && response.data.count > 0) {
      await sendPushNotification(
        'New Easypaisa Transaction',
        `You have ${response.data.count} new transaction(s) saved.`
      );
    } else {
      console.log("[Easypaisa] No new transactions.");
    }
  } catch (error) {
    console.log('[Easypaisa Check] Error:', error.response?.data || error.message);
  }
};

// --- App initialization ---
const initApp = async () => {
  // Request permission for notifications
  const authStatus = await messaging().requestPermission();
  console.log('[FCM] Authorization status:', authStatus);

  // 🔹 TEST PUSH NOTIFICATION ON APP START
  await sendPushNotification('Test Notification', 'This notification appears immediately on app startup.');

  // Check Easypaisa emails immediately
  await checkNewEasypaisaTransactions();
};

// --- Background fetch handler ---
const onBackgroundFetch = async (taskId) => {
  console.log(`[BackgroundFetch] Task executed: ${taskId}`);
  await checkNewEasypaisaTransactions();
  BackgroundFetch.finish(taskId);
};

// --- Configure BackgroundFetch ---
BackgroundFetch.configure(
  {
    minimumFetchInterval: 15, // minutes
    stopOnTerminate: false,
    startOnBoot: true,
    enableHeadless: true,
    requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
  },
  onBackgroundFetch,
  (error) => {
    console.error('[BackgroundFetch] failed to start', error);
  }
);

// --- App registry ---
const ReduxApp = () => (
  <Provider store={store}>
    <App />
  </Provider>
);

AppRegistry.registerComponent(appName, () => ReduxApp);

// --- BackgroundFetch status logging ---
BackgroundFetch.status((status) => {
  switch (status) {
    case BackgroundFetch.STATUS_RESTRICTED:
      console.log("Background fetch restricted");
      break;
    case BackgroundFetch.STATUS_DENIED:
      console.log("Background fetch denied");
      break;
    case BackgroundFetch.STATUS_AVAILABLE:
      console.log("Background fetch available");
      break;
  }
});

// --- Start the app initialization ---
initApp();
