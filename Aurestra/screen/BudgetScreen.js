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
  Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBudget, saveBudget } from '../API/slice/API';
import { useSettings } from '../context/SettingsContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

const BudgetScreen = ({ navigation }) => {
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [showNoBudgetPrompt, setShowNoBudgetPrompt] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const dispatch = useDispatch();
  const { budget, budgetStatus, budgetSaveStatus, budgetError } = useSelector(
    (state) => state.API
  );
  const saveStatus = budgetSaveStatus;

  const incomeValue = parseFloat(monthlyIncome) || 0;

  // Budget calculation logic
  let currentNeeds, currentWants, currentSavings, currentDisplayTotal;
  const isInputDifferentFromSaved = budget && budget.total_budget && incomeValue !== parseFloat(budget.total_budget);

  if (incomeValue > 0 && (isInputDifferentFromSaved || !budget || budget.total_budget === undefined)) {
    currentDisplayTotal = incomeValue;
    currentNeeds = incomeValue * 0.50;
    currentWants = incomeValue * 0.30;
    currentSavings = incomeValue * 0.20;
  } else if (budgetStatus === 'succeeded' && budget && budget.total_budget > 0) {
    currentDisplayTotal = budget.total_budget;
    currentNeeds = budget.needs;
    currentWants = budget.wants;
    currentSavings = budget.saving;
  } else {
    currentDisplayTotal = 0;
    currentNeeds = 0;
    currentWants = 0;
    currentSavings = 0;
  }

  useEffect(() => {
    dispatch(fetchBudget());
  }, [dispatch]);

  useEffect(() => {
    if (budgetStatus === 'succeeded') {
      if (budget && budget.total_budget) {
        setMonthlyIncome(String(budget.total_budget));
        setShowNoBudgetPrompt(false);
      } else if (budget === null) {
        setShowNoBudgetPrompt(true);
        setMonthlyIncome('');
      }
    }
    if (budgetStatus === 'failed' && budgetError && !budgetError?.message.includes('404')) {
      console.error('Budget Fetch Error:', budgetError);
    }
  }, [budgetStatus, budget, budgetError]);

  const { currency } = useSettings();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const saveBudgetHandler = () => {
    if (incomeValue <= 0) {
      console.error('Cannot save a budget with zero income.');
      return;
    }

    const budgetData = {
      income: incomeValue,
      needs: incomeValue * 0.50,
      wants: incomeValue * 0.30,
      saving: incomeValue * 0.20,
    };

    dispatch(saveBudget(budgetData));
    setIsEditing(false);
  };

  const getSaveButtonText = () => {
    if (saveStatus === 'saving') return 'Saving...';
    if (saveStatus === 'success') return budgetError?.message || 'Saved!';
    if (saveStatus === 'error') return budgetError?.message || 'Save Failed';
    return 'Save Budget';
  };

  const getCurrentMonthYear = () => {
    return new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  const budgetCategories = [
    {
      title: 'Needs',
      percentage: 50,
      amount: currentNeeds,
      icon: 'home-variant',
      color: '#10B981',
      gradient: ['#10B981', '#059669'],
      description: 'Rent, utilities, groceries, transport',
      examples: ['Housing', 'Food', 'Bills', 'Insurance'],
    },
    {
      title: 'Wants',
      percentage: 30,
      amount: currentWants,
      icon: 'shopping',
      color: '#F59E0B',
      gradient: ['#F59E0B', '#D97706'],
      description: 'Entertainment, dining, subscriptions',
      examples: ['Netflix', 'Restaurants', 'Shopping', 'Hobbies'],
    },
    {
      title: 'Savings',
      percentage: 20,
      amount: currentSavings,
      icon: 'piggy-bank',
      color: '#3B82F6',
      gradient: ['#3B82F6', '#2563EB'],
      description: 'Emergency fund, investments, debt',
      examples: ['Savings', 'Stocks', 'Retirement', 'Debt Pay'],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E293B" />

      {/* Modern Header */}
      <LinearGradient colors={['#1E293B', '#334155']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Budget Planner</Text>
            <Text style={styles.headerSubtitle}>{getCurrentMonthYear()}</Text>
          </View>
          <TouchableOpacity style={styles.headerIconButton}>
            <Icon name="information-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* No Budget Prompt */}
          {showNoBudgetPrompt && (
            <View style={styles.promptCard}>
              <LinearGradient
                colors={['#FEF3C7', '#FDE68A']}
                style={styles.promptGradient}
              >
                <View style={styles.promptIconContainer}>
                  <Icon name="alert-circle" size={40} color="#F59E0B" />
                </View>
                <Text style={styles.promptTitle}>Budget Not Set</Text>
                <Text style={styles.promptText}>
                  Set your monthly income to unlock the 50/30/20 budget breakdown and start
                  tracking your finances effectively.
                </Text>
                <TouchableOpacity
                  style={styles.promptButton}
                  onPress={() => setShowNoBudgetPrompt(false)}
                >
                  <Text style={styles.promptButtonText}>Get Started</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          )}

          {/* Income Input Card */}
          <View style={styles.incomeCard}>
            <View style={styles.incomeHeader}>
              <Text style={styles.incomeLabel}>Monthly Income</Text>
              {!isEditing && currentDisplayTotal > 0 && (
                <TouchableOpacity
                  onPress={() => setIsEditing(true)}
                  style={styles.editButton}
                >
                  <Icon name="pencil" size={16} color="#3B82F6" />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            {isEditing || currentDisplayTotal === 0 ? (
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>PKR</Text>
                <TextInput
                  style={styles.incomeInput}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#CBD5E1"
                  value={monthlyIncome}
                  onChangeText={(text) => setMonthlyIncome(text.replace(/[^0-9.]/g, ''))}
                  autoFocus={isEditing}
                />
              </View>
            ) : (
              <Text style={styles.incomeDisplay}>{formatCurrency(currentDisplayTotal)}</Text>
            )}

            {isEditing && (
              <View style={styles.inputActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setIsEditing(false);
                    setMonthlyIncome(budget?.total_budget ? String(budget.total_budget) : '');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.applyButton, incomeValue <= 0 && styles.applyButtonDisabled]}
                  onPress={saveBudgetHandler}
                  disabled={incomeValue <= 0 || saveStatus === 'saving'}
                >
                  {saveStatus === 'saving' ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.applyButtonText}>Apply</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* 50/30/20 Rule Info Card */}
          <View style={styles.ruleCard}>
            <View style={styles.ruleHeader}>
              <Icon name="chart-donut" size={24} color="#3B82F6" />
              <Text style={styles.ruleTitle}>50/30/20 Rule</Text>
            </View>
            <Text style={styles.ruleDescription}>
              A simple budgeting method that divides your after-tax income into three spending
              categories: 50% for needs, 30% for wants, and 20% for savings.
            </Text>
          </View>

          {/* Budget Breakdown */}
          {currentDisplayTotal === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="wallet-outline" size={80} color="#CBD5E1" />
              <Text style={styles.emptyStateTitle}>No Budget Set</Text>
              <Text style={styles.emptyStateText}>
                Enter your monthly income above to see your personalized budget breakdown
              </Text>
            </View>
          ) : (
            <View style={styles.breakdownContainer}>
              <Text style={styles.breakdownTitle}>Your Budget Breakdown</Text>

              {budgetCategories.map((category, index) => {
                const percentageOfTotal = currentDisplayTotal > 0
                  ? (category.amount / currentDisplayTotal) * 100
                  : 0;

                return (
                  <View key={index} style={styles.categoryCard}>
                    <LinearGradient
                      colors={category.gradient}
                      style={styles.categoryGradient}
                    >
                      {/* Category Header */}
                      <View style={styles.categoryHeader}>
                        <View style={styles.categoryIconWrapper}>
                          <Icon name={category.icon} size={28} color="#FFFFFF" />
                        </View>
                        <View style={styles.categoryInfo}>
                          <Text style={styles.categoryTitle}>
                            {category.title} ({category.percentage}%)
                          </Text>
                          <Text style={styles.categoryDescription}>{category.description}</Text>
                        </View>
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryPercentage}>{category.percentage}%</Text>
                        </View>
                      </View>

                      {/* Amount Display */}
                      <Text style={styles.categoryAmount}>{formatCurrency(category.amount)}</Text>

                      {/* Progress Bar */}
                      <View style={styles.progressBarContainer}>
                        <View
                          style={[styles.progressBar, { width: `${percentageOfTotal}%` }]}
                        />
                      </View>

                      {/* Examples */}
                      <View style={styles.examplesContainer}>
                        {category.examples.map((example, idx) => (
                          <View key={idx} style={styles.exampleTag}>
                            <Text style={styles.exampleText}>{example}</Text>
                          </View>
                        ))}
                      </View>
                    </LinearGradient>
                  </View>
                );
              })}

              {/* Total Summary Card */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Budget</Text>
                  <Text style={styles.summaryAmount}>{formatCurrency(currentDisplayTotal)}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryBreakdown}>
                  <View style={styles.summaryItem}>
                    <View style={[styles.summaryDot, { backgroundColor: '#10B981' }]} />
                    <Text style={styles.summaryItemText}>{formatCurrency(currentNeeds)}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <View style={[styles.summaryDot, { backgroundColor: '#F59E0B' }]} />
                    <Text style={styles.summaryItemText}>{formatCurrency(currentWants)}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <View style={[styles.summaryDot, { backgroundColor: '#3B82F6' }]} />
                    <Text style={styles.summaryItemText}>{formatCurrency(currentSavings)}</Text>
                  </View>
                </View>
              </View>

              {/* Status Messages */}
              {saveStatus === 'success' && budgetError?.message && (
                <View style={styles.successMessage}>
                  <Icon name="check-circle" size={20} color="#10B981" />
                  <Text style={styles.successText}>{budgetError.message}</Text>
                </View>
              )}

              {saveStatus === 'error' && budgetError?.message && (
                <View style={styles.errorMessage}>
                  <Icon name="alert-circle" size={20} color="#EF4444" />
                  <Text style={styles.errorText}>{budgetError.message}</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  headerIconButton: {
    padding: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  promptCard: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
  },
  promptGradient: {
    padding: 24,
    alignItems: 'center',
  },
  promptIconContainer: {
    marginBottom: 12,
  },
  promptTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 8,
  },
  promptText: {
    fontSize: 14,
    color: '#78350F',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  promptButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  promptButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  incomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  incomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  incomeLabel: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginRight: 8,
  },
  incomeInput: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    minWidth: 180,
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
    paddingVertical: 4,
  },
  incomeDisplay: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
  },
  inputActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  applyButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  applyButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  ruleCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  ruleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  ruleDescription: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#475569',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  breakdownContainer: {
    marginBottom: 20,
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  categoryCard: {
    marginBottom: 16,
    borderRadius: 24,
    overflow: 'hidden',
  },
  categoryGradient: {
    padding: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  categoryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  categoryPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  categoryAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  examplesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exampleTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  exampleText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
  summaryBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryItemText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#D1FAE5',
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  successText: {
    fontSize: 14,
    color: '#065F46',
    fontWeight: '500',
  },
  errorMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEE2E2',
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#991B1B',
    fontWeight: '500',
  },
});

export default BudgetScreen;