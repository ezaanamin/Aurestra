import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from "../../API_URL"
import { reset } from '../../navigation/RootNavigation';

// Request interceptor to add token
axios.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      await AsyncStorage.removeItem('userToken');
      reset('Login');
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
          expense: summary.expense,
          savings: summary.savings,
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
      const response = await axios.post(`${API_BASE_URL}/api/calculate-summary`);
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
      state.smsBatchResult = null;
      state.smsBatchError = null;
      state.smsBatchProcessing = false;
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
        state.currentSummary = action.payload;
      })
      .addCase(fetchCurrentSummary.rejected, (state, action) => {
        state.summaryStatus = 'failed';
        state.summaryError = action.payload;
        // Fallback
        state.currentSummary = {
          actual: { income: 0, expense: 0, savings: 0 }
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
        state.budgetSaveStatus = 'error';
        state.budgetError = {
          type: 'error',
          message: action.payload || 'Failed to save budget.'
        };
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
      });
  },
});

export const {
  clearBudgetSaveStatus,
  clearSMSResult,
  clearSMSTestResult,
  clearSMSBatchResult
} = APISlice.actions;

export default APISlice.reducer;