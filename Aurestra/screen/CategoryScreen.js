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
  "Food & Snacks": { icon: 'food', color: '#FF6B6B' },
  "Ride / Transport": { icon: 'car', color: '#4ECDC4' },
  "Bills & Utilities": { icon: 'receipt', color: '#3B82F6' },
  "Shopping": { icon: 'shopping', color: '#A78BFA' },
  "Healthcare": { icon: 'hospital', color: '#10B981' },
  "Entertainment": { icon: 'movie', color: '#EC4899' },
  "Education": { icon: 'school', color: '#F59E0B' },
  "Groceries": { icon: 'cart-outline', color: '#059669' },
  "Personal Care": { icon: 'sparkles', color: '#C084FC' },
  "Online Services": { icon: 'web', color: '#60A5FA' },
  "Gym & Fitness": { icon: 'dumbbell', color: '#F87171' },
  "Subscription (Google one )": { icon: 'credit-card-settings-outline', color: '#A78BFA' },
  "Miscellaneous": { icon: 'dots-horizontal', color: '#64748B' },
  "Income": { icon: 'bank-transfer-in', color: '#10B981' },
};

const CategoryScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { colors, isDarkMode } = useSettings();
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

  const savingsGoals = useSelector((state) => state.API.savingsGoals);
  const goalsStatus = useSelector((state) => state.API.goalsStatus);
  const topCategories = useSelector((state) => state.API.topCategories);
  const topCategoriesStatus = useSelector((state) => state.API.topCategoriesStatus);
  const accounts = useSelector((state) => state.API.accounts);
  const categories = useSelector((state) => state.API.categories);

  useEffect(() => {
    loadData();
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
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140']
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={isDarkMode ? '#0F172A' : '#1E293B'} />

      {/* Enhanced Header */}
      <LinearGradient 
        colors={isDarkMode ? ['#0F172A', '#1E293B', '#334155'] : ['#1E293B', '#334155', '#475569']} 
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Wealth Hub</Text>
            <Text style={styles.headerSubtitle}>Manage your financial journey</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={activeTab === 'goals' ? openCreateModal : () => navigation.navigate('CategoryManagement')}
          >
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.addButtonGradient}
            >
              <Icon name={activeTab === 'goals' ? "plus" : "cog"} size={22} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Enhanced Overview Cards */}
        <View style={styles.overviewCardsContainer}>
          <View style={[styles.overviewCardMini, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
            <View style={styles.overviewCardHeader}>
              <Icon name="wallet" size={20} color="#60A5FA" />
              <Text style={styles.overviewCardLabel}>Available</Text>
            </View>
            <Text style={styles.overviewCardAmount}>{formatCurrency(availableSavings)}</Text>
            <Text style={styles.overviewCardSubtext}>To Allocate</Text>
          </View>

          <View style={[styles.overviewCardMini, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
            <View style={styles.overviewCardHeader}>
              <Icon name="chart-line" size={20} color="#34D399" />
              <Text style={styles.overviewCardLabel}>Total Wealth</Text>
            </View>
            <Text style={styles.overviewCardAmount}>{formatCurrency(grossBalance)}</Text>
            <Text style={styles.overviewCardSubtext}>{formatCurrency(totalGoalsAllocated)} Allocated</Text>
          </View>
        </View>

        {/* Animated Progress Indicator */}
        {activeGoals.length > 0 && (
          <View style={styles.overviewProgressSection}>
            <View style={styles.overviewProgressHeader}>
              <Text style={styles.overviewProgressLabel}>Overall Goal Progress</Text>
              <Text style={styles.overviewProgressPercent}>{overallProgress.toFixed(0)}%</Text>
            </View>
            <View style={styles.overviewProgressBar}>
              <LinearGradient
                colors={['#3B82F6', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.overviewProgressFill, { width: `${Math.min(overallProgress, 100)}%` }]}
              />
            </View>
          </View>
        )}

        {/* Enhanced Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'goals' && styles.tabActive]}
            onPress={() => setActiveTab('goals')}
            activeOpacity={0.7}
          >
            {activeTab === 'goals' && (
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={styles.tabActiveBackground}
              />
            )}
            <Icon
              name="target"
              size={20}
              color={activeTab === 'goals' ? '#FFFFFF' : '#94A3B8'}
            />
            <Text style={[styles.tabText, activeTab === 'goals' && styles.tabTextActive]}>
              Goals
            </Text>
            {activeGoals.length > 0 && (
              <View style={[styles.tabBadge, activeTab === 'goals' && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === 'goals' && styles.tabBadgeTextActive]}>
                  {activeGoals.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'categories' && styles.tabActive]}
            onPress={() => setActiveTab('categories')}
            activeOpacity={0.7}
          >
            {activeTab === 'categories' && (
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={styles.tabActiveBackground}
              />
            )}
            <Icon
              name="view-grid"
              size={20}
              color={activeTab === 'categories' ? '#FFFFFF' : '#94A3B8'}
            />
            <Text style={[styles.tabText, activeTab === 'categories' && styles.tabTextActive]}>
              Categories
            </Text>
            {topCategories && topCategories.length > 0 && (
              <View style={[styles.tabBadge, activeTab === 'categories' && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === 'categories' && styles.tabBadgeTextActive]}>
                  {topCategories.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {activeTab === 'goals' ? (
          <View style={styles.goalsContainer}>
            {goalsStatus === 'loading' && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading your goals...</Text>
              </View>
            )}

            {goalsStatus !== 'loading' && activeGoals.length === 0 && (
              <View style={styles.emptyState}>
                <View style={styles.emptyStateIcon}>
                  <Icon name="target" size={64} color="#CBD5E1" />
                </View>
                <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Active Goals</Text>
                <Text style={[styles.emptyStateSubtitle, { color: colors.textSecondary }]}>
                  Start your savings journey by creating your first goal
                </Text>
              </View>
            )}

            {activeGoals.map((goal, index) => {
              const current = goal.current_amount || 0;
              const target = goal.target_amount || 1;
              const percentage = (current / target) * 100;
              const remaining = Math.max(target - current, 0);
              const gradient = gradients[index % gradients.length];

              return (
                <TouchableOpacity 
                  key={goal.id || index} 
                  style={styles.goalCard} 
                  onPress={() => openEditModal(goal)}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={gradient}
                    style={styles.goalGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {/* Enhanced Goal Header */}
                    <View style={styles.goalHeader}>
                      <View style={styles.goalIconWrapper}>
                        <Text style={styles.goalEmoji}>{goal.emoji || '💰'}</Text>
                      </View>
                      <View style={styles.goalInfo}>
                        <Text style={styles.goalName}>{goal.name}</Text>
                        {goal.deadline && (
                          <View style={styles.goalDeadline}>
                            <Icon name="calendar-clock" size={14} color="rgba(255, 255, 255, 0.9)" />
                            <Text style={styles.goalDeadlineText}>{goal.deadline}</Text>
                          </View>
                        )}
                      </View>
                      <TouchableOpacity 
                        style={styles.goalMenuButton} 
                        onPress={() => openEditModal(goal)}
                      >
                        <Icon name="pencil" size={20} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>

                    {/* Enhanced Progress Info */}
                    <View style={styles.goalProgressInfo}>
                      <View style={styles.goalAmountSection}>
                        <Text style={styles.goalAmountLabel}>Current</Text>
                        <Text style={styles.goalCurrentAmount}>
                          {formatCurrency(current)}
                        </Text>
                        <View style={styles.goalTargetRow}>
                          <Icon name="flag-checkered" size={12} color="rgba(255, 255, 255, 0.8)" />
                          <Text style={styles.goalTargetAmount}>
                            {formatCurrency(target)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.goalPercentageBadge}>
                        <Text style={styles.goalPercentageText}>{percentage.toFixed(0)}%</Text>
                        <Text style={styles.goalPercentageLabel}>Complete</Text>
                      </View>
                    </View>

                    {/* Enhanced Progress Bar */}
                    <View style={styles.goalProgressContainer}>
                      <View style={[styles.goalProgress, { width: `${Math.min(percentage, 100)}%` }]}>
                        <LinearGradient
                          colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
                          style={styles.goalProgressGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        />
                      </View>
                    </View>

                    {/* Enhanced Footer */}
                    <View style={styles.goalFooter}>
                      <View style={styles.goalRemainingInfo}>
                        <Icon name="trending-up" size={16} color="rgba(255, 255, 255, 0.95)" />
                        <Text style={styles.goalRemainingText}>
                          {formatCurrency(remaining)} remaining
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.goalAddButton}
                        onPress={() => openContributeModal(goal)}
                      >
                        <Icon name="plus-circle" size={18} color="#FFFFFF" />
                        <Text style={styles.goalAddButtonText}>Add Funds</Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}

            {/* Enhanced Create Goal Button */}
            <TouchableOpacity
              style={[styles.createGoalButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={openCreateModal}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={isDarkMode ? ['#1E293B', '#334155'] : ['#F8FAFC', '#F1F5F9']}
                style={styles.createGoalGradient}
              >
                <View style={[styles.createGoalIconWrapper, { backgroundColor: isDarkMode ? '#334155' : '#EFF6FF' }]}>
                  <Icon name="plus" size={28} color="#3B82F6" />
                </View>
                <Text style={[styles.createGoalText, { color: colors.text }]}>Create New Goal</Text>
                <Text style={[styles.createGoalSubtext, { color: colors.textSecondary }]}>
                  Set a target and start saving today
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Enhanced Completed Goals */}
            {completedGoals.length > 0 && (
              <View style={styles.completedSection}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderLeft}>
                    <Icon name="trophy" size={24} color="#F59E0B" />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Completed Goals</Text>
                  </View>
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>{completedGoals.length}</Text>
                  </View>
                </View>
                <View style={styles.categoryGrid}>
                  {completedGoals.map((goal, index) => (
                    <TouchableOpacity
                      key={`comp-${index}`}
                      style={[styles.completedGoalCard, { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : '#F0FDF4' }]}
                      onPress={() => openEditModal(goal)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.completedGoalHeader}>
                        <View style={styles.completedGoalIcon}>
                          <Text style={styles.completedGoalEmoji}>{goal.emoji || '🎉'}</Text>
                        </View>
                        <View style={styles.completedBadge}>
                          <Icon name="check-circle" size={16} color="#059669" />
                        </View>
                      </View>
                      <Text style={[styles.completedGoalName, { color: colors.text }]} numberOfLines={1}>
                        {goal.name}
                      </Text>
                      <Text style={styles.completedGoalAmount}>
                        {formatCurrency(goal.current_amount)}
                      </Text>
                      <Text style={styles.completedGoalLabel}>Goal Reached!</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.categoriesContainer}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Icon name="chart-box" size={24} color="#3B82F6" />
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Spending Categories</Text>
                  <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                    Track expenses by category
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                onPress={() => navigation.navigate('CategoryManagement')}
                style={styles.manageButton}
              >
                <Icon name="cog" size={20} color="#3B82F6" />
                <Text style={styles.manageButtonText}>Manage</Text>
              </TouchableOpacity>
            </View>

            {topCategoriesStatus === 'loading' && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
              </View>
            )}

            <View style={styles.categoryGrid}>
              {topCategories && topCategories.map((cat, index) => {
                const details = getCategoryDetails(cat.category);
                const percentage = totalSpending > 0 ? (cat.total_spent / totalSpending) * 100 : 0;

                return (
                  <View 
                    key={index} 
                    style={[styles.categoryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <View style={[styles.categoryIconContainer, { backgroundColor: details.color + '15' }]}>
                      <Icon name={details.icon} size={32} color={details.color} />
                    </View>
                    <Text style={[styles.categoryName, { color: colors.text }]} numberOfLines={1}>
                      {cat.category}
                    </Text>
                    <Text style={[styles.categorySpent, { color: colors.text }]}>
                      {formatCurrency(cat.total_spent)}
                    </Text>
                    <View style={styles.categoryProgressBg}>
                      <LinearGradient
                        colors={[details.color, details.color + 'CC']}
                        style={[
                          styles.categoryProgress,
                          { width: `${Math.min(percentage, 100)}%` }
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      />
                    </View>
                    <Text style={[styles.categoryPercentage, { color: colors.textSecondary }]}>
                      {percentage.toFixed(1)}% of spending
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Enhanced Modals */}
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
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {goalToEdit ? 'Edit Goal' : 'Create New Goal'}
              </Text>
              <View style={styles.modalHeaderActions}>
                {goalToEdit && (
                  <TouchableOpacity onPress={handleDeleteGoal} style={styles.modalDeleteIcon}>
                    <Icon name="trash-can-outline" size={24} color="#EF4444" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Icon name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Goal Name *</Text>
                <TextInput
                  style={[styles.modalInput, { 
                    backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', 
                    color: colors.text, 
                    borderColor: colors.border 
                  }]}
                  placeholder="e.g., Dream Vacation"
                  placeholderTextColor={colors.textSecondary}
                  value={goalName}
                  onChangeText={setGoalName}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Target Amount (PKR) *</Text>
                <TextInput
                  style={[styles.modalInput, { 
                    backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', 
                    color: colors.text, 
                    borderColor: colors.border 
                  }]}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                  value={goalTarget}
                  onChangeText={setGoalTarget}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Emoji</Text>
                <TextInput
                  style={[styles.modalInput, { 
                    backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', 
                    color: colors.text, 
                    borderColor: colors.border 
                  }]}
                  placeholder="💰"
                  placeholderTextColor={colors.textSecondary}
                  value={goalEmoji}
                  onChangeText={setGoalEmoji}
                  maxLength={4}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Deadline</Text>
                <TouchableOpacity
                  style={[styles.modalInput, { 
                    backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', 
                    borderColor: colors.border,
                    justifyContent: 'center'
                  }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={{ color: goalDeadline ? colors.text : colors.textSecondary }}>
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
                <View style={styles.modalInputGroup}>
                  <View style={styles.modalLabelRow}>
                    <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
                      Current Saved Amount (PKR)
                    </Text>
                    <View style={styles.availableBadge}>
                      <Icon name="wallet" size={12} color="#10B981" />
                      <Text style={styles.availableBadgeText}>
                        {formatCurrency(availableSavings + (goalToEdit ? goalToEdit.current_amount : 0))} available
                      </Text>
                    </View>
                  </View>
                  <TextInput
                    style={[styles.modalInput, { 
                      backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', 
                      color: colors.text, 
                      borderColor: colors.border 
                    }]}
                    placeholder="0"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                    value={initialAmount}
                    onChangeText={setInitialAmount}
                  />
                </View>
              )}

              <TouchableOpacity
                style={[styles.modalSaveButton, creating && { opacity: 0.7 }]}
                onPress={handleCreateOrUpdateGoal}
                disabled={creating}
              >
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  style={styles.modalSaveButtonGradient}
                >
                  {creating ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Icon name={goalToEdit ? "check" : "plus"} size={20} color="#FFFFFF" />
                      <Text style={styles.modalSaveButtonText}>
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
          <View style={[styles.contributeModal, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Funds</Text>
              <TouchableOpacity onPress={() => setContributeModalVisible(false)}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.contributeGoalInfo}>
                <Text style={styles.contributeGoalEmoji}>{selectedGoalForFunds?.emoji || '💰'}</Text>
                <Text style={[styles.contributeGoalName, { color: colors.text }]}>
                  {selectedGoalForFunds?.name}
                </Text>
              </View>

              <View style={styles.modalInputGroup}>
                <View style={styles.modalLabelRow}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
                    Amount to Save
                  </Text>
                  <View style={styles.availableBadge}>
                    <Icon name="wallet" size={12} color="#10B981" />
                    <Text style={styles.availableBadgeText}>
                      {formatCurrency(availableSavings)} available
                    </Text>
                  </View>
                </View>
                <TextInput
                  style={[styles.modalInput, { 
                    backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', 
                    color: colors.text, 
                    borderColor: colors.border 
                  }]}
                  placeholder="0"
                  keyboardType="numeric"
                  autoFocus={true}
                  placeholderTextColor={colors.textSecondary}
                  value={contributeAmount}
                  onChangeText={setContributeAmount}
                />
              </View>

              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleContribute}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.modalSaveButtonGradient}
                >
                  <Icon name="check-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.modalSaveButtonText}>Confirm Deposit</Text>
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingBottom: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  addButton: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  addButtonGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overviewCardsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  overviewCardMini: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  overviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  overviewCardLabel: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overviewCardAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  overviewCardSubtext: {
    fontSize: 11,
    color: '#94A3B8',
  },
  overviewProgressSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  overviewProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  overviewProgressLabel: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  overviewProgressPercent: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  overviewProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  overviewProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    position: 'relative',
  },
  tabActive: {
    // Active styling handled by gradient
  },
  tabActiveBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  tabText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
    zIndex: 1,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
    zIndex: 1,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  tabBadgeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100,
  },
  goalsContainer: {
    gap: 16,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyStateIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(203, 213, 225, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  goalCard: {
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  goalGradient: {
    padding: 20,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  goalIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  goalEmoji: {
    fontSize: 32,
  },
  goalInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  goalDeadline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  goalDeadlineText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  goalMenuButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  goalProgressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  goalAmountSection: {
    flex: 1,
  },
  goalAmountLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  goalCurrentAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -1,
  },
  goalTargetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  goalTargetAmount: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  goalPercentageBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
  },
  goalPercentageText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  goalPercentageLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  goalProgressContainer: {
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 16,
  },
  goalProgress: {
    height: '100%',
    borderRadius: 6,
    overflow: 'hidden',
  },
  goalProgressGradient: {
    flex: 1,
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalRemainingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goalRemainingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600',
  },
  goalAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  goalAddButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  createGoalButton: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  createGoalGradient: {
    padding: 32,
    alignItems: 'center',
  },
  createGoalIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  createGoalText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  createGoalSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  completedSection: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  sectionBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  completedGoalCard: {
    width: (width - 52) / 2,
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  completedGoalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  completedGoalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedGoalEmoji: {
    fontSize: 24,
  },
  completedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedGoalName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  completedGoalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 4,
  },
  completedGoalLabel: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoriesContainer: {
    gap: 20,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  manageButtonText: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '600',
  },
  categoryCard: {
    width: (width - 52) / 2,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  categoryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  categorySpent: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  categoryProgressBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  categoryProgress: {
    height: '100%',
    borderRadius: 3,
  },
  categoryPercentage: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 20,
    paddingBottom: 50,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  modalHeaderActions: {
    flexDirection: 'row',
    gap: 16,
  },
  modalDeleteIcon: {
    padding: 4,
  },
  modalBody: {
    padding: 24,
  },
  modalInputGroup: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  availableBadgeText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  modalInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  modalSaveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 12,
  },
  modalSaveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  contributeModal: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 20,
    paddingBottom: 40,
  },
  contributeGoalInfo: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  contributeGoalEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  contributeGoalName: {
    fontSize: 18,
    fontWeight: '600',
  },
});

export default CategoryScreen;