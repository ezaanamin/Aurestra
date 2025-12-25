import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { API_BASE_URL } from "../../API_URL"

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

// =======================================================
// TRANSACTIONS ASYNC THUNKS
// =======================================================

export const fetchLatestTransactions = createAsyncThunk(
  'api/fetchLatestTransactions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/latest-transactions`);
      return response.data;
    } catch (error) {
      const message = error?.response?.data?.message || error.message;
      console.error('fetchLatestTransactions error:', message);
      return rejectWithValue(message);
    }
  }
);

export const fetchTopSpendingCategories = createAsyncThunk(
  'api/fetchTopSpendingCategories',
  async (_, { rejectWithValue }) => {
    const url = `${API_BASE_URL}/api/transactions/top-categories`;
    try {
      const response = await axios.get(url);
      return response.data; 
    } catch (error) {
      const message = error?.response?.data?.message || error.message;
      console.error(`fetchTopSpendingCategories failed:`, {
        url: url,
        error: message, 
        response: error.response?.data
      });
      return rejectWithValue(message);
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

const initialState = {
  summaries: [],
  status: 'idle',
  error: null,
  
  // Transactions
  latestTransactions: [],
  transactionsStatus: 'idle',
  transactionsError: null,
  
  topCategories: null,
  topCategoriesStatus: 'idle',
  topCategoriesError: null,

  // Budget
  budget: null,
  budgetStatus: 'idle',
  budgetSaveStatus: 'idle',
  budgetError: null,
  
  // History
  fourMonthHistory: [],
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

      // --- fetchTopSpendingCategories ---
      .addCase(fetchTopSpendingCategories.pending, (state) => {
        state.topCategoriesStatus = 'loading';
        state.topCategoriesError = null;
      })
      .addCase(fetchTopSpendingCategories.fulfilled, (state, action) => {
        state.topCategoriesStatus = 'succeeded';
        state.topCategories = action.payload;
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