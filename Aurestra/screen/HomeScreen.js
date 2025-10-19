import React, { useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Header from '../components/Header';
import AccountSummary from '../components/AccountSummary';
import QuickStats from '../components/QuickStats';
import TimeframeTabs from '../components/TimeframeTabs';
import TransactionList from '../components/TransactionList';
import BottomBar from '../components/BottomBar';
import { fetchMonthlySummary, fetchBudget } from '../API/slice/API'; // NEW: Import fetchBudget

// Removed SavingsProgressBar and progressBarStyles as the budget progress is now in AccountSummary.js

const formatPKR = (amount) => {
  const value = typeof amount === 'number' ? amount : 0;
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const HomeScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  // PULL NEW: Pull budget data from the API slice state
  const { summaries = [], budget = null, status = 'idle', error = null } = useSelector((state) => state.API);

  useEffect(() => {
    dispatch(fetchMonthlySummary());
    // NEW: Dispatch fetchBudget on component load
    dispatch(fetchBudget()); 
  }, [dispatch]);

  const latestSummary = summaries.length > 0 ? summaries[summaries.length - 1] : null;

  // --- UPDATED FINANCIAL CALCULATIONS ---
  const totalBalance = latestSummary ? formatPKR(latestSummary.closing_balance) : formatPKR(0);
  
  // The backend now provides 'expense' as a non-negative number for money spent.
  const totalExpense = latestSummary
    ? formatPKR(latestSummary.expense)
    : formatPKR(0);
  
  // The backend now provides 'savings' as a non-negative number for net income/savings.
  const totalSavings = latestSummary ? latestSummary.savings : 0; 

  // Get budget amount from state, defaulting to 0 if not fetched or not set
  const totalBudget = budget ? (budget.total_budget || 0) : 0;
  // --- END UPDATED FINANCIAL CALCULATIONS ---

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4299e1" />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.headerBackground}>
            <Header />

            {status === 'loading' && <Text style={styles.infoText}>Loading...</Text>}
            {status === 'failed' && <Text style={styles.errorText}>{error}</Text>}

            {latestSummary && (
              <AccountSummary
                totalBalance={totalBalance}
                totalExpense={totalExpense}
                // NEW PROPS for budget performance calculation in AccountSummary
                totalSavings={totalSavings}
                totalBudget={totalBudget}
                rawExpense={latestSummary.expense || 0}
              />
            )}

            <TimeframeTabs />
        </View>
        
        {/* Removed SavingsProgressBar as its logic is now within AccountSummary */}
        
        <View style={styles.transactionListContainer}>
          <TransactionList transactions={latestSummary?.transactions || []} />
        </View>
      </ScrollView>

      <BottomBar navigation={navigation} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerBackground: {
    backgroundColor: '#4299e1',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 20,
    paddingHorizontal: 15,
  },
  transactionListContainer: { flex: 1, marginTop: 20, paddingHorizontal: 15 },
  infoText: { color: '#fff', marginVertical: 10, fontSize: 16, textAlign: 'center' },
  errorText: { color: 'red', marginVertical: 10, fontSize: 16, textAlign: 'center' },
});

export default HomeScreen;