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
        const permissionsToRequest = [
            PermissionsAndroid.PERMISSIONS.READ_SMS,
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        ];

        const granted = await PermissionsAndroid.requestMultiple(permissionsToRequest);

        const smsGranted = granted[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.GRANTED;
        const notifGranted = granted[PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS] === PermissionsAndroid.RESULTS.GRANTED;

        if (smsGranted) {
            return true;
        } else {
            return false;
        }
    } catch (err) {
        return false;
    }
};

// --------------------------------------------------
// Read ALL SMS Messages (once at startup or background)
// --------------------------------------------------
export const readAllSMS = async (isBackground = false) => {


    // Store the current check time
    const currentCheckTime = Date.now();

    // 1. Check Permissions
    let hasPermission = false;
    if (isBackground) {
        hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
        if (!hasPermission) {

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
        } else {
            // Fallback: If we have NO timestamp, try to find the LATEST banking message available in the inbox right now,
            // and start from there? No, that would skip history.
            // If no timestamp, we MUST scan back.
            // But maybe the user implies we should save the timestamp more aggressively?
        }
    } catch (e) {

    }

    // 3. Scan Filter
    // User Requirement: Start scan from last known timestamp.
    // User Requirement: Start scan from last known timestamp.
    // If NO timestamp (fresh install), default to Jan 24, 2026.
    // NOTE: This default is ONLY used for the very first sync. 
    // After the first run, the app saves the current time to AsyncStorage, so future syncs will be instant.
    const DEFAULT_START_DATE = new Date('2026-01-24T00:00:00').getTime();
    const scanThreshold = lastRunTimestamp > 0 ? lastRunTimestamp : DEFAULT_START_DATE;

    if (!isBackground) {

    }

    // Tell Android to only give us messages since that threshold
    // MODIFIED: Fetch last 14 days of messages regardless of sync time, so we can display the "Last Banking Message" correctly.
    // We will still only PROCESS messages newer than lastRunTimestamp.
    const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;
    const fetchThreshold = Date.now() - FOURTEEN_DAYS;

    const filter = {
        box: 'inbox',
        minDate: fetchThreshold,
    };

    return new Promise((resolve) => {
        SmsAndroid.list(
            JSON.stringify(filter),
            fail => {

                resolve({ error: "SMS List Failed: " + JSON.stringify(fail) });
            },
            async (count, smsList) => {
                const messages = JSON.parse(smsList);


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
                    // STRICT CHECK: Only process what is newer than our last success point
                    const isNew = m.date > (isBackground ? lastRunTimestamp : scanThreshold);
                    return isFinance && isNew;
                });



                // Get ALL finance messages for last banking message display
                const allFinanceMessages = messages.filter(m => {
                    const addressStr = (m.address || "").toUpperCase();
                    return validSenders.some(s => addressStr.endsWith(s.toUpperCase()));
                });

                // Find the most recent banking messages (last 5)
                // Restore recentBankingMessages for modal logic
                const oneHourAgo = Date.now() - (60 * 60 * 1000);
                const recentBankingMessages = allFinanceMessages.filter(m => m.date > oneHourAgo);

                // Strictly for DISPLAY (ignore sync timestamp)
                const lastBankingMessages = allFinanceMessages
                    .sort((a, b) => b.date - a.date)
                    .slice(0, 5); // Get last 5 banking messages


                // Get last 50 scanned messages for debugging UI
                const recentMessages = messages
                    .sort((a, b) => b.date - a.date) // Newest first
                    .slice(0, 50)
                    .map(m => {
                        const addressStr = (m.address || "").toUpperCase();
                        const isFinance = validSenders.some(s => addressStr.endsWith(s.toUpperCase()));
                        const isNew = m.date > (isBackground ? lastRunTimestamp : scanThreshold);

                        // Friendly Name Mapping
                        let displayName = m.address;
                        if (addressStr.endsWith('8810')) displayName = 'Easypaisa';
                        else if (addressStr.endsWith('8812')) displayName = 'JazzCash';
                        else if (addressStr.includes('BAHL') || addressStr.includes('HABIB')) displayName = 'Bank Al Habib';
                        else if (addressStr.endsWith('3737')) displayName = 'Easypaisa';

                        return {
                            address: displayName, // Use friendly name for UI
                            originalAddress: m.address,
                            body: m.body,
                            date: m.date,
                            status: (isFinance && isNew) ? 'READ' : 'NOT READ'
                        };
                    });

                if (newFinanceMessages.length === 0) {
                    // CRITICAL: Update timestamp so we don't re-scan this empty period next time!
                    await AsyncStorage.setItem('last_sms_scan_timestamp', currentCheckTime.toString());

                    if (!isBackground) {
                        // Return empty stats so UI can show "Up to Date" modal
                        resolve({
                            created: 0,
                            skipped: 0,
                            failed: 0,
                            total: 0,
                            recentMessages: recentMessages,
                            lastCheckTime: currentCheckTime,
                            lastBankingMessages: lastBankingMessages,
                            hasRecentBankingMessages: recentBankingMessages.length > 0,
                            scanFromDate: scanThreshold
                        });
                    } else {
                        resolve(null);
                    }
                    return;
                }

                // User requested limit: Latest 5 only to avoid Rate Limits
                newFinanceMessages.sort((a, b) => b.date - a.date); // Newest first
                if (newFinanceMessages.length > 5) {
                    newFinanceMessages = newFinanceMessages.slice(0, 5);
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
                const CHUNK_SIZE = 5;
                let aggregateResult = { created: 0, skipped: 0, failed: 0, transactions: [], errors: [] };



                // Helper for delay
                const wait = (ms) => new Promise(r => setTimeout(r, ms));

                try {
                    for (let i = 0; i < batchPayload.length; i += CHUNK_SIZE) {
                        const chunk = batchPayload.slice(i, i + CHUNK_SIZE);
                        const chunkIndex = Math.floor(i / CHUNK_SIZE) + 1;
                        const totalChunks = Math.ceil(batchPayload.length / CHUNK_SIZE);



                        let attempts = 0;
                        let success = false;

                        while (attempts < 3 && !success) {
                            try {


                                // Dispatch
                                const result = await store.dispatch(processSMSBatch(chunk)).unwrap();

                                if (result) {
                                    aggregateResult.created += (result.created || 0);
                                    aggregateResult.skipped += (result.skipped || 0);
                                    aggregateResult.failed += (result.failed || 0);
                                    if (result.transactions) aggregateResult.transactions.push(...result.transactions);
                                    if (result.errors) aggregateResult.errors.push(...result.errors);
                                }
                                success = true;

                            } catch (error) {
                                attempts++;
                                const errMsg = error?.message || error?.toString() || "";

                                if (errMsg.includes("Rate limit")) {

                                    await wait(10000 * attempts); // Exponential wait: 10s, 20s...
                                } else {

                                    await wait(2000);
                                }
                            }
                        }

                        if (!success) {

                            break;
                        }
                    }



                    // 4. Update Cursor to LATEST processed message timestamp
                    const latestMsgTimestamp = Math.max(...newFinanceMessages.map(m => m.date));
                    await AsyncStorage.setItem('last_sms_scan_timestamp', latestMsgTimestamp.toString());


                    // 5. Refresh Balance (Safely)
                    try {

                        store.dispatch(fetchUserAccounts()); // Don't await strictly or unwrap, let it run
                    } catch (e) {

                    }

                    if (aggregateResult.created > 0 && isBackground) {
                        await sendLocalNotification(
                            'New Transactions Synced',
                            `Added ${aggregateResult.created} new transactions from SMS.`
                        );
                    }

                    // Return whatever we managed to sync
                    resolve({
                        ...aggregateResult,
                        recentMessages,
                        lastCheckTime: currentCheckTime,
                        lastBankingMessages,
                        hasRecentBankingMessages: recentBankingMessages.length > 0,
                        scanFromDate: scanThreshold
                    });

                } catch (err) {
                    // This catches unexpected errors in the logic above

                    resolve({ error: "Batch Logic Failed: " + (err.message || err.toString()) });
                }
            }
        );
    });
};