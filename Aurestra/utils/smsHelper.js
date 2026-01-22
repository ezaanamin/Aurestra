import { PermissionsAndroid, ToastAndroid } from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from '../API/store';
import { setLastSmsCheck, processSMSBatch, fetchUserAccounts } from '../API/slice/API';
import notifee, { AndroidImportance } from '@notifee/react-native';

export const sendLocalNotification = async (title, message) => {
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

export const requestSMSPermission = async () => {
    try {
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_SMS,
            {
                title: "SMS Permission",
                message: "App requires access to read your SMS messages.",
                buttonPositive: "OK"
            }
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            console.log("📩 SMS Permission granted");
            return true;
        } else {
            console.log("❌ SMS Permission denied");
            return false;
        }
    } catch (err) {
        console.warn(err);
        return false;
    }
};

// --------------------------------------------------
// Read ALL SMS Messages (once at startup or background)
// --------------------------------------------------
export const readAllSMS = async (isBackground = false) => {
    console.log(`📱 readAllSMS called. isBackground: ${isBackground}`);

    // 1. Check Permissions
    let hasPermission = false;
    if (isBackground) {
        hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
        if (!hasPermission) {
            console.log('Background SMS check skipped: No permission');
            return;
        }
    } else {
        hasPermission = await requestSMSPermission();
        if (!hasPermission) return;
    }

    // 2. Load Cursor (Timestamp)
    let lastRunTimestamp = 0;
    try {
        const storedTs = await AsyncStorage.getItem('last_sms_scan_timestamp');
        if (storedTs) {
            lastRunTimestamp = parseInt(storedTs, 10);
            console.log(`🕒 Last Scan Timestamp: ${new Date(lastRunTimestamp).toLocaleString()}`);
        }
    } catch (e) {
        console.log('⚠️ Error loading timestamp, defaulting to 0');
    }

    // 3. Scan Filter (Lookback 30 days max to be safe if timestamp is missing)
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - 30);

    // Use the LATER of (Now - 30 days) OR (Last Run Timestamp)
    // For manual sync, we always look back at least 24 hours to recover from stuck cursors
    let scanThreshold = Math.max(minDate.getTime(), lastRunTimestamp);

    if (!isBackground) {
        const forceLookback = new Date().getTime() - (24 * 60 * 60 * 1000);
        scanThreshold = Math.min(scanThreshold, forceLookback);
        console.log(`🔄 Manual Sync: Forcing 24h lookback. Threshold: ${new Date(scanThreshold).toLocaleString()}`);
    }

    const filter = {
        box: 'inbox',
        minDate: scanThreshold,
    };

    return new Promise((resolve) => {
        SmsAndroid.list(
            JSON.stringify(filter),
            fail => {
                console.log("❌ SMS Fetch Failed:", fail);
                resolve(false);
            },
            async (count, smsList) => {
                const messages = JSON.parse(smsList);
                console.log(`📨 Scanned ${messages.length} total messages from inbox since threshold.`);

                // Update Debug Timer in Redux
                store.dispatch(setLastSmsCheck(Date.now()));

                const validSenders = ['8810', '8812', 'BAHL', 'BankALHabib', 'AL-Habib'];

                // Filter for Valid Senders
                // Robust Check: endsWith + Case Insensitive to catch "AD-BAHL", "CM-8810", etc.
                const newFinanceMessages = messages.filter(m => {
                    const addressStr = (m.address || "").toUpperCase();
                    const isFinance = validSenders.some(s => addressStr.endsWith(s.toUpperCase()));

                    // Relaxed 'isNew' for manual sync: use scanThreshold instead of lastRunTimestamp
                    // This allows re-processing missed messages if parser was fixed.
                    const isNew = m.date > (isBackground ? lastRunTimestamp : scanThreshold);
                    return isFinance && isNew;
                });

                console.log(`🔍 Matches found: ${newFinanceMessages.length}`);

                if (newFinanceMessages.length === 0) {
                    console.log("✅ Up to date.");
                    if (!isBackground) {
                        // DEBUG: If no matches, show what senders WE DID see (Sender Probe)
                        const uniqueSenders = [...new Set(messages.map(m => m.address))].slice(0, 3);
                        const debugMsg = messages.length > 0
                            ? `Scanned ${messages.length} SMS. Found senders: [${uniqueSenders.join(', ')}]. No bank matches.`
                            : "No new SMS found in inbox.";
                        ToastAndroid.show(debugMsg, ToastAndroid.LONG);
                    }
                    resolve(null); // Return null instead of true to indicate "no new messages to process"
                    return;
                }

                // Sort by Date Ascending (Oldest First) to process in order
                newFinanceMessages.sort((a, b) => a.date - b.date);

                // Prepare Batch
                const batchPayload = newFinanceMessages.map(msg => ({
                    message: msg.body,
                    sender: msg.address,
                    id: msg._id,
                    date: msg.date
                }));

                // Send to Backend
                console.log(`🚀 Sending batch of ${batchPayload.length} messages...`);
                try {
                    const result = await store.dispatch(processSMSBatch(batchPayload)).unwrap();

                    if (result) {
                        console.log(`✅ Batch Synced: Created ${result.created}, Skipped ${result.skipped}, Failed ${result.failed}`);
                        if (result.errors && result.errors.length > 0) {
                            console.log('❌ Parsing Errors from Backend:', JSON.stringify(result.errors, null, 2));
                        }

                        // 4. Update Cursor to LATEST processed message timestamp
                        const latestMsgTimestamp = Math.max(...newFinanceMessages.map(m => m.date));
                        await AsyncStorage.setItem('last_sms_scan_timestamp', latestMsgTimestamp.toString());
                        console.log(`💾 Updated Last Scan Timestamp to: ${latestMsgTimestamp}`);

                        // 5. Refresh Balance
                        store.dispatch(fetchUserAccounts());

                        if (result.created > 0 && isBackground) {
                            await sendLocalNotification(
                                'New Transactions Synced',
                                `Added ${result.created} new transactions from SMS.`
                            );
                        }

                        resolve(result); // Return the actual result object
                    } else {
                        resolve(null);
                    }
                } catch (err) {
                    console.log('❌ Batch SMS Failed:', err);
                    if (!isBackground) ToastAndroid.show("Sync Failed.", ToastAndroid.SHORT);
                    resolve(null);
                }
            }
        );
    });
};
