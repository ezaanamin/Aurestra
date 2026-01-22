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
  Animated,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBudget, saveBudget } from '../API/slice/API';
import { useSettings } from '../context/SettingsContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';

const { width } = Dimensions.get('window');

const BudgetScreen = ({ navigation }) => {
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [showNoBudgetPrompt, setShowNoBudgetPrompt] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [animatedValue] = useState(new Animated.Value(0));

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

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: 1,
      tension: 40,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  const { currency, colors, isDarkMode } = useSettings();

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

  const getCurrentMonthYear = () => {
    return new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  const budgetCategories = [
    {
      title: 'Needs',
      percentage: 50,
      amount: currentNeeds,
      icon: 'shield-check',
      color: '#10B981',
      gradient: ['#34D399', '#10B981'],
      darkGradient: ['#10B981', '#059669'],
      description: 'Essential expenses',
      examples: ['Housing', 'Food', 'Bills', 'Insurance'],
    },
    {
      title: 'Wants',
      percentage: 30,
      amount: currentWants,
      icon: 'star-shooting',
      color: '#F59E0B',
      gradient: ['#FBBF24', '#F59E0B'],
      darkGradient: ['#F59E0B', '#D97706'],
      description: 'Lifestyle & entertainment',
      examples: ['Streaming', 'Dining', 'Shopping', 'Hobbies'],
    },
    {
      title: 'Savings',
      percentage: 20,
      amount: currentSavings,
      icon: 'rocket-launch',
      color: '#8B5CF6',
      gradient: ['#A78BFA', '#8B5CF6'],
      darkGradient: ['#8B5CF6', '#7C3AED'],
      description: 'Future & investments',
      examples: ['Emergency', 'Stocks', 'Retirement', 'Goals'],
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#0A0A0B' : '#F8F9FE' }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />

      {/* Glassmorphic Header */}
      <View style={styles.headerContainer}>
        <LinearGradient 
          colors={isDarkMode ? ['#1A1A1D', '#0A0A0B'] : ['#FFFFFF', '#F8F9FE']} 
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <View style={[styles.iconButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                <Icon name="arrow-left" size={22} color={isDarkMode ? '#FFFFFF' : '#1A1A1D'} />
              </View>
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitle, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>Budget Planner</Text>
              <View style={styles.monthBadge}>
                <Icon name="calendar-outline" size={12} color={isDarkMode ? '#A78BFA' : '#8B5CF6'} />
                <Text style={[styles.headerSubtitle, { color: isDarkMode ? '#A78BFA' : '#8B5CF6' }]}>
                  {getCurrentMonthYear()}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.helpButton}>
              <View style={[styles.iconButton, { backgroundColor: isDarkMode ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.1)' }]}>
                <Icon name="help-circle-outline" size={22} color="#8B5CF6" />
              </View>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Income Card */}
          <Animated.View style={[
            styles.heroCard,
            {
              transform: [
                {
                  scale: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  }),
                },
              ],
              opacity: animatedValue,
            },
          ]}>
            <LinearGradient
              colors={isDarkMode ? ['#8B5CF6', '#7C3AED'] : ['#8B5CF6', '#6D28D9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGradient}
            >
              {/* Decorative circles */}
              <View style={[styles.decorCircle, styles.decorCircle1]} />
              <View style={[styles.decorCircle, styles.decorCircle2]} />
              
              <View style={styles.heroContent}>
                <View style={styles.heroHeader}>
                  <View style={styles.heroIconContainer}>
                    <Icon name="wallet" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.heroLabel}>Monthly Income</Text>
                  {!isEditing && currentDisplayTotal > 0 && (
                    <TouchableOpacity
                      onPress={() => setIsEditing(true)}
                      style={styles.editIconButton}
                    >
                      <Icon name="pencil" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>

                {isEditing || currentDisplayTotal === 0 ? (
                  <View style={styles.inputWrapper}>
                    <View style={styles.currencyInputContainer}>
                      <Text style={styles.currencyPrefix}>PKR</Text>
                      <TextInput
                        style={styles.heroInput}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        value={monthlyIncome}
                        onChangeText={(text) => setMonthlyIncome(text.replace(/[^0-9.]/g, ''))}
                        autoFocus={isEditing}
                      />
                    </View>
                    
                    {isEditing && (
                      <View style={styles.quickActions}>
                        <TouchableOpacity
                          style={styles.quickActionButton}
                          onPress={() => {
                            setIsEditing(false);
                            setMonthlyIncome(budget?.total_budget ? String(budget.total_budget) : '');
                          }}
                        >
                          <Icon name="close" size={18} color="#FFFFFF" />
                          <Text style={styles.quickActionText}>Cancel</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[styles.quickActionButton, styles.quickActionPrimary]}
                          onPress={saveBudgetHandler}
                          disabled={incomeValue <= 0 || saveStatus === 'saving'}
                        >
                          {saveStatus === 'saving' ? (
                            <ActivityIndicator color="#8B5CF6" size="small" />
                          ) : (
                            <>
                              <Icon name="check" size={18} color="#8B5CF6" />
                              <Text style={[styles.quickActionText, { color: '#8B5CF6' }]}>Save</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.heroAmountContainer}>
                    <Text style={styles.heroAmount}>{formatCurrency(currentDisplayTotal)}</Text>
                    <View style={styles.statusIndicator}>
                      <View style={styles.statusDot} />
                      <Text style={styles.statusText}>Active Budget</Text>
                    </View>
                  </View>
                )}
              </View>
            </LinearGradient>
          </Animated.View>

          {/* 50/30/20 Info Banner */}
          {!showNoBudgetPrompt && (
            <View style={[styles.infoBanner, { backgroundColor: isDarkMode ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.08)' }]}>
              <View style={styles.infoIconWrapper}>
                <Icon name="lightbulb-on" size={18} color="#8B5CF6" />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoTitle, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                  50/30/20 Rule Applied
                </Text>
                <Text style={[styles.infoText, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
                  Smart budgeting for balanced financial health
                </Text>
              </View>
            </View>
          )}

          {/* No Budget Prompt */}
          {showNoBudgetPrompt && (
            <View style={styles.emptyStateCard}>
              <LinearGradient
                colors={['#FBBF24', '#F59E0B']}
                style={styles.emptyGradient}
              >
                <View style={styles.emptyIconContainer}>
                  <Icon name="chart-timeline-variant" size={48} color="#FFFFFF" />
                </View>
                <Text style={styles.emptyTitle}>Start Your Budget Journey</Text>
                <Text style={styles.emptyText}>
                  Enter your monthly income to unlock personalized budgeting insights
                </Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => setShowNoBudgetPrompt(false)}
                >
                  <Text style={styles.emptyButtonText}>Get Started</Text>
                  <Icon name="arrow-right" size={18} color="#F59E0B" />
                </TouchableOpacity>
              </LinearGradient>
            </View>
          )}

          {/* Budget Categories */}
          {currentDisplayTotal > 0 ? (
            <View style={styles.categoriesContainer}>
              <Text style={[styles.sectionTitle, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                Your Budget
              </Text>

              {budgetCategories.map((category, index) => {
                const percentageOfTotal = currentDisplayTotal > 0
                  ? (category.amount / currentDisplayTotal) * 100
                  : 0;

                return (
                  <Animated.View
                    key={index}
                    style={[
                      styles.categoryCard,
                      {
                        transform: [
                          {
                            translateY: animatedValue.interpolate({
                              inputRange: [0, 1],
                              outputRange: [50, 0],
                            }),
                          },
                        ],
                        opacity: animatedValue,
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={isDarkMode ? category.darkGradient : category.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.categoryGradient}
                    >
                      <View style={styles.categoryTop}>
                        <View style={styles.categoryLeft}>
                          <View style={styles.categoryIconBox}>
                            <Icon name={category.icon} size={24} color="#FFFFFF" />
                          </View>
                          <View style={styles.categoryMeta}>
                            <Text style={styles.categoryTitle}>{category.title}</Text>
                            <Text style={styles.categoryDesc}>{category.description}</Text>
                          </View>
                        </View>
                        
                        <View style={styles.percentagePill}>
                          <Text style={styles.percentageText}>{category.percentage}%</Text>
                        </View>
                      </View>

                      <Text style={styles.categoryAmount}>{formatCurrency(category.amount)}</Text>

                      {/* Modern Progress Bar */}
                      <View style={styles.progressContainer}>
                        <View style={styles.progressTrack}>
                          <Animated.View
                            style={[
                              styles.progressFill,
                              {
                                width: animatedValue.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: ['0%', `${percentageOfTotal}%`],
                                }),
                              },
                            ]}
                          />
                        </View>
                      </View>

                      {/* Tags */}
                      <View style={styles.tagsContainer}>
                        {category.examples.map((example, idx) => (
                          <View key={idx} style={styles.tag}>
                            <Text style={styles.tagText}>{example}</Text>
                          </View>
                        ))}
                      </View>
                    </LinearGradient>
                  </Animated.View>
                );
              })}

              {/* Summary Card */}
              <View style={[styles.summaryCard, { 
                backgroundColor: isDarkMode ? '#1A1A1D' : '#FFFFFF',
                borderColor: isDarkMode ? '#27272A' : '#E4E4E7'
              }]}>
                <Text style={[styles.summaryTitle, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                  Budget Overview
                </Text>
                
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryItem}>
                    <View style={[styles.summaryDot, { backgroundColor: '#10B981' }]} />
                    <View>
                      <Text style={[styles.summaryLabel, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
                        Needs
                      </Text>
                      <Text style={[styles.summaryValue, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                        {formatCurrency(currentNeeds)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.summaryItem}>
                    <View style={[styles.summaryDot, { backgroundColor: '#F59E0B' }]} />
                    <View>
                      <Text style={[styles.summaryLabel, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
                        Wants
                      </Text>
                      <Text style={[styles.summaryValue, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                        {formatCurrency(currentWants)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.summaryItem}>
                    <View style={[styles.summaryDot, { backgroundColor: '#8B5CF6' }]} />
                    <View>
                      <Text style={[styles.summaryLabel, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
                        Savings
                      </Text>
                      <Text style={[styles.summaryValue, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                        {formatCurrency(currentSavings)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Status Messages */}
              {saveStatus === 'success' && budgetError?.message && (
                <View style={styles.successBanner}>
                  <Icon name="check-circle" size={20} color="#10B981" />
                  <Text style={styles.successText}>{budgetError.message}</Text>
                </View>
              )}

              {saveStatus === 'error' && budgetError?.message && (
                <View style={styles.errorBanner}>
                  <Icon name="alert-circle" size={20} color="#EF4444" />
                  <Text style={styles.errorText}>{budgetError.message}</Text>
                </View>
              )}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {},
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  monthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(139,92,246,0.1)',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  helpButton: {},
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  heroCard: {
    marginBottom: 16,
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  heroGradient: {
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorCircle1: {
    top: -100,
    right: -50,
  },
  decorCircle2: {
    bottom: -80,
    left: -60,
  },
  heroContent: {
    zIndex: 1,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  heroIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.3,
  },
  editIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrapper: {
    gap: 16,
  },
  currencyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  currencyPrefix: {
    fontSize: 24,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  heroInput: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    minWidth: 200,
    letterSpacing: -1,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  quickActionPrimary: {
    backgroundColor: '#FFFFFF',
  },
  quickActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  heroAmountContainer: {
    alignItems: 'center',
    gap: 12,
  },
  heroAmount: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 20,
    marginBottom: 24,
  },
  infoIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139,92,246,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyStateCard: {
    marginBottom: 24,
    borderRadius: 28,
    overflow: 'hidden',
  },
  emptyGradient: {
    padding: 32,
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F59E0B',
  },
  categoriesContainer: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  categoryCard: {
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  categoryGradient: {
    padding: 20,
  },
  categoryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  categoryIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryMeta: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  categoryDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  percentagePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  percentageText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  categoryAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  summaryCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  summaryGrid: {
    gap: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(139,92,246,0.05)',
  },
  summaryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#D1FAE5',
    marginTop: 16,
  },
  successText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    marginTop: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B',
  },
});

export default BudgetScreen;