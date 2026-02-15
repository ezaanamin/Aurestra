import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Animated
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import CustomAlert from '../components/CustomAlert';
import { useSettings } from '../context/SettingsContext';
import {
  fetchSavingsGoals,
  fetchTopSpendingCategories,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  contributeToSavingsGoal,
  fetchUserAccounts,
  fetchCategories
} from '../API/slice/API';

const { width } = Dimensions.get('window');

const CATEGORY_DETAILS_MAP = {
  "Food & Snacks": { icon: 'food', color: '#10B981' },
  "Ride / Transport": { icon: 'car', color: '#F59E0B' },
  "Bills & Utilities": { icon: 'receipt', color: '#3B82F6' },
  "Shopping": { icon: 'shopping', color: '#8B5CF6' },
  "Healthcare": { icon: 'hospital', color: '#10B981' },
  "Entertainment": { icon: 'movie', color: '#EC4899' },
  "Education": { icon: 'school', color: '#6366F1' },
  "Groceries": { icon: 'cart-outline', color: '#059669' },
  "Personal Care": { icon: 'sparkles', color: '#C084FC' },
  "Online Services": { icon: 'web', color: '#60A5FA' },
  "Gym & Fitness": { icon: 'dumbbell', color: '#F87171' },
  "Subscription (Google one )": { icon: 'credit-card-settings-outline', color: '#8B5CF6' },
  "Miscellaneous": { icon: 'dots-horizontal', color: '#64748B' },
  "Income": { icon: 'bank-transfer-in', color: '#10B981' },
};

const CategoryScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { colors, isDarkMode } = useSettings();
  const [animatedValue] = useState(new Animated.Value(0));
  const [activeTab, setActiveTab] = useState('goals');
  const [modalVisible, setModalVisible] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState(null);
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [goalEmoji, setGoalEmoji] = useState('💰');
  const [initialAmount, setInitialAmount] = useState('');

  const [creating, setCreating] = useState(false);
  const [contributeModalVisible, setContributeModalVisible] = useState(false);
  const [contributeAmount, setContributeAmount] = useState('');
  const [selectedGoalForFunds, setSelectedGoalForFunds] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'error',
    onConfirm: null,
    showCancel: false
  });

  // Redux Data
  const savingsGoals = useSelector((state) => state.API.savingsGoals);
  const goalsStatus = useSelector((state) => state.API.goalsStatus);
  const topCategories = useSelector((state) => state.API.topCategories);
  const topCategoriesStatus = useSelector((state) => state.API.topCategoriesStatus);
  const accounts = useSelector((state) => state.API.accounts);
  const categories = useSelector((state) => state.API.categories);
  const currentSummary = useSelector((state) => state.API.currentSummary);
  const budget = useSelector((state) => state.API.budget);

  useEffect(() => {
    loadData();
    Animated.spring(animatedValue, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  const showAlert = (title, message, type = 'error', onConfirm = null, showCancel = false) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      onConfirm: onConfirm || (() => setAlertConfig(prev => ({ ...prev, visible: false }))),
      showCancel
    });
  };

  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const getCategoryDetails = (categoryName) => {
    if (CATEGORY_DETAILS_MAP[categoryName]) {
      return CATEGORY_DETAILS_MAP[categoryName];
    }
    const found = categories?.find(c => c.name === categoryName);
    if (found) {
      return { icon: found.icon, color: found.color };
    }
    return CATEGORY_DETAILS_MAP['Miscellaneous'];
  };

  const loadData = () => {
    dispatch(fetchSavingsGoals());
    dispatch(fetchTopSpendingCategories());
    dispatch(fetchUserAccounts());
    dispatch(fetchCategories());
  };

  // Calculations
  const activeGoals = (savingsGoals || []).filter(goal => (goal.current_amount || 0) < (goal.target_amount || 0));
  const completedGoals = (savingsGoals || []).filter(goal => (goal.current_amount || 0) >= (goal.target_amount || 0) && (goal.current_amount > 0));

  const rawAvailable = accounts?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;
  const availableSavings = Math.abs(rawAvailable);
  const totalGoalsAllocated = (savingsGoals || []).reduce((sum, goal) => sum + (goal.current_amount || 0), 0);
  const grossBalance = rawAvailable + totalGoalsAllocated;
  const totalActiveAllocated = activeGoals.reduce((sum, goal) => sum + (goal.current_amount || 0), 0);
  const totalActiveGoalsAmount = activeGoals.reduce((sum, goal) => sum + (goal.target_amount || 1), 0);
  const overallProgress = totalActiveGoalsAmount > 0 ? (totalActiveAllocated / totalActiveGoalsAmount) * 100 : 0;
  const totalSpending = topCategories ? topCategories.reduce((sum, cat) => sum + cat.total_spent, 0) : 1;

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      setGoalDeadline(`${year}-${month}-${day}`);
    }
  };

  const openCreateModal = () => {
    setGoalToEdit(null);
    setGoalName('');
    setGoalTarget('');
    setGoalDeadline('');
    setGoalEmoji('💰');
    setInitialAmount('0');
    setModalVisible(true);
  };

  const openEditModal = (goal) => {
    setGoalToEdit(goal);
    setGoalName(goal.name);
    setGoalTarget(String(goal.target_amount));
    setGoalDeadline(goal.deadline || '');
    setGoalEmoji(goal.emoji || '💰');
    setInitialAmount(String(goal.current_amount || 0));
    setModalVisible(true);
  };

  const handleCreateOrUpdateGoal = async () => {
    if (!goalName.trim() || !goalTarget) {
      showAlert("Missing Fields", "Please enter a name and target amount.");
      return;
    }

    if (goalName.trim().length < 3) {
      showAlert("Invalid Name", "Goal name should be at least 3 characters long.");
      return;
    }

    const target = parseFloat(goalTarget);
    const initial = parseFloat(initialAmount || 0);

    if (isNaN(target) || target <= 0) {
      showAlert("Invalid Target", "Target amount must be a positive number.");
      return;
    }

    if (isNaN(initial) || initial < 0) {
      showAlert("Invalid Amount", "Current saved amount cannot be negative.");
      return;
    }

    if (initial > target) {
      showAlert("Target Reached?", "Current amount cannot exceed the target amount.");
      return;
    }

    const currentGoalAmount = goalToEdit ? goalToEdit.current_amount : 0;
    const additionalFundsNeeded = initial - currentGoalAmount;

    if (additionalFundsNeeded > availableSavings) {
      showAlert("Insufficient Funds", `You only have ${formatCurrency(availableSavings)} available in your savings pool.`);
      return;
    }

    if (goalEmoji && goalEmoji.trim().length > 10) {
      showAlert("Invalid Emoji", "Please use a shorter emoji or icon name.");
      return;
    }

    if (goalDeadline) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(goalDeadline)) {
        showAlert("Invalid Date", "Please use the format YYYY-MM-DD for the deadline.");
        return;
      }

      const deadlineDate = new Date(goalDeadline);
      if (isNaN(deadlineDate.getTime())) {
        showAlert("Invalid Date", "Please enter a valid future date.");
        return;
      }

      if (deadlineDate < new Date().setHours(0, 0, 0, 0)) {
        showAlert("Past Date", "Deadline cannot be in the past.");
        return;
      }
    }

    setCreating(true);
    try {
      const goalData = {
        name: goalName.trim(),
        target_amount: target,
        current_amount: initial,
        emoji: goalEmoji.trim(),
        deadline: goalDeadline || null
      };

      let resultAction;
      if (goalToEdit) {
        resultAction = await dispatch(updateSavingsGoal({ id: goalToEdit.id, data: goalData }));
      } else {
        resultAction = await dispatch(createSavingsGoal(goalData));
      }

      if (resultAction.meta.requestStatus === 'fulfilled') {
        const isUpdate = !!goalToEdit;
        setModalVisible(false);
        setGoalToEdit(null);
        setGoalName('');
        setGoalTarget('');
        setGoalDeadline('');
        setGoalEmoji('💰');
        setInitialAmount('0');
        showAlert("Success", `Goal ${isUpdate ? 'updated' : 'created'} successfully!`, 'success');
        dispatch(fetchUserAccounts());
      } else {
        showAlert("Error", resultAction.payload || "Failed to save goal");
      }
    } catch (e) {
      showAlert("Error", "An unexpected error occurred");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGoal = async () => {
    if (!goalToEdit) return;

    showAlert(
      "Delete Goal",
      "Are you sure you want to delete this goal?",
      'error',
      async () => {
        try {
          const result = await dispatch(deleteSavingsGoal(goalToEdit.id));
          if (result.meta.requestStatus === 'fulfilled') {
            setModalVisible(false);
            hideAlert();
            showAlert("Deleted", "Goal removed successfully", 'success');
            dispatch(fetchUserAccounts());
          } else {
            showAlert("Error", "Failed to delete goal");
          }
        } catch (e) {
          showAlert("Error", "An unexpected error occurred");
        }
      },
      true
    );
  };

  const openContributeModal = (goal) => {
    setSelectedGoalForFunds(goal);
    setContributeAmount('');
    setContributeModalVisible(true);
  };

  const handleContribute = async () => {
    const amount = parseFloat(contributeAmount);
    if (!contributeAmount || isNaN(amount) || amount <= 0) {
      showAlert("Invalid Amount", "Please enter a valid amount greater than zero.");
      return;
    }

    if (amount > availableSavings) {
      showAlert("Insufficient Funds", "You don't have enough unallocated savings to add this amount.");
      return;
    }

    try {
      const result = await dispatch(contributeToSavingsGoal({
        id: selectedGoalForFunds.id,
        amount: amount
      }));

      if (result.meta.requestStatus === 'fulfilled') {
        setContributeModalVisible(false);
        setContributeAmount('');
        showAlert("Success", "Funds added successfully!", 'success');
        dispatch(fetchUserAccounts());
      } else {
        showAlert("Error", result.payload || "Failed to add funds");
      }
    } catch (e) {
      showAlert("Error", "An unexpected error occurred");
    }
  };

  const formatCurrency = (amount) => {
    const safeAmount = Number(amount) || 0;
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(safeAmount);
  };

  const gradients = [
    ['#8B5CF6', '#7C3AED'],
    ['#3B82F6', '#2563EB'],
    ['#10B981', '#059669'],
    ['#EC4899', '#DB2777'],
    ['#F59E0B', '#D97706']
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#0A0A0B' : '#F8F9FE' }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />

      {/* Modern Header */}
      <View style={styles.headerSection}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={[styles.headerGreeting, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
              Financial Goals
            </Text>
            <Text style={[styles.headerTitle, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
              Savings & Goals
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addButton, {
              backgroundColor: isDarkMode ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.1)'
            }]}
            onPress={activeTab === 'goals' ? openCreateModal : () => navigation.navigate('CategoryManagement')}
          >
            <Icon name={activeTab === 'goals' ? "plus" : "cog"} size={24} color="#8B5CF6" />
          </TouchableOpacity>
        </View>

        {/* Wealth Overview Card */}
        <Animated.View style={[
          styles.wealthCard,
          {
            transform: [{
              scale: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.95, 1],
              })
            }],
            opacity: animatedValue,
          }
        ]}>
          <LinearGradient
            colors={isDarkMode ? ['#8B5CF6', '#7C3AED'] : ['#8B5CF6', '#6D28D9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.wealthGradient}
          >
            {/* Decorative elements */}
            <View style={[styles.decorCircle, styles.decorCircle1]} />
            <View style={[styles.decorCircle, styles.decorCircle2]} />

            <View style={styles.wealthContent}>
              <View style={styles.wealthHeader}>
                <View style={styles.wealthIconContainer}>
                  <Icon name="treasure-chest" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.wealthLabel}>Total Wealth</Text>
              </View>

              <Text style={styles.wealthAmount}>{formatCurrency(grossBalance)}</Text>

              <View style={styles.wealthStats}>
                <View style={styles.wealthStat}>
                  <View style={styles.wealthStatDot} />
                  <View>
                    <Text style={styles.wealthStatLabel}>Available</Text>
                    <Text style={styles.wealthStatValue}>{formatCurrency(availableSavings)}</Text>
                  </View>
                </View>

                <View style={styles.wealthStatDivider} />

                <View style={styles.wealthStat}>
                  <View style={[styles.wealthStatDot, { backgroundColor: '#FBBF24' }]} />
                  <View>
                    <Text style={styles.wealthStatLabel}>Allocated</Text>
                    <Text style={styles.wealthStatValue}>{formatCurrency(totalGoalsAllocated)}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.wealthProgress}>
                <View style={styles.wealthProgressTrack}>
                  <View
                    style={[
                      styles.wealthProgressFill,
                      {
                        width: `${Math.min((totalGoalsAllocated / (grossBalance || 1)) * 100, 100)}%`,
                      }
                    ]}
                  />
                </View>
                <Text style={styles.wealthProgressText}>
                  {Math.min((totalGoalsAllocated / (grossBalance || 1)) * 100, 100).toFixed(1)}% Allocated
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Tab Switcher */}
        <View style={[styles.tabContainer, {
          backgroundColor: isDarkMode ? '#1A1A1D' : '#FFFFFF',
          borderColor: isDarkMode ? '#27272A' : '#E4E4E7'
        }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'goals' && styles.tabActive,
              activeTab === 'goals' && { backgroundColor: isDarkMode ? '#8B5CF6' : '#8B5CF6' }
            ]}
            onPress={() => setActiveTab('goals')}
          >
            <Icon
              name="flag-checkered"
              size={18}
              color={activeTab === 'goals' ? '#FFFFFF' : (isDarkMode ? '#A1A1AA' : '#71717A')}
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'goals' ? '#FFFFFF' : (isDarkMode ? '#A1A1AA' : '#71717A') }
            ]}>
              Goals
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'categories' && styles.tabActive,
              activeTab === 'categories' && { backgroundColor: isDarkMode ? '#8B5CF6' : '#8B5CF6' }
            ]}
            onPress={() => setActiveTab('categories')}
          >
            <Icon
              name="view-grid"
              size={18}
              color={activeTab === 'categories' ? '#FFFFFF' : (isDarkMode ? '#A1A1AA' : '#71717A')}
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'categories' ? '#FFFFFF' : (isDarkMode ? '#A1A1AA' : '#71717A') }
            ]}>
              Categories
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'goals' ? (
          <View style={styles.goalsContainer}>
            {goalsStatus === 'loading' && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
              </View>
            )}

            {goalsStatus !== 'loading' && activeGoals.length === 0 && (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, {
                  backgroundColor: isDarkMode ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.08)'
                }]}>
                  <Icon name="target" size={48} color="#8B5CF6" />
                </View>
                <Text style={[styles.emptyTitle, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                  No Active Goals
                </Text>
                <Text style={[styles.emptyText, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
                  Create your first savings goal to start tracking your progress
                </Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={openCreateModal}
                >
                  <Icon name="plus" size={20} color="#FFFFFF" />
                  <Text style={styles.emptyButtonText}>Create Goal</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeGoals.map((goal, index) => {
              const current = goal.current_amount || 0;
              const target = goal.target_amount || 1;
              const percentage = (current / target) * 100;
              const remaining = Math.max(target - current, 0);
              const gradient = gradients[index % gradients.length];

              return (
                <Animated.View
                  key={goal.id || index}
                  style={[
                    styles.goalCard,
                    {
                      transform: [{
                        translateY: animatedValue.interpolate({
                          inputRange: [0, 1],
                          outputRange: [50, 0],
                        })
                      }],
                      opacity: animatedValue,
                    }
                  ]}
                >
                  <TouchableOpacity onPress={() => openEditModal(goal)}>
                    <LinearGradient
                      colors={gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.goalGradient}
                    >
                      <View style={styles.goalHeader}>
                        <View style={styles.goalIcon}>
                          <Text style={styles.goalEmoji}>{goal.emoji || '💰'}</Text>
                        </View>
                        <View style={styles.goalMeta}>
                          <Text style={styles.goalName}>{goal.name}</Text>
                          {goal.deadline && (
                            <View style={styles.goalDeadline}>
                              <Icon name="calendar-clock" size={12} color="rgba(255,255,255,0.8)" />
                              <Text style={styles.goalDeadlineText}>{goal.deadline}</Text>
                            </View>
                          )}
                        </View>
                        <TouchableOpacity
                          style={styles.goalEdit}
                          onPress={() => openEditModal(goal)}
                        >
                          <Icon name="pencil" size={18} color="rgba(255,255,255,0.9)" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.goalAmounts}>
                        <View>
                          <Text style={styles.goalCurrent}>{formatCurrency(current)}</Text>
                          <Text style={styles.goalTarget}>of {formatCurrency(target)}</Text>
                        </View>
                        <View style={styles.goalPercentage}>
                          <Text style={styles.goalPercentageText}>{percentage.toFixed(0)}%</Text>
                        </View>
                      </View>

                      <View style={styles.goalProgressBar}>
                        <Animated.View
                          style={[
                            styles.goalProgressFill,
                            {
                              width: animatedValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', `${Math.min(percentage, 100)}%`],
                              }),
                            }
                          ]}
                        />
                      </View>

                      <View style={styles.goalFooter}>
                        <View style={styles.goalRemaining}>
                          <Icon name="flag-checkered" size={14} color="rgba(255,255,255,0.9)" />
                          <Text style={styles.goalRemainingText}>
                            {formatCurrency(remaining)} to go
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.addFundsButton}
                          onPress={() => openContributeModal(goal)}
                        >
                          <Icon name="plus-circle" size={16} color="#FFFFFF" />
                          <Text style={styles.addFundsText}>Add Funds</Text>
                        </TouchableOpacity>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}

            {activeGoals.length > 0 && (
              <TouchableOpacity
                style={[styles.createButton, {
                  backgroundColor: isDarkMode ? '#1A1A1D' : '#FFFFFF',
                  borderColor: isDarkMode ? '#27272A' : '#E4E4E7'
                }]}
                onPress={openCreateModal}
              >
                <View style={[styles.createIcon, {
                  backgroundColor: isDarkMode ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.1)'
                }]}>
                  <Icon name="plus" size={24} color="#8B5CF6" />
                </View>
                <View style={styles.createContent}>
                  <Text style={[styles.createTitle, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                    Create New Goal
                  </Text>
                  <Text style={[styles.createSubtitle, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
                    Set a new savings target
                  </Text>
                </View>
                <Icon name="chevron-right" size={20} color={isDarkMode ? '#52525B' : '#A1A1AA'} />
              </TouchableOpacity>
            )}

            {completedGoals.length > 0 && (
              <View style={styles.completedSection}>
                <Text style={[styles.sectionTitle, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                  Completed Goals 🎉
                </Text>
                <Text style={[styles.sectionSubtitle, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
                  Goals you've successfully achieved
                </Text>

                {completedGoals.map((goal, index) => (
                  <TouchableOpacity
                    key={`completed-${index}`}
                    style={[styles.completedCard, {
                      backgroundColor: isDarkMode ? '#1A1A1D' : '#FFFFFF',
                      borderColor: isDarkMode ? '#10B981' : '#10B981'
                    }]}
                    onPress={() => openEditModal(goal)}
                  >
                    <View style={styles.completedIcon}>
                      <Text style={{ fontSize: 32 }}>{goal.emoji || '🎉'}</Text>
                    </View>
                    <View style={styles.completedInfo}>
                      <Text style={[styles.completedName, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                        {goal.name}
                      </Text>
                      <Text style={styles.completedAmount}>
                        {formatCurrency(goal.current_amount)}
                      </Text>
                    </View>
                    <View style={styles.completedBadge}>
                      <Icon name="check-circle" size={20} color="#10B981" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.categoriesContainer}>
            <View style={styles.categoriesHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                  Spending Categories
                </Text>
                <Text style={[styles.sectionSubtitle, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
                  Track expenses by category
                </Text>
              </View>
              <TouchableOpacity
                style={styles.manageButton}
                onPress={() => navigation.navigate('CategoryManagement')}
              >
                <Text style={styles.manageButtonText}>Manage</Text>
                <Icon name="chevron-right" size={16} color="#8B5CF6" />
              </TouchableOpacity>
            </View>

            {topCategoriesStatus === 'loading' && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
              </View>
            )}

            <View style={styles.categoryGrid}>
              {topCategories && topCategories.map((cat, index) => {
                const details = getCategoryDetails(cat.category);
                const percentage = totalSpending > 0 ? (cat.total_spent / totalSpending) * 100 : 0;

                return (
                  <View
                    key={index}
                    style={[styles.categoryCard, {
                      backgroundColor: isDarkMode ? '#1A1A1D' : '#FFFFFF',
                      borderColor: isDarkMode ? '#27272A' : '#E4E4E7'
                    }]}
                  >
                    <View style={[styles.categoryIcon, { backgroundColor: (details.color || '#64748B') + '20' }]}>
                      <Icon name={details.icon} size={28} color={details.color || '#64748B'} />
                    </View>
                    <Text style={[styles.categoryName, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]} numberOfLines={1}>
                      {cat.category}
                    </Text>
                    <Text style={[styles.categoryAmount, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                      {formatCurrency(cat.total_spent)}
                    </Text>
                    <View style={styles.categoryProgressContainer}>
                      <View style={styles.categoryProgressTrack}>
                        <Animated.View
                          style={[
                            styles.categoryProgressFill,
                            {
                              backgroundColor: details.color,
                              width: animatedValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', `${Math.min(percentage, 100)}%`],
                              }),
                            }
                          ]}
                        />
                      </View>
                    </View>
                    <Text style={[styles.categoryPercent, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
                      {percentage.toFixed(1)}% of total
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Create/Edit Goal Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          <View style={[styles.modalContent, {
            backgroundColor: isDarkMode ? '#1A1A1D' : '#FFFFFF'
          }]}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                  {goalToEdit ? 'Edit Goal' : 'Create New Goal'}
                </Text>
                <Text style={[styles.modalSubtitle, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
                  {goalToEdit ? 'Update your savings goal' : 'Set a new savings target'}
                </Text>
              </View>
              <View style={styles.modalHeaderActions}>
                {goalToEdit && (
                  <TouchableOpacity
                    style={[styles.modalActionButton, { backgroundColor: isDarkMode ? '#27272A' : '#FEE2E2' }]}
                    onPress={handleDeleteGoal}
                  >
                    <Icon name="trash-can-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.modalActionButton, { backgroundColor: isDarkMode ? '#27272A' : '#F4F4F5' }]}
                  onPress={() => setModalVisible(false)}
                >
                  <Icon name="close" size={20} color={isDarkMode ? '#A1A1AA' : '#71717A'} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
                  Goal Name
                </Text>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: isDarkMode ? '#27272A' : '#F4F4F5',
                    color: isDarkMode ? '#FFFFFF' : '#1A1A1D',
                    borderColor: isDarkMode ? '#3F3F46' : '#E4E4E7'
                  }]}
                  placeholder="e.g., Dream Vacation"
                  placeholderTextColor={isDarkMode ? '#71717A' : '#A1A1AA'}
                  value={goalName}
                  onChangeText={setGoalName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
                  Target Amount (PKR)
                </Text>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: isDarkMode ? '#27272A' : '#F4F4F5',
                    color: isDarkMode ? '#FFFFFF' : '#1A1A1D',
                    borderColor: isDarkMode ? '#3F3F46' : '#E4E4E7'
                  }]}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor={isDarkMode ? '#71717A' : '#A1A1AA'}
                  value={goalTarget}
                  onChangeText={setGoalTarget}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
                  Emoji (Optional)
                </Text>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: isDarkMode ? '#27272A' : '#F4F4F5',
                    color: isDarkMode ? '#FFFFFF' : '#1A1A1D',
                    borderColor: isDarkMode ? '#3F3F46' : '#E4E4E7'
                  }]}
                  placeholder="💰"
                  placeholderTextColor={isDarkMode ? '#71717A' : '#A1A1AA'}
                  value={goalEmoji}
                  onChangeText={setGoalEmoji}
                  maxLength={4}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
                  Deadline (Optional)
                </Text>
                <TouchableOpacity
                  style={[styles.input, {
                    backgroundColor: isDarkMode ? '#27272A' : '#F4F4F5',
                    borderColor: isDarkMode ? '#3F3F46' : '#E4E4E7',
                    justifyContent: 'center'
                  }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={{ color: goalDeadline ? (isDarkMode ? '#FFFFFF' : '#1A1A1D') : (isDarkMode ? '#71717A' : '#A1A1AA') }}>
                    {goalDeadline || 'Select a deadline'}
                  </Text>
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={goalDeadline ? new Date(goalDeadline) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  minimumDate={new Date()}
                />
              )}

              {goalToEdit && (
                <View style={styles.inputGroup}>
                  <View style={styles.inputLabelRow}>
                    <Text style={[styles.inputLabel, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
                      Current Saved Amount (PKR)
                    </Text>
                    <View style={styles.availableBadge}>
                      <Icon name="wallet" size={10} color="#10B981" />
                      <Text style={styles.availableBadgeText}>
                        {formatCurrency(availableSavings + (goalToEdit ? goalToEdit.current_amount : 0))} available
                      </Text>
                    </View>
                  </View>
                  <TextInput
                    style={[styles.input, {
                      backgroundColor: isDarkMode ? '#27272A' : '#F4F4F5',
                      color: isDarkMode ? '#FFFFFF' : '#1A1A1D',
                      borderColor: isDarkMode ? '#3F3F46' : '#E4E4E7'
                    }]}
                    placeholder="0"
                    keyboardType="numeric"
                    placeholderTextColor={isDarkMode ? '#71717A' : '#A1A1AA'}
                    value={initialAmount}
                    onChangeText={setInitialAmount}
                  />
                </View>
              )}

              <TouchableOpacity
                style={[styles.saveButton, creating && { opacity: 0.7 }]}
                onPress={handleCreateOrUpdateGoal}
                disabled={creating}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#7C3AED']}
                  style={styles.saveButtonGradient}
                >
                  {creating ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Icon name={goalToEdit ? 'check' : 'plus'} size={20} color="#FFFFFF" />
                      <Text style={styles.saveButtonText}>
                        {goalToEdit ? 'Save Changes' : 'Create Goal'}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Contribute Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={contributeModalVisible}
        onRequestClose={() => setContributeModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setContributeModalVisible(false)}
          />
          <View style={[styles.contributeModalContent, {
            backgroundColor: isDarkMode ? '#1A1A1D' : '#FFFFFF'
          }]}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                  Add Funds
                </Text>
                <Text style={[styles.modalSubtitle, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
                  Contribute to {selectedGoalForFunds?.name}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.modalActionButton, { backgroundColor: isDarkMode ? '#27272A' : '#F4F4F5' }]}
                onPress={() => setContributeModalVisible(false)}
              >
                <Icon name="close" size={20} color={isDarkMode ? '#A1A1AA' : '#71717A'} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.contributeGoalDisplay}>
                <View style={[styles.contributeGoalIcon, {
                  backgroundColor: isDarkMode ? '#27272A' : '#F4F4F5'
                }]}>
                  <Text style={styles.contributeGoalEmoji}>{selectedGoalForFunds?.emoji || '💰'}</Text>
                </View>
                <Text style={[styles.contributeGoalName, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                  {selectedGoalForFunds?.name}
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Text style={[styles.inputLabel, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
                    Amount to Save
                  </Text>
                  <View style={styles.availableBadge}>
                    <Icon name="wallet" size={10} color="#10B981" />
                    <Text style={styles.availableBadgeText}>
                      {formatCurrency(availableSavings)} available
                    </Text>
                  </View>
                </View>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: isDarkMode ? '#27272A' : '#F4F4F5',
                    color: isDarkMode ? '#FFFFFF' : '#1A1A1D',
                    borderColor: isDarkMode ? '#3F3F46' : '#E4E4E7'
                  }]}
                  placeholder="0"
                  keyboardType="numeric"
                  autoFocus={true}
                  placeholderTextColor={isDarkMode ? '#71717A' : '#A1A1AA'}
                  value={contributeAmount}
                  onChangeText={setContributeAmount}
                />
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleContribute}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.saveButtonGradient}
                >
                  <Icon name="check-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Confirm Deposit</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={hideAlert}
        onConfirm={alertConfig.onConfirm}
        showCancel={alertConfig.showCancel}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSection: {
    paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  headerGreeting: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wealthCard: {
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  wealthGradient: {
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
  wealthContent: {
    zIndex: 1,
  },
  wealthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  wealthIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wealthLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.3,
  },
  wealthAmount: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 20,
  },
  wealthStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  wealthStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wealthStatDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  wealthStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    marginBottom: 2,
  },
  wealthStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  wealthStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 12,
  },
  wealthProgress: {
    gap: 8,
  },
  wealthProgressTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  wealthProgressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  wealthProgressText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'right',
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabActive: {},
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  goalsContainer: {
    gap: 16,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 16,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 8,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  goalCard: {
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  goalGradient: {
    padding: 20,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  goalIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalEmoji: {
    fontSize: 28,
  },
  goalMeta: {
    flex: 1,
  },
  goalName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  goalDeadline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  goalDeadlineText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  goalEdit: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  goalCurrent: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  goalTarget: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  goalPercentage: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  goalPercentageText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  goalProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalRemaining: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goalRemainingText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  addFundsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  addFundsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  createButton: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
  },
  createIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createContent: {
    flex: 1,
  },
  createTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  createSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  completedSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 16,
  },
  completedCard: {
    width: (width - 52) / 2,
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
  },
  completedIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(16,185,129,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  completedInfo: {
    flex: 1,
  },
  completedName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  completedAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: -0.3,
  },
  completedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(16,185,129,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesContainer: {
    gap: 20,
  },
  categoriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(139,92,246,0.1)',
  },
  manageButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: (width - 52) / 2,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  categoryAmount: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  categoryProgressContainer: {
    marginBottom: 8,
  },
  categoryProgressTrack: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryPercent: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 8,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#52525B',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  modalHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  modalActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(16,185,129,0.1)',
  },
  availableBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    fontSize: 15,
    fontWeight: '600',
    borderWidth: 1,
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 12,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  contributeModalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 8,
    paddingBottom: 40,
  },
  contributeGoalDisplay: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  contributeGoalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  contributeGoalEmoji: {
    fontSize: 40,
  },
  contributeGoalName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});

export default CategoryScreen;