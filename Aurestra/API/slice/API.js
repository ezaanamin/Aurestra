import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { API_BASE_URL } from "../../API_URL"
// NOTE: You must replace this placeholder URL with your actual Flask server IP/domain.

// =======================================================
// BUDGET ASYNC THUNKS (NEW)
// =======================================================

/**
 * Fetches the total budget saved for the current month from the backend.
 * Returns null if no budget is found (404 response).
 */
export const fetchBudget = createAsyncThunk(
  'api/fetchBudget',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/budget`);
      // API returns: { month: "YYYY-MM", total_budget: 120000.00, created_at: "..." }
      return response.data;
    } catch (error) {
      const message = error?.response?.data?.message || error.message;
      
      // If the backend returns 404 (No budget found), we return null instead of rejecting,
      // which allows the application to handle 'no budget' gracefully.
      if (error.response && error.response.status === 404) {
         return null; 
      }

      console.error('fetchBudget error:', message);
      return rejectWithValue(message || 'Unknown error fetching budget');
    }
  }
);


/**
 * Saves or updates the monthly budget via POST /api/budget.
 * @param {object} budgetData - The budget object containing income, needs, wants, and saving.
 */
export const saveBudget = createAsyncThunk(
  'api/saveBudget',
  async (budgetData, { rejectWithValue }) => {
    // 'budgetData' now correctly expects the object: { income, needs, wants, saving }
    console.log('saveBudget called with data:', budgetData);
    try {
      // Validate the main income value from the object
      if (typeof budgetData.income !== 'number' || budgetData.income <= 0) {
        // Changed alert() to console.error() as alert() is forbidden in this environment.
        console.error('Validation Error: Income must be a positive number.', budgetData.income); 
        return rejectWithValue('Income must be a positive number.');
      }
      
      // The payload is the entire budgetData object passed from the component, 
      // containing income, needs, wants, and saving.
      const payload = budgetData;
      
      const response = await axios.post(`${API_BASE_URL}/api/budget`, payload);
      
      // API returns the saved budget data + message on success (200 or 201)
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
// EXISTING ASYNC THUNKS
// =======================================================

// Async thunk to fetch monthly summary (Existing)
export const fetchMonthlySummary = createAsyncThunk(
  'api/fetchMonthlySummary',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/monthly-summary`);

      // Ensure data is always an array
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
          // NEW: Added 'savings' and removed 'budget' to reflect database changes
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

// Async thunk to calculate and save the current month's summary (FIXED)
export const calculateMonthlySummary = createAsyncThunk(
  'api/calculateMonthlySummary',
  async (_, { rejectWithValue, getState }) => {
    try {
      // POST request to trigger the backend calculation
      const response = await axios.post(`${API_BASE_URL}/api/calculate-summary`);
      // Backend now only returns { message: "..." } on success
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
      // The API endpoint handles fetching the last 4 months (newest first)
      const response = await axios.get(`${API_BASE_URL}/api/budget/history`);
      
      // API returns an array like: [{ month: '2025-10', budget: {...}, actual: {...} }, ...]
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
// TRANSACTIONS ASYNC THUNKS (NEW)
// =======================================================

/**
 * Fetch the top 4 latest transactions.
 */
export const fetchLatestTransactions = createAsyncThunk(
  'api/fetchLatestTransactions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/latest-transactions`);
      return response.data; // Array of 4 transactions
    } catch (error) {
      const message = error?.response?.data?.message || error.message;
      console.error('fetchLatestTransactions error:', message);
      return rejectWithValue(message);
    }
  }
);

/**
 * Fetch the top 4 spending categories for the latest month.
 */
export const fetchTopSpendingCategories = createAsyncThunk(
  'api/fetchTopSpendingCategories',
  async (_, { rejectWithValue }) => {
    const url = `${API_BASE_URL}/api/transactions/top-categories`; // Construct URL
    try {
      const response = await axios.get(url); // Use constructed URL
      // response.data is now: { month: "YYYY-MM", top_categories: [...] }
      return response.data; 
    } catch (error) {
      const message = error?.response?.data?.message || error.message;
      // 💡 Enhanced log to show the exact URL that failed
      console.error(`fetchTopSpendingCategories failed (404 likely):`, {
        url: url,
        error: message, 
        response: error.response?.data
      });
      return rejectWithValue(message);
    }
  }
);

// Initial state
const initialState = {
  summaries: [],
  status: 'idle', // General status for fetching/calculating summaries
  error: null,    // Error for summaries or structured success notification
// New state fields
latestTransactions: [],   // Array of top 4 latest transactions
transactionsStatus: 'idle',
transactionsError: null,

topCategories: null,      // Object: { month, top_categories }
topCategoriesStatus: 'idle',
topCategoriesError: null,

  // New state for Budget feature
  budget: null,           // Holds the fetched budget amount ({ month, total_budget, created_at })
  budgetStatus: 'idle',   // Status for fetching the budget (GET operation)
  budgetSaveStatus: 'idle', // Status for saving the budget (POST operation: 'idle' | 'saving' | 'success' | 'error')
  budgetError: null,      // Error specifically for budget operations
  // NEW State for History
  fourMonthHistory: [],         // Array to store the historical data
  historyStatus: 'idle',        // Status for fetching history
  historyError: null,           // Error specifically for history fetching
};

// Slice
const APISlice = createSlice({
  name: 'API',
  initialState,
  reducers: {
    // Reducer to clear budget save status after showing a notification
    clearBudgetSaveStatus: (state) => {
        state.budgetSaveStatus = 'idle';
        state.budgetError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // --- fetchMonthlySummary handlers (EXISTING) ---
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

      // --- calculateMonthlySummary handlers (EXISTING) ---
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
      
      // --- fetchBudget handlers (NEW) ---
      .addCase(fetchBudget.pending, (state) => {
        state.budgetStatus = 'loading';
        state.budgetError = null;
        state.budget = null; 
      })
      .addCase(fetchBudget.fulfilled, (state, action) => {
        state.budgetStatus = 'succeeded';
        // action.payload will be the budget data or null if 404
        state.budget = action.payload; 
        state.budgetError = null;
      })
      .addCase(fetchBudget.rejected, (state, action) => {
        state.budgetStatus = 'failed';
        state.budgetError = action.payload;
        state.budget = null; 
      })

      // --- saveBudget handlers (NEW) ---
      .addCase(saveBudget.pending, (state) => {
        state.budgetSaveStatus = 'saving';
        state.budgetError = null;
      })
      .addCase(saveBudget.fulfilled, (state, action) => {
        state.budgetSaveStatus = 'success';
        // Update the main budget state with the newly saved data
        state.budget = action.payload; 
        state.budgetError = { type: 'success', message: action.payload.message || 'Budget saved successfully!' };
      })
      .addCase(saveBudget.rejected, (state, action) => {
        state.budgetSaveStatus = 'error';
        state.budgetError = { type: 'error', message: action.payload || 'Failed to save budget.' };
      })
      .addCase(fetchFourMonthHistory.pending, (state) => {
        state.historyStatus = 'loading';
        state.historyError = null;
        state.fourMonthHistory = [];
      })
      .addCase(fetchFourMonthHistory.fulfilled, (state, action) => {
        state.historyStatus = 'succeeded';
        state.fourMonthHistory = action.payload; // Store the array of history objects
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
    state.latestTransactions = action.payload; // array of 4 transactions
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
    state.topCategories = action.payload; // { month, top_categories }
  })
  .addCase(fetchTopSpendingCategories.rejected, (state, action) => {
    state.topCategoriesStatus = 'failed';
    state.topCategoriesError = action.payload;
  });

  },
});

export const { clearBudgetSaveStatus } = APISlice.actions;

export default APISlice.reducer;