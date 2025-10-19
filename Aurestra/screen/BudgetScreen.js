import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
// --- REDUX IMPORTS ---
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchBudget, 
  saveBudget, 
} from "../API/slice/API"
// --- END REDUX IMPORTS ---

import BottomBar from '../components/BottomBar'; 
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; 


const BudgetScreen = ({ navigation }) => {
  // Local state for user input
  const [monthlyIncome, setMonthlyIncome] = useState('');
  
  const [showNoBudgetPrompt, setShowNoBudgetPrompt] = useState(false);

  // --- REDUX HOOKS ---
  const dispatch = useDispatch();
  const { budget, budgetStatus, budgetSaveStatus, budgetError } = useSelector(
    (state) => state.API
  );
  const saveStatus = budgetSaveStatus; 
  // --- END REDUX HOOKS ---

  const incomeValue = parseFloat(monthlyIncome) || 0;
  
  // --- BUDGET DISPLAY LOGIC (UPDATED) ---
  let currentNeeds, currentWants, currentSavings, currentDisplayTotal;

  // Check if the input value matches the loaded budget total
  const isInputDifferentFromSaved = budget && budget.total_budget && incomeValue !== parseFloat(budget.total_budget);

  if (incomeValue > 0 && (isInputDifferentFromSaved || !budget || budget.total_budget === undefined)) {
    // Scenario 1: User is actively typing OR there's no saved budget.
    // Show the live calculated 50/30/20 breakdown for preview.
    currentDisplayTotal = incomeValue;
    currentNeeds = incomeValue * 0.50;
    currentWants = incomeValue * 0.30;
    currentSavings = incomeValue * 0.20;
  } else if (budgetStatus === 'succeeded' && budget && budget.total_budget > 0) {
    // Scenario 2: Budget loaded successfully and input matches (or is clear).
    // Show the saved breakdown from the API.
    currentDisplayTotal = budget.total_budget;
    currentNeeds = budget.needs;
    currentWants = budget.wants;
    currentSavings = budget.saving;
  } else {
    // Scenario 3: Default to zero (no budget saved and no input)
    currentDisplayTotal = 0;
    currentNeeds = 0;
    currentWants = 0;
    currentSavings = 0;
  }
  // --- END BUDGET DISPLAY LOGIC ---


  // 1. FETCH BUDGET ON LOAD AND UPDATE LOCAL STATE
  useEffect(() => {
    dispatch(fetchBudget());
  }, [dispatch]);

  useEffect(() => {
    if (budgetStatus === 'succeeded') {
      if (budget && budget.total_budget) {
        // If budget is found, update the local input state and dismiss prompt
        setMonthlyIncome(String(budget.total_budget));
        setShowNoBudgetPrompt(false);
      } else if (budget === null) {
        // If budget is null (404 from API), show the prompt to set one
        setShowNoBudgetPrompt(true);
        setMonthlyIncome(''); // Clear input if no budget is set
      }
    }
    if (budgetStatus === 'failed' && budgetError && !budgetError?.message.includes('404')) {
        console.error("Budget Fetch Error:", budgetError);
    }
  }, [budgetStatus, budget, budgetError]);
  
  // Helper function to format currency (PKR)
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Function to save the budget (UPDATED)
  const saveBudgetHandler = () => {
    if (incomeValue <= 0) {
      console.error("Cannot save a budget with zero income.");
      return;
    }
    
    // Construct the full data object to send to the API, using the 50/30/20 calculation
    // based on the income the user entered.
    const budgetData = {
        income: incomeValue,
        needs: incomeValue * 0.50,
        wants: incomeValue * 0.30,
        saving: incomeValue * 0.20,
    };

    // Dispatch the Redux thunk with the full data object
    dispatch(saveBudget(budgetData));
  };

  const getSaveButtonText = () => {
    if (saveStatus === 'saving') return 'Saving...';
    if (saveStatus === 'success') return (budgetError?.message || 'Saved!');
    if (saveStatus === 'error') return (budgetError?.message || 'Save Failed');
    return 'Save Budget';
  };
  
  // Display the current month for the prompt
  const getCurrentMonthYear = () => {
    return new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };
  
  // If fetching for the first time, show a full screen loader
  // if (budgetStatus === 'loading') {
  //   return (
  //     <View style={[styles.container, styles.centerScreen]}>
  //       <ActivityIndicator size="large" color="#4299e1" />
  //       <Text style={{ marginTop: 10, color: '#333' }}>Loading budget data...</Text>
  //     </View>
  //   );
  // }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4299e1" />
      <View style={styles.headerBackground}>
        <SafeAreaView style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Budget Planner</Text>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
        
          {/* --- NO BUDGET PROMPT --- */}
          {showNoBudgetPrompt && (
            <View style={styles.promptCard}>
              <Icon name="cash-multiple" size={30} color="#e53e3e" />
              <Text style={styles.promptTitle}>Budget Not Set!</Text>
              <Text style={styles.promptText}>
                Please set your monthly income budget for **{getCurrentMonthYear()}** to get started with the 50/30/20 breakdown.
              </Text>
              <TouchableOpacity 
                  style={styles.promptButton} 
                  onPress={() => setShowNoBudgetPrompt(false)}
              >
                <Text style={styles.promptButtonText}>Got It</Text>
              </TouchableOpacity>
            </View>
          )}
        
          {/* Income Input Section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Monthly Income (PKR)</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>Rs</Text>
              <TextInput
                style={styles.incomeInput}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#999"
                value={monthlyIncome}
                onChangeText={(text) => setMonthlyIncome(text.replace(/[^0-9.]/g, ''))}
              />
            </View>
          </View>

          {/* Budget Breakdown Section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>50/30/20 Rule Breakdown</Text>
            {/* Use currentDisplayTotal for the check */}
            {currentDisplayTotal === 0 ? (
              <Text style={styles.placeholderText}>
                Enter your monthly income above to see your budget breakdown.
              </Text>
            ) : (
              <View>
                {/* Needs (50%) - Use currentNeeds */}
                <View style={[styles.budgetItem, styles.needsBackground]}>
                  <Icon name="home" size={24} color="#fff" style={styles.budgetItemIcon} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.budgetItemTitle}>Needs (50%)</Text>
                    <Text style={styles.budgetItemDescription}>
                      Housing, utilities, groceries, transportation, insurance, minimum debt payments.
                    </Text>
                  </View>
                  <Text style={styles.budgetItemAmount}>{formatCurrency(currentNeeds)}</Text>
                </View>

                {/* Wants (30%) - Use currentWants */}
                <View style={[styles.budgetItem, styles.wantsBackground]}>
                  <Icon name="shopping" size={24} color="#fff" style={styles.budgetItemIcon} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.budgetItemTitle}>Wants (30%)</Text>
                    <Text style={styles.budgetItemDescription}>
                      Entertainment, dining out, subscriptions, hobbies, shopping.
                    </Text>
                  </View>
                  <Text style={styles.budgetItemAmount}>{formatCurrency(currentWants)}</Text>
                </View>

                {/* Savings & Debt (20%) - Use currentSavings */}
                <View style={[styles.budgetItem, styles.savingsBackground]}>
                  <Icon name="piggy-bank" size={24} color="#fff" style={styles.budgetItemIcon} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.budgetItemTitle}>Savings & Debt (20%)</Text>
                    <Text style={styles.budgetItemDescription}>
                      Emergency fund, investments, extra debt payments, retirement.
                    </Text>
                  </View>
                  <Text style={styles.budgetItemAmount}>{formatCurrency(currentSavings)}</Text>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    saveStatus === 'success' && styles.saveButtonSuccess,
                    saveStatus === 'error' && styles.saveButtonError,
                    (saveStatus === 'saving' || incomeValue <= 0) && styles.saveButtonDisabled,
                  ]}
                  onPress={saveBudgetHandler} 
                  disabled={saveStatus === 'saving' || incomeValue <= 0}
                >
                  {saveStatus === 'saving' ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>{getSaveButtonText()}</Text>
                  )}
                </TouchableOpacity>
                
                {/* Display Redux success message */}
                {(saveStatus === 'success' && budgetError?.message) && (
                    <Text style={[styles.saveErrorText, {color: '#48bb78'}]}>{budgetError.message}</Text>
                )}
                
                {/* Display Redux error message */}
                {(saveStatus === 'error' && budgetError?.message) && (
                  <Text style={styles.saveErrorText}>{budgetError.message}</Text>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomBar navigation={navigation} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8', // Light grey background
  },
  centerScreen: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Theme from HomeScreen
  headerBackground: {
    backgroundColor: '#4299e1', // Primary Blue
    borderBottomLeftRadius: 30, // Large radius
    borderBottomRightRadius: 30, // Large radius
    paddingBottom: 20,
    paddingHorizontal: 15, // Added padding from reference
    elevation: 4, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 0,
  },
  backButton: {
    padding: 10,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 15,
    paddingTop: 20,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  // --- NEW STYLES FOR PROMPT ---
  promptCard: {
    backgroundColor: '#fee2e2', // Light Red/Pink background
    borderColor: '#e53e3e', // Error Red border
    borderWidth: 2,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e53e3e',
    marginTop: 5,
    marginBottom: 5,
  },
  promptText: {
    fontSize: 14,
    color: '#c53030', // Darker Red text
    textAlign: 'center',
    marginBottom: 15,
  },
  promptButton: {
    backgroundColor: '#e53e3e',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  promptButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  // --- END NEW STYLES ---
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 5,
  },
  incomeInput: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    borderBottomWidth: 2,
    borderColor: '#4299e1', // Match header theme color
    paddingVertical: 5,
    minWidth: 150,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  budgetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  budgetItemIcon: {
    marginRight: 15,
  },
  budgetItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  budgetItemDescription: {
    fontSize: 12,
    color: '#eee',
    flexShrink: 1,
  },
  budgetItemAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 'auto',
  },
  needsBackground: {
    backgroundColor: '#48bb78', // Green
  },
  wantsBackground: {
    backgroundColor: '#f6ad55', // Orange
  },
  savingsBackground: {
    backgroundColor: '#63b3ed', // Blue
  },
  saveButton: {
    backgroundColor: '#4299e1', // Theme color for action button
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButtonSuccess: {
    backgroundColor: '#48bb78', // Success Green
  },
  saveButtonError: {
    backgroundColor: '#e53e3e', // Error Red
  },
  saveButtonDisabled: {
    backgroundColor: '#a0aec0', // Gray for disabled
  },
  saveErrorText: {
    color: '#e53e3e',
    textAlign: 'center',
    marginTop: 5,
  }
});

export default BudgetScreen;
