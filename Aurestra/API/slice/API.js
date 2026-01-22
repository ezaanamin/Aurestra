import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from "../../API_URL"
import { ToastAndroid } from 'react-native';
import { reset } from '../../navigation/RootNavigation';

// =======================================================
// AXIOS CONFIGURATION
// =======================================================

// Set default base URL
axios.defaults.baseURL = API_BASE_URL;

// Request Interceptor: Attach token to all requests
axios.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    // silent: no debug logging
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle 401 errors (invalid/expired token)
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.log('🚨 401/403 Error - Clearing auth and redirecting to login');

      // Clear all auth data
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');

      // Show user-friendly message
      ToastAndroid.show('⚠️ Session expired. Please login again.', ToastAndroid.LONG);

      // Force navigation to login screen
      reset('Login');

      // App.js will automatically redirect to login when token is null
    }
    return Promise.reject(error);
  }
);
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
// AUTH THUNKS
// =======================================================
export const loginUser = createAsyncThunk(
  'api/loginUser',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/login`, { email, password });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const loginWithGoogle = createAsyncThunk(
  'api/loginWithGoogle',
  async ({ idToken, serverAuthCode }, { rejectWithValue }) => {
    try {
      const url = `${API_BASE_URL}/api/google/login`;
      console.log('🚀 [Google Login] Sending Request to:', url);
      console.log('🚀 [Google Login] Payload:', { idToken: idToken.substring(0, 20) + '...', serverAuthCode: serverAuthCode ? 'PRESENT' : 'MISSING' });

      const response = await axios.post(url, { idToken, serverAuthCode });
      if (response.data.token) {
        await AsyncStorage.setItem('userToken', response.data.token);
      }
      return response.data;
    } catch (error) {
      console.error('❌ [Google Login] Failed Raw Error:', JSON.stringify(error, null, 2));
      console.error('❌ [Google Login] Error Message:', error.message);
      console.error('❌ [Google Login] Response Status:', error.response?.status);
      console.error('❌ [Google Login] Response Data:', error.response?.data);

      const message = error.response?.data?.message || error.message || 'Google Login failed';
      const status = error.response?.status ? ` (Status: ${error.response.status})` : '';
      return rejectWithValue(`${message}${status}`);
    }
  }
);

export const verifyOtp = createAsyncThunk(
  'api/verifyOtp',
  async ({ email, otp }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/verify-otp`, { email, otp });
      // Save token
      if (response.data.token) {
        await AsyncStorage.setItem('userToken', response.data.token);
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Verification failed');
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
    console.log('saveBudget called with data:', budgetData);
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
  async (monthStr, { rejectWithValue }) => {
    try {
      const payload = monthStr ? { month: monthStr } : {};
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


export const fetchLatestTransactions = createAsyncThunk(
  'api/fetchLatestTransactions',
  async (limit = 4, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/latest-transactions?limit=${limit}`);
      return response.data;
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
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update transaction');
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

      console.log(`🚀 Sending batch of ${messages.length} SMS to backend...`);
      const response = await axios.post(`${API_BASE_URL}/api/sms/batch`, {
        messages
      });

      console.log('✅ Batch response:', response.data);
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
      console.log('Fetching insight from:', url);
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
  async (_, { rejectWithValue }) => {
    try {
      // Assuming endpoint is /api/accounts
      const response = await axios.get(`${API_BASE_URL}/api/accounts`);
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
  async ({ amount, source = 'bank' }, { rejectWithValue, dispatch }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/accounts/set_balance`, {
        amount,
        source
      });

      // Refresh accounts after setting balance
      dispatch(fetchUserAccounts());

      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to set balance');
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
      return response.data;
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
  budgetStatus: 'idle',
  budgetSaveStatus: 'idle',
  // Budget
  budget: null,
  totalExpenses: 0, // Dedicated state for expense API
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
          { id: 1, source: 'bank', balance: 0 },
          { id: 2, source: 'wallet', balance: 0 }
        ]
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
        console.log('API Slice: fetchCurrentSummary.fulfilled payload:', action.payload);
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
        console.log("✅ Total Expenses Updated:", state.totalExpenses);
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
        // Update in latestTransactions if present
        const index = state.latestTransactions.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.latestTransactions[index] = action.payload;
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

      // --- LOGIN ---
      .addCase(loginUser.pending, (state) => {
        state.authStatus = 'loading';
        state.authError = null;
      })
      .addCase(loginUser.fulfilled, (state) => {
        state.authStatus = 'otp_sent';
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.authStatus = 'failed';
        state.authError = action.payload;
      })

      // --- GOOGLE LOGIN ---
      .addCase(loginWithGoogle.pending, (state) => {
        state.authStatus = 'loading';
        state.authError = null;
      })
      .addCase(loginWithGoogle.fulfilled, (state, action) => {
        if (action.payload.otp_required) {
          state.authStatus = 'otp_sent';
        } else {
          state.authStatus = 'authenticated';
          state.token = action.payload.token;
          state.user = action.payload.user;
          state.error = null;
        }
      })
      .addCase(loginWithGoogle.rejected, (state, action) => {
        state.authStatus = 'failed';
        state.authError = action.payload;
      })

      // --- VERIFY OTP ---
      .addCase(verifyOtp.pending, (state) => {
        state.authStatus = 'loading';
        state.authError = null;
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.authStatus = 'authenticated';
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(verifyOtp.rejected, (state, action) => {
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
        state.financialInsight = action.payload?.data || null;
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

      // Bulk Categorize
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