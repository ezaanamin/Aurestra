
import { PermissionsAndroid, ToastAndroid } from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from '../API/store';
import { processSMSBatch, fetchUserAccounts } from '../API/slice/API';
import notifee, { AndroidImportance } from '@notifee/react-native';

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    VALID_SENDERS: ['8810', '8812', 'BAHL', 'BankALHabib', 'AL-Habib', '3737', 'Easypaisa', 'JazzCash'],
    SYNC_DAYS: 14, // Always sync last 14 days
    CHUNK_SIZE: 50, // Larger chunks since no local processing
};

// ============================================
// UTILITIES
// ============================================
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const isValidFinanceSender = (address) => {
    const addressStr = (address || "").toUpperCase();
    return CONFIG.VALID_SENDERS.some(sender => addressStr.endsWith(sender.toUpperCase()));
};

// ============================================
// NOTIFICATION
// ============================================
export const sendLocalNotification = async (title, message) => {
    try {
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
    } catch (error) {
        console.error('⚠️ [Notification] Failed to send:', error);
    }
};

// ============================================
// PERMISSIONS
// ============================================
export const requestSMSPermission = async () => {
    try {
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_SMS,
            {
                title: "SMS Permission",
                message: "App needs access to your SMS to track expenses.",
                buttonNeutral: "Ask Me Later",
                buttonNegative: "Cancel",
                buttonPositive: "OK"
            }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
        console.error('⚠️ [Permissions] Request failed:', err);
        return false;
    }
};

// ============================================
// BATCH PROCESSING (Stateless)
// ============================================
const processBatch = async (messages) => {
    // Convert to simple payload - include device SMS ID for deduplication
    const batchPayload = messages.map(msg => ({
        _id: msg._id,           // Device SMS ID (critical for deduplication)
        message: msg.body,
        sender: msg.address,
        date: msg.date
    }));

    const aggregateResult = {
        received: 0,
        inserted: 0,
        processed: 0,
        transactions_created: 0,
        duplicates_ignored: 0,
        errors: 0,
        transactions: [] // List of new transactions
    };

    // Send in chunks
    for (let i = 0; i < batchPayload.length; i += CONFIG.CHUNK_SIZE) {
        const chunk = batchPayload.slice(i, i + CONFIG.CHUNK_SIZE);
        const chunkIndex = Math.floor(i / CONFIG.CHUNK_SIZE) + 1;
        const totalChunks = Math.ceil(batchPayload.length / CONFIG.CHUNK_SIZE);

        console.log(`📦 [SMS Sync] Sending chunk ${chunkIndex}/${totalChunks} (${chunk.length} msgs)`);

        try {
            // Send to backend - Backend handles ALL deduplication
            const result = await store.dispatch(processSMSBatch(chunk)).unwrap();

            if (result) {
                if (result.received) aggregateResult.received += result.received;
                if (result.inserted) aggregateResult.inserted += result.inserted;
                if (result.processed) aggregateResult.processed += result.processed;
                if (result.transactions_created) aggregateResult.transactions_created += result.transactions_created;
                if (result.duplicates_ignored) aggregateResult.duplicates_ignored += result.duplicates_ignored;
                if (result.errors) aggregateResult.errors += result.errors;

                if (result.transactions && Array.isArray(result.transactions)) {
                    aggregateResult.transactions = [...aggregateResult.transactions, ...result.transactions];
                }
            }
        } catch (error) {
            console.error(`❌ [SMS Sync] Chunk ${chunkIndex} failed:`, error);
        }
    }

    // Map to UI Expected Format
    return {
        ...aggregateResult,
        created: aggregateResult.transactions_created, // UI uses 'created' for NEW transactions
        skipped: aggregateResult.duplicates_ignored,   // UI uses 'skipped' for duplicates
        failed: aggregateResult.errors                 // UI uses 'failed' for errors
    };
};

// ============================================
// MAIN SMS READING FUNCTION
// ============================================
export const readAllSMS = async (isBackground = false) => {
    console.log("🔄 [SMS Sync] Starting stateless sync (Last 14 Days)...")

    // 1. Check Permissions
    let hasPermission = false;
    if (isBackground) {
        hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
    } else {
        hasPermission = await requestSMSPermission();
    }

    if (!hasPermission) {
        console.log('⚠️ [SMS] No permission.');
        return;
    }

    // 2. Fetch Messages from Device (Last 14 Days)
    const filter = {
        box: 'inbox',
        minDate: Date.now() - (CONFIG.SYNC_DAYS * 24 * 60 * 60 * 1000),
    };

    return new Promise((resolve) => {
        SmsAndroid.list(
            JSON.stringify(filter),
            (fail) => {
                console.error('❌ [SMS] List failed:', fail);
                resolve({ error: "List Failed" });
            },
            async (count, smsList) => {
                try {
                    const messages = JSON.parse(smsList);

                    // 3. Filter for Relevant Senders ONLY (Optimization)
                    const financeMessages = messages.filter(m => isValidFinanceSender(m.address));

                    console.log(`📱 [SMS] Found ${messages.length} total, ${financeMessages.length} finance related.`);

                    if (financeMessages.length === 0) {
                        resolve({ total: 0 });
                        return;
                    }

                    // 4. Sort (Oldest first for logical processing order)
                    financeMessages.sort((a, b) => a.date - b.date);

                    // 5. Send to Backend
                    const results = await processBatch(financeMessages);

                    // Add UI-required fields to prevent rendering errors
                    results.totalFound = messages.length;

                    // UI Expects Newest First for lists, but we processed Oldest First (maybe)
                    // SmsAndroid.list usually returns Newest First.
                    // financeMessages was sorted by date (Ascending/Oldest First) in Step 4.

                    // Re-sort for UI (Newest First)
                    const uiFinanceMessages = [...financeMessages].sort((a, b) => b.date - a.date);

                    results.recentMessages = messages.slice(0, 20); // Raw list is usually Newest First
                    results.lastBankingMessages = uiFinanceMessages.slice(0, 5);
                    results.hasRecentBankingMessages = results.lastBankingMessages.length > 0;
                    results.scanFromDate = filter.minDate;

                    console.log("✅ [SMS Sync] Complete:", results);

                    // 6. Refresh Balance if new transactions created
                    if (results.transactions_created > 0) {
                        store.dispatch(fetchUserAccounts());

                        if (isBackground) {
                            sendLocalNotification(
                                'New Transactions',
                                `Synced ${results.transactions_created} new transactions.`
                            );
                        }
                    }

                    resolve(results);

                } catch (err) {
                    console.error('❌ [SMS] Processing error:', err);
                    resolve({ error: err.message });
                }
            }
        );
    });
};