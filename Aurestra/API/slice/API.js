import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from "../../API_URL"
import { ToastAndroid } from 'react-native';
// import { reset } from '../../navigation/RootNavigation'; // Avoiding circular dependency

// =======================================================
// AXIOS CONFIGURATION
// =======================================================

// Set default base URL
axios.defaults.baseURL = API_BASE_URL;

// Request Interceptor: Attach token and decryption key to all requests
axios.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const decryptionKey = await AsyncStorage.getItem('userDecryptionKey');
    if (decryptionKey) {
      config.headers['X-Decryption-Key'] = decryptionKey;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

import { reset } from '../../navigation/RootNavigation';

// Response Interceptor: Handle 401 errors (invalid/expired token)
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      
      const msg = error.response.data?.message || '';
      const code = error.response.data?.code || '';
      
      // Do not log the user out if the error is just a decryption key mismatch or missing key
      if (msg.toLowerCase().includes('decryption key') || code === 'KEY_NOT_CONFIGURED') {
        return Promise.reject(error);
      }

      // Clear all auth data
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('userDecryptionKey');

      // Show user-friendly message
      ToastAndroid.show('⚠️ Session expired. Please login again.', ToastAndroid.LONG);

      // Force navigation to login screen to prevent dashboard loop
      try { reset('Login'); } catch(e) {}
    }
    return Promise.reject(error);
  }
);

/** Metro console (__DEV__): wallet slug the backend stored on each transaction row. */
function logWalletAttributionBatch(context, rows) {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  if (!Array.isArray(rows) || rows.length === 0) return;
  for (const t of rows) {
    if (!t || typeof t !== 'object') continue;
    console.log(
      '[WALLET_ATTRIBUTION]',
      context,
      `id=${t.id}`,
      `type=${t.type || '?'}`,
      `amount=${t.amount != null ? t.amount : '?'}`,
      `wallet_slug=${t.account_balance_source != null && t.account_balance_source !== '' ? t.account_balance_source : '(none)'}`,
      `balance_applied=${String(t.balance_applied)}`,
      `sender=${String(t.sender || '').slice(0, 48)}`,
      `receiver=${String(t.receiver || '').slice(0, 48)}`,
      `txn_source=${t.source || '?'}`,
      `purpose=${String(t.purpose || '').slice(0, 40)}`,
    );
  }
}

export const registerDeviceToken = createAsyncThunk(
  'api/registerDeviceToken',
  async (token, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/register-device`, { token });
      return response.data;
    } catch (error) {
      console.error('registerDeviceToken error:', error.response || error.message);
      return rejectWithValue(error.response?.data?.message || 'Token registration failed');
    }
  }
);

export const checkBackendHealth = createAsyncThunk(
  'api/checkBackendHealth',
  async (_, { rejectWithValue }) => {
    try {
      // Simple ping to root or specific health endpoint
      const response = await axios.get(`${API_BASE_URL}/`);
      return response.data;
    } catch (error) {
      return rejectWithValue('Backend offline');
    }
  }
);

// =======================================================
// BACKUP THUNKS
// =======================================================

export const createBackup = createAsyncThunk(
  'api/createBackup',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/backup/create`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Backup creation failed');
    }
  }
);

export const listBackups = createAsyncThunk(
  'api/listBackups',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/backup/list`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch backups');
    }
  }
);

export const getLatestBackup = createAsyncThunk(
  'api/getLatestBackup',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/backup/latest`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch latest backup');
    }
  }
);

export const restoreBackup = createAsyncThunk(
  'api/restoreBackup',
  async ({ backupId, decryptionKey }, { rejectWithValue }) => {
    try {
      const headers = {};
      if (decryptionKey) {
        headers['X-Decryption-Key'] = decryptionKey;
      }
      const response = await axios.post(`${API_BASE_URL}/api/backup/restore/${backupId}`, {
        confirmed: true,
      }, { headers });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Restore failed'
      );
    }
  }
);


export const deleteBackup = createAsyncThunk(
  'api/deleteBackup',
  async ({ backupId }, { rejectWithValue }) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/backup/${backupId}`);
      return { backupId };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Delete failed');
    }
  }
);

// =======================================================
// AUTH THUNKS
// =======================================================


export const loginWithGoogle = createAsyncThunk(
  'api/loginWithGoogle',
  async ({ email, idToken }, { rejectWithValue, dispatch }) => {
    try {
      const url = `${API_BASE_URL}/api/auth/verify`;
      const response = await axios.post(url, { email, idToken });
      if (response.data.token) {
        // Clear stale local key if user changed or if backend has no key configured
        const storedUserData = await AsyncStorage.getItem('userData');
        if (storedUserData) {
          try {
            const parsed = JSON.parse(storedUserData);
            if (parsed.email !== email) {
              await AsyncStorage.removeItem('userDecryptionKey');
            }
          } catch (e) {}
        }
        if (!response.data.user?.has_decryption_key) {
          await AsyncStorage.removeItem('userDecryptionKey');
        }

        await AsyncStorage.setItem('userToken', response.data.token);
        dispatch(fetchUserAccounts());
        dispatch(fetchLatestTransactions(4));
        dispatch(fetchBudget());
        dispatch(fetchCategories());
      }
      return response.data;
    } catch (error) {
      console.error('❌ [Auth Verify] Failed Raw Error:', JSON.stringify(error, null, 2));
      console.error('❌ [Auth Verify] Error Message:', error.message);
      console.error('❌ [Auth Verify] Response Status:', error.response?.status);
      console.error('❌ [Auth Verify] Response Data:', error.response?.data);

      const message = error.response?.data?.message || error.message || 'Google Login failed';
      const status = error.response?.status ? ` (Status: ${error.response.status})` : '';
      return rejectWithValue(`${message}${status}`);
    }
  }
);
export const registerWithEmail = createAsyncThunk(
  'api/registerWithEmail',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, userData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed');
    }
  }
);

export const loginWithEmail = createAsyncThunk(
  'api/loginWithEmail',
  async (credentials, { rejectWithValue, dispatch }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, credentials);
      if (response.data.token) {
        // Clear stale local key if user changed or if backend has no key configured
        const email = credentials.email?.trim().lower();
        const storedUserData = await AsyncStorage.getItem('userData');
        if (storedUserData) {
          try {
            const parsed = JSON.parse(storedUserData);
            if (parsed.email !== email) {
              await AsyncStorage.removeItem('userDecryptionKey');
            }
          } catch (e) {}
        }
        if (!response.data.user?.has_decryption_key) {
          await AsyncStorage.removeItem('userDecryptionKey');
        }

        await AsyncStorage.setItem('userToken', response.data.token);
        dispatch(fetchUserAccounts());
        dispatch(fetchLatestTransactions(4));
        dispatch(fetchBudget());
        dispatch(fetchCategories());
      }
      return response.data;
    } catch (error) {
      if (error.response?.data?.requires_verification) {
        return rejectWithValue(error.response.data);
      }
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'api/logoutUser',
  async (_, { dispatch }) => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
    await AsyncStorage.removeItem('userDecryptionKey');
    dispatch(logout()); // clear state
    return true;
  }
);

export const verifyEmail = createAsyncThunk(
  'api/verifyEmail',
  async (token, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/verify-email`, { token });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Verification failed');
    }
  }
);

export const resendVerification = createAsyncThunk(
  'api/resendVerification',
  async (email, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/resend-verification`, { email });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to resend verification');
    }
  }
);

export const forgotPassword = createAsyncThunk(
  'api/forgotPassword',
  async (email, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/forgot-password`, { email });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Password reset request failed');
    }
  }
);

export const resetPassword = createAsyncThunk(
  'api/resetPassword',
  async ({ token, newPassword }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/reset-password`, { token, new_password: newPassword });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Password reset failed');
    }
  }
);

export const fetchUserProfile = createAsyncThunk(
  'api/fetchUserProfile',
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/profile`);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Fetch profile failed');
    }
  }
);

// =======================================================
// BUDGET ASYNC THUNKS
// =======================================================

export const fetchBudget = createAsyncThunk(
  'api/fetchBudget',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/budget`);
      return response.data;
    } catch (error) {
      const message = error?.response?.data?.message || error.message;
      if (error.response && error.response.status === 404) {
        return null;
      }
      console.error('fetchBudget error:', message);
      return rejectWithValue(message || 'Unknown error fetching budget');
    }
  }
);

export const saveBudget = createAsyncThunk(
  'api/saveBudget',
  async (budgetData, { rejectWithValue }) => {

    try {
      if (typeof budgetData.income !== 'number' || budgetData.income <= 0) {
        console.error('Validation Error: Income must be a positive number.', budgetData.income);
        return rejectWithValue('Income must be a positive number.');
      }

      const payload = budgetData;
      const response = await axios.post(`${API_BASE_URL}/api/budget`, payload);
      return response.data;
    } catch (error) {
      console.error('saveBudget error:', error.response || error.message);
      const errorMessage =
        error?.response?.data?.message ||
        error.message ||
        'Unknown error saving budget';
      return rejectWithValue(errorMessage);
    }
  }
);

export const setSalary = createAsyncThunk(
  'api/setSalary',
  async (amount, { rejectWithValue, dispatch }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/set_salary`, { amount });
      // Refresh budget after setting salary
      dispatch(fetchBudget());
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to set salary');
    }
  }
);

// =======================================================
// SUMMARY ASYNC THUNKS
// =======================================================

export const fetchMonthlySummary = createAsyncThunk(
  'api/fetchMonthlySummary',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/monthly-summary`);
      const dataArray = Array.isArray(response.data) ? response.data : [response.data];

      const formatted = dataArray.map((summary) => {
        const fetched_at_str = summary.fetched_at
          ? new Date(summary.fetched_at).toLocaleString()
          : null;
        return {
          month: summary.month,
          opening_balance: summary.opening_balance,
          closing_balance: summary.closing_balance,
          // Backend returns 'total_expense', 'total_income', 'total_savings'
          total_expense: summary.total_expense,
          total_income: summary.total_income,
          total_savings: summary.total_savings,

          // Map to legacy keys if components use them
          expense: summary.total_expense,
          savings: summary.total_savings,

          fetched_at: fetched_at_str,
        };
      });

      return formatted;
    } catch (error) {
      console.error('fetchMonthlySummary error:', error.response || error.message);
      return rejectWithValue(
        error?.response?.data || error.message || 'Unknown error fetching monthly summary'
      );
    }
  }
);

export const calculateMonthlySummary = createAsyncThunk(
  'api/calculateMonthlySummary',
  async (_, { rejectWithValue, getState }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/reports/statement/calculate`, {});
      return response.data;
    } catch (error) {
      console.error('calculateMonthlySummary error:', error.response || error.message);
      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error.message ||
        'Unknown error calculating summary';
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchFourMonthHistory = createAsyncThunk(
  'api/fetchFourMonthHistory',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/budget/history`);
      return response.data;
    } catch (error) {
      console.error('fetchFourMonthHistory error:', error.response || error.message);
      const errorMessage =
        error?.response?.data?.message ||
        error.message ||
        'Failed to fetch budget history';
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchTrendHistory = createAsyncThunk(
  'api/fetchTrendHistory',
  async (period = 'month', { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/analytics/trend?period=${period}`);
      return response.data;
    } catch (error) {
      console.error('fetchTrendHistory error:', error.response || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch trend history');
    }
  }
);

// =======================================================
// REPORTS ASYNC THUNKS
// =======================================================

export const fetchStatementReport = createAsyncThunk(
  'api/fetchStatementReport',
  async (month = null, { rejectWithValue }) => {
    try {
      // month format: YYYY-MM or null
      const response = await axios.post(`${API_BASE_URL}/api/reports/statement`, { month });
      return response.data;
    } catch (error) {
      const message = error?.response?.data?.message || error?.response?.data?.error || error.message;
      return rejectWithValue(message);
    }
  }
);


export const calculatePreviousStatement = createAsyncThunk(
  'api/calculatePreviousStatement',
  async (params, { rejectWithValue }) => {
    try {
      const payload = typeof params === 'string' ? { month: params } : params;
      const response = await axios.post(`${API_BASE_URL}/api/reports/statement/calculate`, payload);
      return response.data;
    } catch (error) {
      const message = error?.response?.data?.message || error?.response?.data?.error || error.message;
      return rejectWithValue(message);
    }
  }
);


export const markStatementRead = createAsyncThunk(
  'api/markStatementRead',
  async (monthStr, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/reports/statement/mark-read`, { month: monthStr });
      return response.data;
    } catch (error) {
      const message = error?.response?.data?.message || error?.response?.data?.error || error.message;
      return rejectWithValue(message);
    }
  }
);


// =======================================================
// TRANSACTIONS ASYNC THUNKS
// =======================================================

export const uploadReceipt = createAsyncThunk(
  'api/uploadReceipt',
  async (imageUri, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'receipt.jpg',
      });
      
      const response = await axios.post(`${API_BASE_URL}/api/transactions/upload-receipt`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error ||
          error.response?.data?.message ||
          'Failed to upload receipt'
      );
    }
  }
);


export const fetchLatestTransactions = createAsyncThunk(
  'api/fetchLatestTransactions',
  async (limit = 4, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/latest-transactions?limit=${limit}`);
      const data = response.data;
      logWalletAttributionBatch('fetchLatestTransactions', Array.isArray(data) ? data : []);
      return data;
    } catch (error) {
      const message = error?.response?.data?.message || error.message;
      console.error('fetchLatestTransactions error:', message);
      return rejectWithValue(message);
    }
  }
);

export const fetchAllTransactions = createAsyncThunk(
  'api/fetchAllTransactions',
  async (_, { rejectWithValue }) => {
    try {
      // Use a large limit to fetch all. Ideally backend should support limit=-1 or similar.
      const response = await axios.get(`${API_BASE_URL}/api/latest-transactions?limit=1000`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch transactions');
    }
  }
);

export const updateTransaction = createAsyncThunk(
  'api/updateTransaction',
  async ({ id, data }, { rejectWithValue, dispatch }) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/transactions/${id}`, data);
      dispatch(fetchLatestTransactions(4));
      dispatch(fetchTopSpendingCategories());
      dispatch(fetchUserAccounts());
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update transaction');
    }
  }
);

export const createTransaction = createAsyncThunk(
  'api/createTransaction',
  async (txData, { rejectWithValue, dispatch }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/transactions`, txData);
      dispatch(fetchLatestTransactions(50));
      dispatch(fetchTopSpendingCategories());
      dispatch(fetchTotalExpenses());
      dispatch(fetchTrendHistory());
      dispatch(fetchUserAccounts());
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error ||
          error.response?.data?.message ||
          'Failed to create transaction',
      );
    }
  }
);

export const fetchTopSpendingCategories = createAsyncThunk(
  'api/fetchTopSpendingCategories',
  async (period = 'month', { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/transactions/top-categories?period=${period}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch categories');
    }
  }
);

export const deleteTransaction = createAsyncThunk(
  'api/deleteTransaction',
  async (txnId, { rejectWithValue, dispatch }) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/transactions/${txnId}`);
      // Refresh relevant data
      dispatch(fetchLatestTransactions());
      dispatch(fetchTopSpendingCategories());
      dispatch(fetchUncategorizedTransactions());
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete transaction');
    }
  }
);

export const markAsSpam = createAsyncThunk(
  'api/markAsSpam',
  async (txnId, { rejectWithValue, dispatch }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/transactions/${txnId}/spam`);
      // Refresh relevant data
      dispatch(fetchLatestTransactions());
      dispatch(fetchTopSpendingCategories());
      dispatch(fetchUncategorizedTransactions());
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to mark as spam');
    }
  }
);

export const bulkDeleteTransactions = createAsyncThunk(
  'api/bulkDeleteTransactions',
  async ({ transaction_ids }, { rejectWithValue, dispatch }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/transactions/bulk-delete`, { transaction_ids });
      dispatch(fetchUncategorizedTransactions());
      dispatch(fetchLatestTransactions());
      dispatch(fetchTopSpendingCategories());
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to bulk delete');
    }
  }
);

export const bulkMarkAsSpam = createAsyncThunk(
  'api/bulkMarkAsSpam',
  async ({ transaction_ids }, { rejectWithValue, dispatch }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/transactions/bulk-spam`, { transaction_ids });
      dispatch(fetchUncategorizedTransactions());
      dispatch(fetchLatestTransactions());
      dispatch(fetchTopSpendingCategories());
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to bulk mark as spam');
    }
  }
);

export const fetchSpamTransactions = createAsyncThunk(
  'api/fetchSpamTransactions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/transactions/spam`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch spam transactions');
    }
  }
);

// =======================================================
// CATEGORIES ASYNC THUNKS
// =======================================================

export const fetchCategories = createAsyncThunk(
  'api/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/categories`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch categories');
    }
  }
);

export const addCategory = createAsyncThunk(
  'api/addCategory',
  async (data, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/categories`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add category');
    }
  }
);

export const updateCategory = createAsyncThunk(
  'api/updateCategory',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/categories/${id}`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update category');
    }
  }
);

export const deleteCategory = createAsyncThunk(
  'api/deleteCategory',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/categories/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete category');
    }
  }
);

// =======================================================
// SMS ASYNC THUNKS (NEW)
// =======================================================

export const ingestDeviceNotification = createAsyncThunk(
  'api/ingestDeviceNotification',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/notifications/ingest`, payload);
      const d = response.data;
      if (typeof __DEV__ !== 'undefined' && __DEV__ && d) {
        console.log('[WALLET_ATTRIBUTION]', 'NOTIF_INGEST_RESPONSE', {
          transaction_id: d.transaction_id,
          parsed_transaction: d.parsed_transaction,
          hint: 'Open uncategorized / latest list — each txn logs wallet_slug from API',
        });
      }
      return d;
    } catch (error) {
      const errorMessage = error?.response?.data?.error ||
        error?.response?.data?.message ||
        error.message;
      console.error('ingestDeviceNotification error:', errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Process a bank SMS and create transaction
 * @param {object} smsData - { message: string, sender?: string }
 */
export const processSMS = createAsyncThunk(
  'api/processSMS',
  async (smsData, { rejectWithValue }) => {
    try {
      const { message, sender = 'BAHL' } = smsData;

      if (!message || message.trim().length < 10) {
        return rejectWithValue('Invalid SMS message');
      }

      const response = await axios.post(`${API_BASE_URL}/api/sms/process`, {
        message,
        sender
      });

      return response.data; // { status, message, transaction }
    } catch (error) {
      const errorMessage = error?.response?.data?.message ||
        error?.response?.data?.error ||
        error.message;
      console.error('processSMS error:', errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Process multiple SMS messages in a batch
 * @param {Array} messages - Array of { message: string, sender: string }
 */
export const processSMSBatch = createAsyncThunk(
  'api/processSMSBatch',
  async (messages, { rejectWithValue }) => {
    try {
      if (!messages || messages.length === 0) {
        return rejectWithValue('No messages to process');
      }


      const response = await axios.post(`${API_BASE_URL}/api/sms/batch`, {
        messages
      });


      return response.data; // { created, skipped, failed, transactions, errors }
    } catch (error) {
      const errorMessage = error?.response?.data?.message ||
        error?.response?.data?.error ||
        error.message;
      console.error('processSMSBatch error:', errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchFinancialInsight = createAsyncThunk(
  'api/fetchFinancialInsight',
  async (month = null, { rejectWithValue }) => {
    try {
      const url = month ? `${API_BASE_URL}/api/insights?month=${month}` : `${API_BASE_URL}/api/insights`;

      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null; // No insight found is fine
      }
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch insight');
    }
  }
);

/**
 * Test SMS parsing without saving to database
 * @param {object} smsData - { message: string, sender?: string }
 */
export const testSMSParsing = createAsyncThunk(
  'api/testSMSParsing',
  async (smsData, { rejectWithValue }) => {
    try {
      const { message, sender = 'BAHL' } = smsData;

      if (!message || message.trim().length < 10) {
        return rejectWithValue('Invalid SMS message');
      }

      const response = await axios.post(`${API_BASE_URL}/api/sms/test`, {
        message,
        sender
      });

      return response.data; // { status, message, parsed_data }
    } catch (error) {
      const errorMessage = error?.response?.data?.message ||
        error?.response?.data?.error ||
        error.message;
      console.error('testSMSParsing error:', errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Process multiple SMS messages in batch
 * @param {array} messages - Array of { message: string, sender?: string } objects
 */
export const processBatchSMS = createAsyncThunk(
  'api/processBatchSMS',
  async (messages, { rejectWithValue }) => {
    try {
      if (!Array.isArray(messages) || messages.length === 0) {
        return rejectWithValue('Messages array is required and must not be empty');
      }

      if (messages.length > 50) {
        return rejectWithValue('Maximum 50 messages per batch');
      }

      const response = await axios.post(`${API_BASE_URL}/api/sms/batch`, {
        messages
      });

      return response.data; // { total, created, skipped, failed, transactions, errors }
    } catch (error) {
      const errorMessage = error?.response?.data?.message ||
        error?.response?.data?.error ||
        error.message;
      console.error('processBatchSMS error:', errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);


// =======================================================
// INITIAL STATE
// =======================================================

// =======================================================
// ACCOUNTS ASYNC THUNKS
// =======================================================

export const fetchUserAccounts = createAsyncThunk(
  'api/fetchUserAccounts',
  async (arg, { rejectWithValue }) => {
    try {
      const sync =
        arg === true ||
        (arg &&
          typeof arg === 'object' &&
          (arg.syncStatement === true || arg.sync_bank_email === true));
      const qs = sync ? '?sync_statement=1' : '';
      const response = await axios.get(`${API_BASE_URL}/api/accounts${qs}`);
      return response.data;
    } catch (error) {
      console.error('fetchAccounts error:', error.message);
      // Return empty array on error to prevent mapping crash
      return rejectWithValue(error.message);
    }
  }
);

// =======================================================
// SAVINGS GOALS ASYNC THUNKS
// =======================================================

export const fetchSavingsGoals = createAsyncThunk(
  'api/fetchSavingsGoals',
  async (_, { rejectWithValue }) => {
    try {
      // Assuming endpoint is /api/savings-goals
      const response = await axios.get(`${API_BASE_URL}/api/savings-goals`);
      return response.data;
    } catch (error) {
      // Return empty array or null
      return rejectWithValue(error.message);
    }
  }
);

export const createSavingsGoal = createAsyncThunk(
  'api/createSavingsGoal',
  async (goalData, { rejectWithValue, dispatch }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/savings-goals`, goalData);
      // Refresh list
      dispatch(fetchSavingsGoals());
      // Refresh user accounts (TOTAL BALANCE UPDATE)
      dispatch(fetchUserAccounts());
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create goal');
    }
  }
);

export const updateSavingsGoal = createAsyncThunk(
  'api/updateSavingsGoal',
  async ({ id, data }, { rejectWithValue, dispatch }) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/savings-goals/${id}`, data);
      dispatch(fetchSavingsGoals());
      dispatch(fetchUserAccounts());
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update goal');
    }
  }
);

export const deleteSavingsGoal = createAsyncThunk(
  'api/deleteSavingsGoal',
  async (id, { rejectWithValue, dispatch }) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/savings-goals/${id}`);
      dispatch(fetchSavingsGoals());
      dispatch(fetchUserAccounts());
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete goal');
    }
  }
);

export const contributeToSavingsGoal = createAsyncThunk(
  'api/contributeToSavingsGoal',
  async ({ id, amount }, { rejectWithValue, dispatch }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/savings-goals/${id}/contribute`, { amount });
      dispatch(fetchSavingsGoals());
      dispatch(fetchUserAccounts());
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to contribute to goal');
    }
  }
);

// Alias or new Thunk for fetchCurrentSummary matching fetchMonthlySummary
export const fetchCurrentSummary = createAsyncThunk(
  'api/fetchCurrentSummary',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/monthly-summary`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchTotalExpenses = createAsyncThunk(
  'api/fetchTotalExpenses',
  async (_, { rejectWithValue }) => {
    try {
      // Calls the dedicated expense endpoint
      const response = await axios.get(`${API_BASE_URL}/api/expenses/total`);
      // return { total_expense: 1234, month: ... }
      return response.data;
    } catch (error) {
      console.error('fetchTotalExpenses error:', error.message);
      return rejectWithValue(error.message);
    }
  }
);

// =======================================================
// MANUAL BALANCE ASYNC THUNK
// =======================================================

export const setManualBalance = createAsyncThunk(
  'api/setManualBalance',
  async ({ amount, source = 'bank', account_id }, { rejectWithValue, dispatch }) => {
    try {
      const body = { amount };
      if (account_id != null) body.account_id = account_id;
      else body.source = source;
      const response = await axios.post(`${API_BASE_URL}/api/accounts/set_balance`, body);

      await dispatch(fetchUserAccounts()).unwrap();

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          'Failed to set balance',
      );
    }
  }
);

export const createFinancialAccount = createAsyncThunk(
  'api/createFinancialAccount',
  async (payload, { rejectWithValue, dispatch }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/accounts`, payload);
      await dispatch(fetchUserAccounts()).unwrap();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const updateFinancialAccount = createAsyncThunk(
  'api/updateFinancialAccount',
  async ({ id, ...data }, { rejectWithValue, dispatch }) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/accounts/${Number(id)}`, data);
      await dispatch(fetchUserAccounts()).unwrap();
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          'Update failed',
      );
    }
  }
);

export const deleteFinancialAccount = createAsyncThunk(
  'api/deleteFinancialAccount',
  async (id, { rejectWithValue, dispatch }) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/accounts/${Number(id)}`);
      await dispatch(fetchUserAccounts()).unwrap();
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          'Delete failed',
      );
    }
  }
);

/** POST { title, text, packageName } → { match: account dict | null } */
export const matchNotificationToAccount = createAsyncThunk(
  'api/matchNotificationToAccount',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/accounts/match`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

// =======================================================
// TRANSACTION CATEGORIZATION THUNKS (NEW)
// =======================================================

export const fetchUncategorizedTransactions = createAsyncThunk(
  'api/fetchUncategorizedTransactions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/transactions/uncategorized`);
      const data = response.data;
      logWalletAttributionBatch(
        'fetchUncategorizedTransactions',
        (data && data.transactions) || [],
      );
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch uncategorized transactions');
    }
  }
);

export const bulkCategorizeTransactions = createAsyncThunk(
  'api/bulkCategorizeTransactions',
  async ({ transaction_ids, category_id }, { rejectWithValue, dispatch }) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/transactions/bulk-categorize`,
        { transaction_ids, category_id }
      );

      dispatch(fetchUncategorizedTransactions());
      dispatch(fetchLatestTransactions(50));
      dispatch(fetchUserAccounts());

      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Bulk update failed');
    }
  }
);

export const getSuggestedCategory = createAsyncThunk(
  'api/getSuggestedCategory',
  async (merchant, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/categories/suggest?merchant=${encodeURIComponent(merchant)}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchCategorizationRules = createAsyncThunk(
  'api/fetchCategorizationRules',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/categorization-rules`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch rules');
    }
  }
);

export const triggerManualBackup = createAsyncThunk(
  'api/triggerManualBackup',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/backup/trigger`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Backup failed');
    }
  }
);

export const createCategorizationRule = createAsyncThunk(
  'api/createCategorizationRule',
  async ({ merchant_pattern, category_id }, { rejectWithValue, dispatch }) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/categorization-rules`,
        { merchant_pattern, category_id }
      );

      dispatch(fetchCategorizationRules());

      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create rule');
    }
  }
);

export const deleteCategorizationRule = createAsyncThunk(
  'api/deleteCategorizationRule',
  async (ruleId, { rejectWithValue, dispatch }) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/categorization-rules/${ruleId}`);

      dispatch(fetchCategorizationRules());

      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete rule');
    }
  }
);

// =======================================================
// INITIAL STATE
// =======================================================

const initialState = {
  // Auth
  token: null,
  user: null, // {id, full_name, email}
  authStatus: 'idle', // idle, otp_sent, authenticated
  authError: null,

  summaries: [],
  status: 'idle',
  error: null,

  // Current Summary (for HomeScreen)
  currentSummary: null,
  summaryStatus: 'idle',
  summaryError: null,

  // Accounts
  accounts: [],
  accountsStatus: 'idle',
  accountsError: null,

  // Savings Goals
  savingsGoals: [],
  goalsStatus: 'idle',
  goalsError: null,

  // Transaction Categorization (NEW)
  uncategorizedTransactions: [],
  uncategorizedCount: 0,
  uncategorizedStatus: 'idle',
  uncategorizedError: null,

  categorizationRules: [],
  rulesStatus: 'idle',
  rulesError: null,

  categorysuggestion: null,
  suggestionStatus: 'idle',

  bulkEditMode: false,
  selectedTransactionIds: [],

  // Transactions
  latestTransactions: [],
  transactionsStatus: 'idle',
  transactionsError: null,

  topCategories: null,
  topCategoriesStatus: 'idle',
  topCategoriesError: null,

  // Categories
  categories: [],
  categoriesStatus: 'idle',
  categoriesError: null,

  // Budget
  budget: null,
  totalExpenses: 0,
  budgetStatus: 'idle',
  budgetSaveStatus: 'idle',
  budgetError: null,

  // History
  fourMonthHistory: [],
  trendHistory: [],
  historyStatus: 'idle',
  historyError: null,

  // SMS Processing (NEW)
  smsProcessing: false,
  smsResult: null,
  smsError: null,

  // SMS Test (NEW)
  smsTesting: false,
  smsTestResult: null,
  smsTestError: null,

  // SMS Batch (NEW)
  smsBatchProcessing: false,
  smsBatchResult: null,
  smsBatchError: null,

  lastSmsCheck: null, // New field for debug timer

  // Global Server Status
  serverStatus: 'online', // 'online' | 'offline'

  // Spam Transactions (NEW)
  spamTransactions: [],
  spamTransactionsStatus: 'idle',
  spamTransactionsError: null,
};

// =======================================================
// SLICE
// =======================================================

const APISlice = createSlice({
  name: 'API',
  initialState,
  reducers: {
    clearBudgetSaveStatus: (state) => {
      state.budgetSaveStatus = 'idle';
      state.budgetError = null;
    },

    // Clear SMS results (NEW)
    clearSMSResult: (state) => {
      state.smsResult = null;
      state.smsError = null;
      state.smsProcessing = false;
    },

    clearSMSTestResult: (state) => {
      state.smsTestResult = null;
      state.smsTestError = null;
      state.smsTesting = false;
    },

    clearSMSBatchResult: (state) => {
      state.smsBatchProcessing = false;
      state.smsBatchError = null;
    },

    setLastSmsCheck: (state, action) => {
      state.lastSmsCheck = action.payload;
    },

    clearSMSBatchResult: (state) => {
      state.smsBatchResult = null;
      state.smsBatchError = null;
      state.smsBatchProcessing = false;
    },

    // Logout Action
    logout: (state) => {
      return initialState;
    }
  },
  extraReducers: (builder) => {
    builder
      // --- fetchUserAccounts ---
      .addCase(fetchUserAccounts.pending, (state) => {
        state.accountsStatus = 'loading';
        state.accountsError = null;
      })
      .addCase(fetchUserAccounts.fulfilled, (state, action) => {
        state.accountsStatus = 'succeeded';
        state.accounts = action.payload;
      })
      .addCase(fetchUserAccounts.rejected, (state, action) => {
        state.accountsStatus = 'failed';
        state.accountsError = action.payload;
        // Fallback for demo/dev
        state.accounts = [
          {
            id: 1,
            source: 'bank',
            display_name: 'Bank Account',
            holder_name: '',
            account_kind: 'bank',
            kind_label: 'BANK ACCOUNT',
            balance: 0,
            accent_color: '#A855F7',
            sort_order: 0,
            match_keywords: [],
          },
        ];
      })

      // --- setManualBalance ---
      .addCase(setManualBalance.pending, (state) => {
        state.accountsStatus = 'loading';
      })
      .addCase(setManualBalance.fulfilled, (state, action) => {
        state.accountsStatus = 'succeeded';
        // Accounts will be refreshed by fetchUserAccounts dispatch
      })
      .addCase(setManualBalance.rejected, (state, action) => {
        state.accountsStatus = 'failed';
        state.accountsError = action.payload;
      })

      // --- fetchSavingsGoals ---
      .addCase(fetchSavingsGoals.pending, (state) => {
        state.goalsStatus = 'loading';
        state.goalsError = null;
      })
      .addCase(fetchSavingsGoals.fulfilled, (state, action) => {
        state.goalsStatus = 'succeeded';
        state.savingsGoals = action.payload;
      })
      .addCase(fetchSavingsGoals.rejected, (state, action) => {
        state.goalsStatus = 'failed';
        state.goalsError = action.payload;
        state.savingsGoals = [];
      })
      .addCase(createSavingsGoal.fulfilled, (state, action) => {
        state.goalsStatus = 'succeeded';
        state.savingsGoals.push(action.payload);
      })
      .addCase(updateSavingsGoal.fulfilled, (state, action) => {
        state.goalsStatus = 'succeeded';
        const index = state.savingsGoals.findIndex(g => g.id === action.payload.id);
        if (index !== -1) {
          state.savingsGoals[index] = action.payload;
        }
      })
      .addCase(deleteSavingsGoal.fulfilled, (state, action) => {
        state.goalsStatus = 'succeeded';
        state.savingsGoals = state.savingsGoals.filter(g => g.id !== action.payload);
      })

      // Categories Actions
      .addCase(fetchCategories.pending, (state) => {
        state.categoriesStatus = 'loading';
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categoriesStatus = 'succeeded';
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.categoriesStatus = 'failed';
        state.categoriesError = action.payload;
      })
      .addCase(addCategory.fulfilled, (state, action) => {
        state.categories.push(action.payload);
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        const index = state.categories.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.categories[index] = action.payload;
        }
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.categories = state.categories.filter(c => c.id !== action.payload);
      })
      .addCase(contributeToSavingsGoal.fulfilled, (state, action) => {
        state.goalsStatus = 'succeeded';
        const index = state.savingsGoals.findIndex(g => g.id === action.payload.id);
        if (index !== -1) {
          state.savingsGoals[index] = action.payload;
        }
      })

      // --- fetchCurrentSummary ---
      .addCase(fetchCurrentSummary.pending, (state) => {
        state.summaryStatus = 'loading';
        state.summaryError = null;
      })
      .addCase(fetchCurrentSummary.fulfilled, (state, action) => {
        state.summaryStatus = 'succeeded';

        state.currentSummary = action.payload;
      })
      .addCase(fetchCurrentSummary.rejected, (state, action) => {
        state.summaryStatus = 'failed';
        state.summaryError = action.payload;
        // Fallback
        // Fallback
        state.currentSummary = {
          total_income: 0,
          total_expense: 0,
          total_savings: 0,
          opening_balance: 0,
          closing_balance: 0
        };
      })

      // --- fetchMonthlySummary ---
      .addCase(fetchMonthlySummary.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchMonthlySummary.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.summaries = action.payload;
        state.error = null;
      })
      .addCase(fetchMonthlySummary.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // --- calculateMonthlySummary ---
      .addCase(calculateMonthlySummary.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(calculateMonthlySummary.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentSummary = action.payload; // Update with fresh data
        const { message } = action.payload;
        state.error = {
          type: 'success',
          message: message || 'Summary calculated successfully.'
        };
      })
      .addCase(calculateMonthlySummary.rejected, (state, action) => {
        state.status = 'failed';
        state.error = {
          type: 'error',
          message: action.payload || 'Calculation failed due to an unknown error.'
        };
      })

      // --- fetchBudget ---
      .addCase(fetchBudget.pending, (state) => {
        state.budgetStatus = 'loading';
        state.budgetError = null;
        state.budget = null;
      })
      .addCase(fetchBudget.fulfilled, (state, action) => {
        state.budgetStatus = 'succeeded';
        state.budget = action.payload;
        state.budgetError = null;
      })
      .addCase(fetchBudget.rejected, (state, action) => {
        state.budgetStatus = 'failed';
        state.budgetError = action.payload;
        state.budget = null;
        // Fallback or empty object if needed
      })

      // --- saveBudget ---
      .addCase(saveBudget.pending, (state) => {
        state.budgetSaveStatus = 'saving';
        state.budgetError = null;
      })
      .addCase(saveBudget.fulfilled, (state, action) => {
        state.budgetSaveStatus = 'success';
        state.budget = action.payload;
        state.budgetError = {
          type: 'success',
          message: action.payload.message || 'Budget saved successfully!'
        };
      })
      .addCase(saveBudget.rejected, (state, action) => {
        state.budgetSaveStatus = 'failed';
        state.budgetError = action.payload;
      })




      // --- fetchFourMonthHistory ---
      .addCase(fetchFourMonthHistory.pending, (state) => {
        state.historyStatus = 'loading';
        state.historyError = null;
        state.fourMonthHistory = [];
      })
      .addCase(fetchFourMonthHistory.fulfilled, (state, action) => {
        state.historyStatus = 'succeeded';
        state.fourMonthHistory = action.payload;
      })
      .addCase(fetchFourMonthHistory.rejected, (state, action) => {
        state.historyStatus = 'failed';
        state.historyError = action.payload;
        state.fourMonthHistory = [];
      })

      // --- fetchTrendHistory ---
      .addCase(fetchTrendHistory.pending, (state) => {
        state.historyStatus = 'loading';
        state.historyError = null;
      })
      .addCase(fetchTrendHistory.fulfilled, (state, action) => {
        state.historyStatus = 'succeeded';
        state.trendHistory = action.payload || [];
      })
      .addCase(fetchTrendHistory.rejected, (state, action) => {
        state.historyStatus = 'failed';
        state.historyError = action.payload;
      })

      // --- fetchTotalExpenses (NEW) ---
      .addCase(fetchTotalExpenses.pending, (state) => {
        // Optionally set a status
      })
      .addCase(fetchTotalExpenses.fulfilled, (state, action) => {
        state.totalExpenses = action.payload.total_expense || 0;

      })
      .addCase(fetchTotalExpenses.rejected, (state, action) => {
        console.error("❌ Failed to fetch total expenses:", action.payload);
        // Do not zero it out blindly if we want persistence, 
        // but user asked for real-time. 0 is safer than stale if error is authentic.
        state.totalExpenses = 0;
      })

      // --- fetchLatestTransactions ---
      .addCase(fetchLatestTransactions.pending, (state) => {
        state.transactionsStatus = 'loading';
        state.transactionsError = null;
      })
      .addCase(fetchLatestTransactions.fulfilled, (state, action) => {
        state.transactionsStatus = 'succeeded';
        state.latestTransactions = action.payload;
      })
      .addCase(fetchLatestTransactions.rejected, (state, action) => {
        state.transactionsStatus = 'failed';
        state.transactionsError = action.payload;
      })
      .addCase(updateTransaction.fulfilled, (state, action) => {
        const id = action.payload.id || action.meta.arg.id;
        const updatedTxn = action.payload.transaction || action.payload;

        // Update in latestTransactions if present
        const index = state.latestTransactions.findIndex(t => t.id === id);
        if (index !== -1) {
          state.latestTransactions[index] = { ...state.latestTransactions[index], ...updatedTxn };
        }

        // Remove from uncategorized if it's now categorized
        if (updatedTxn.categorization_status !== 'pending') {
          state.uncategorizedTransactions = state.uncategorizedTransactions.filter(t => t.id !== id);
          state.uncategorizedCount = Math.max(0, state.uncategorizedCount - 1);
        }
      })

      .addCase(createTransaction.fulfilled, (state, action) => {
        const list = action.payload?.accounts;
        if (Array.isArray(list) && list.length) {
          state.accounts = list;
          state.accountsStatus = 'succeeded';
        }
      })

      // --- fetchTopSpendingCategories ---
      .addCase(fetchTopSpendingCategories.pending, (state) => {
        state.topCategoriesStatus = 'loading';
        state.topCategoriesError = null;
      })
      .addCase(fetchTopSpendingCategories.fulfilled, (state, action) => {
        state.topCategoriesStatus = 'succeeded';
        state.topCategories = action.payload || [];
      })
      .addCase(fetchTopSpendingCategories.rejected, (state, action) => {
        state.topCategoriesStatus = 'failed';
        state.topCategoriesError = action.payload;
      })

      // =======================================================
      // SMS PROCESSING HANDLERS (NEW)
      // =======================================================

      // --- processSMS ---
      .addCase(processSMS.pending, (state) => {
        state.smsProcessing = true;
        state.smsResult = null;
        state.smsError = null;
      })
      .addCase(processSMS.fulfilled, (state, action) => {
        state.smsProcessing = false;
        state.smsResult = action.payload;

        // Update accounts if returned (sync balance instantly)
        if (action.payload.accounts) {
          state.accounts = action.payload.accounts;
          state.accountsStatus = 'succeeded';
        }

        // If transaction was created, add to latestTransactions
        if (action.payload.status === 'success' && action.payload.transaction) {
          logWalletAttributionBatch('processSMS.fulfilled_new_tx', [action.payload.transaction]);
          // Add new transaction at the beginning
          state.latestTransactions = [
            action.payload.transaction,
            ...state.latestTransactions
          ];

          // Keep only 4 transactions
          if (state.latestTransactions.length > 4) {
            state.latestTransactions = state.latestTransactions.slice(0, 4);
          }
        }
      })
      .addCase(processSMS.rejected, (state, action) => {
        state.smsProcessing = false;
        state.smsError = action.payload;
      })

      .addCase(ingestDeviceNotification.fulfilled, (state, action) => {
        const list = action.payload?.accounts;
        if (Array.isArray(list) && list.length) {
          state.accounts = list;
          state.accountsStatus = 'succeeded';
        }
      })




      // --- GOOGLE LOGIN ---
      .addCase(loginWithGoogle.pending, (state) => {
        state.authStatus = 'loading';
        state.authError = null;
      })
      .addCase(loginWithGoogle.fulfilled, (state, action) => {
        state.authStatus = 'authenticated';
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(loginWithGoogle.rejected, (state, action) => {
        state.authStatus = 'failed';
        state.authError = action.payload;
      })

      // --- EMAIL AUTH ---
      .addCase(loginWithEmail.pending, (state) => {
        state.authStatus = 'loading';
        state.authError = null;
      })
      .addCase(loginWithEmail.fulfilled, (state, action) => {
        state.authStatus = 'authenticated';
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.authError = null;
      })
      .addCase(loginWithEmail.rejected, (state, action) => {
        state.authStatus = 'failed';
        state.authError = action.payload;
      })
      
      .addCase(registerWithEmail.pending, (state) => {
        state.authStatus = 'loading';
        state.authError = null;
      })
      .addCase(registerWithEmail.fulfilled, (state, action) => {
        state.authStatus = 'registered'; 
        state.authError = null;
      })
      .addCase(registerWithEmail.rejected, (state, action) => {
        state.authStatus = 'failed';
        state.authError = action.payload;
      })




      // --- FETCH PROFILE ---
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      })

      // --- testSMSParsing ---
      .addCase(testSMSParsing.pending, (state) => {
        state.smsTesting = true;
        state.smsTestResult = null;
        state.smsTestError = null;
      })
      .addCase(testSMSParsing.fulfilled, (state, action) => {
        state.smsTesting = false;
        state.smsTestResult = action.payload;
      })
      .addCase(testSMSParsing.rejected, (state, action) => {
        state.smsTesting = false;
        state.smsTestError = action.payload;
      })

      // --- FETCH FINANCIAL INSIGHT ---
      .addCase(fetchFinancialInsight.pending, (state) => {
        state.financialInsightStatus = 'loading';
        state.financialInsight = null;
      })
      .addCase(fetchFinancialInsight.fulfilled, (state, action) => {
        state.financialInsightStatus = 'succeeded';
        state.financialInsight = action.payload || null;
      })
      .addCase(fetchFinancialInsight.rejected, (state, action) => {
        state.financialInsightStatus = 'failed';
        state.financialInsight = null;
      })

      // --- processBatchSMS ---
      .addCase(processBatchSMS.pending, (state) => {
        state.smsBatchProcessing = true;
        state.smsBatchResult = null;
        state.smsBatchError = null;
      })
      .addCase(processBatchSMS.fulfilled, (state, action) => {
        state.smsBatchProcessing = false;
        state.smsBatchResult = action.payload;

        // Refresh transactions list if any were created
        if (action.payload.created > 0) {
          // Mark transactions as needing refresh
          state.transactionsStatus = 'idle';
        }
      })
      .addCase(processBatchSMS.rejected, (state, action) => {
        state.smsBatchProcessing = false;
        state.smsBatchError = action.payload;
      })

      // Delete Transaction
      .addCase(deleteTransaction.fulfilled, (state, action) => {
        state.latestTransactions = state.latestTransactions.filter(t => t.id !== action.meta.arg);
      })

      // Mark as Spam
      .addCase(markAsSpam.fulfilled, (state, action) => {
        state.latestTransactions = state.latestTransactions.filter(t => t.id !== action.meta.arg);
      })

      // Fetch Spam Transactions
      .addCase(fetchSpamTransactions.pending, (state) => {
        state.spamTransactionsStatus = 'loading';
      })
      .addCase(fetchSpamTransactions.fulfilled, (state, action) => {
        state.spamTransactionsStatus = 'succeeded';
        state.spamTransactions = action.payload || [];
      })
      .addCase(fetchSpamTransactions.rejected, (state, action) => {
        state.spamTransactionsStatus = 'failed';
        state.spamTransactionsError = action.payload;
      })

      // --- calculatePreviousStatement ---
      .addCase(calculatePreviousStatement.pending, (state) => {
        state.statementStatus = 'loading';
        state.statementResult = null;
        state.statementError = null;
      })
      .addCase(calculatePreviousStatement.fulfilled, (state, action) => {
        state.statementStatus = 'succeeded';
        state.statementResult = action.payload;
        // Mark transactions as needing refresh if any were added
        if (action.payload.added_transactions > 0) {
          state.transactionsStatus = 'idle';
        }
      })
      .addCase(calculatePreviousStatement.rejected, (state, action) => {
        state.statementStatus = 'failed';
        state.statementError = action.payload;
      })

      // =======================================================
      // TRANSACTION CATEGORIZATION REDUCERS (NEW)
      // =======================================================

      // Uncategorized Transactions
      .addCase(fetchUncategorizedTransactions.pending, (state) => {
        state.uncategorizedStatus = 'loading';
      })
      .addCase(fetchUncategorizedTransactions.fulfilled, (state, action) => {
        state.uncategorizedStatus = 'succeeded';
        state.uncategorizedTransactions = action.payload.transactions || [];
        state.uncategorizedCount = action.payload.count || 0;
        state.uncategorizedError = null;
      })
      .addCase(fetchUncategorizedTransactions.rejected, (state, action) => {
        state.uncategorizedStatus = 'failed';
        state.uncategorizedError = action.payload;
      })

      // Bulk Actions
      .addCase(bulkCategorizeTransactions.pending, (state) => {
        state.uncategorizedStatus = 'updating';
      })
      .addCase(bulkCategorizeTransactions.fulfilled, (state, action) => {
        state.uncategorizedStatus = 'succeeded';
      })
      .addCase(bulkCategorizeTransactions.rejected, (state, action) => {
        state.uncategorizedStatus = 'failed';
        state.uncategorizedError = action.payload;
      })

      .addCase(bulkDeleteTransactions.pending, (state) => {
        state.uncategorizedStatus = 'updating';
      })
      .addCase(bulkDeleteTransactions.fulfilled, (state, action) => {
        state.uncategorizedStatus = 'succeeded';
      })

      .addCase(bulkMarkAsSpam.pending, (state) => {
        state.uncategorizedStatus = 'updating';
      })
      .addCase(bulkMarkAsSpam.fulfilled, (state, action) => {
        state.uncategorizedStatus = 'succeeded';
      })

      // Category Suggestion
      .addCase(getSuggestedCategory.pending, (state) => {
        state.suggestionStatus = 'loading';
      })
      .addCase(getSuggestedCategory.fulfilled, (state, action) => {
        state.suggestionStatus = 'succeeded';
        state.categorysuggestion = action.payload;
      })
      .addCase(getSuggestedCategory.rejected, (state, action) => {
        state.suggestionStatus = 'failed';
        state.categorysuggestion = null;
      })

      // Categorization Rules
      .addCase(fetchCategorizationRules.pending, (state) => {
        state.rulesStatus = 'loading';
      })
      .addCase(fetchCategorizationRules.fulfilled, (state, action) => {
        state.rulesStatus = 'succeeded';
        state.categorizationRules = action.payload.rules || [];
        state.rulesError = null;
      })
      .addCase(fetchCategorizationRules.rejected, (state, action) => {
        state.rulesStatus = 'failed';
        state.rulesError = action.payload;
      })

      // Create Rule
      .addCase(createCategorizationRule.fulfilled, (state, action) => {
        state.rulesStatus = 'succeeded';
      })
      .addCase(createCategorizationRule.rejected, (state, action) => {
        state.rulesStatus = 'failed';
        state.rulesError = action.payload;
      })

      // Delete Rule
      .addCase(deleteCategorizationRule.fulfilled, (state, action) => {
        state.rulesStatus = 'succeeded';
      })
      .addCase(deleteCategorizationRule.rejected, (state, action) => {
        state.rulesStatus = 'failed';
        state.rulesError = action.payload;
      })

      // =======================================================
      // GLOBAL MATCHERS FOR SERVER STATUS
      // =======================================================
      .addMatcher(
        (action) => action.type.endsWith('/rejected'),
        (state, action) => {
          const errorMsg = action.payload || action.error?.message;
          // Check for common network error indicators
          if (
            errorMsg &&
            (
              typeof errorMsg === 'string' && (
                errorMsg.includes('Network Error') ||
                errorMsg.includes('Network request failed') ||
                errorMsg.includes('timeout') ||
                errorMsg.includes('50') // Catch 500, 502, 503 etc loosely if passed as string
              )
            )
          ) {
            state.serverStatus = 'offline';
          }
        }
      )
      .addMatcher(
        (action) => action.type.endsWith('/fulfilled'),
        (state) => {
          if (state.serverStatus === 'offline') {
            state.serverStatus = 'online';
          }
        }
      );
  },
});

export const {
  clearBudgetSaveStatus,
  clearSMSResult,
  clearSMSTestResult,
  clearSMSBatchResult,
  setLastSmsCheck,
  logout
} = APISlice.actions;

export default APISlice.reducer;