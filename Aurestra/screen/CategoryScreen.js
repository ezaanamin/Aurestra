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
  Alert,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import CustomAlert from '../components/CustomAlert';
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
  const [activeTab, setActiveTab] = useState('goals'); // 'goals' or 'categories'
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

  // Custom Alert State
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

  // Derived Calculations
  const activeGoals = (savingsGoals || []).filter(goal => (goal.current_amount || 0) < (goal.target_amount || 0));
  const completedGoals = (savingsGoals || []).filter(goal => (goal.current_amount || 0) >= (goal.target_amount || 0) && (goal.current_amount > 0));

  // The backend already returns the 'effective' balance (Gross - All Goals)
  const availableSavings = accounts?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;
  const totalGoalsAllocated = (savingsGoals || []).reduce((sum, goal) => sum + (goal.current_amount || 0), 0);
  const grossBalance = availableSavings + totalGoalsAllocated;

  const totalActiveAllocated = activeGoals.reduce((sum, goal) => sum + (goal.current_amount || 0), 0);
  const totalActiveGoalsAmount = activeGoals.reduce((sum, goal) => sum + (goal.target_amount || 1), 0);
  const overallProgress = totalActiveGoalsAmount > 0 ? (totalActiveAllocated / totalActiveGoalsAmount) * 100 : 0;

  // Total Spending for calculating category %
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
    // 1. Basic Field Presence
    if (!goalName.trim() || !goalTarget) {
      showAlert("Missing Fields", "Please enter a name and target amount.");
      return;
    }

    // 2. Name Validation
    if (goalName.trim().length < 3) {
      showAlert("Invalid Name", "Goal name should be at least 3 characters long.");
      return;
    }

    // 3. Numeric Validations
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

    // 4. Pool Validation (Important)
    const currentGoalAmount = goalToEdit ? goalToEdit.current_amount : 0;
    const additionalFundsNeeded = initial - currentGoalAmount;

    if (additionalFundsNeeded > availableSavings) {
      showAlert("Insufficient Funds", `You only have ${formatCurrency(availableSavings)} available in your savings pool.`);
      return;
    }

    // 5. Emoji Validation
    if (goalEmoji && goalEmoji.trim().length > 10) {
      showAlert("Invalid Emoji", "Please use a shorter emoji or icon name.");
      return;
    }

    // 6. Date Validation
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

  // Gradients for list items
  const gradients = [
    ['#3B82F6', '#2563EB'],
    ['#8B5CF6', '#7C3AED'],
    ['#10B981', '#059669'],
    ['#EC4899', '#DB2777'],
    ['#F59E0B', '#D97706']
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E293B" />

      {/* Modern Header */}
      <LinearGradient colors={['#1E293B', '#334155']} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Savings & Goals</Text>
            <Text style={styles.headerSubtitle}>Track your financial progress</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={activeTab === 'goals' ? openCreateModal : () => navigation.navigate('CategoryManagement')}
          >
            <Icon name={activeTab === 'goals' ? "plus" : "cog"} size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Overview Card */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <Text style={styles.overviewLabel}>Available to Allocate</Text>
            <View style={styles.overviewBadge}>
              <Icon name="bank" size={16} color="#10B981" />
              <Text style={styles.overviewBadgeText}>Pool</Text>
            </View>
          </View>
          <Text style={styles.overviewAmount}>{formatCurrency(availableSavings)}</Text>
          <Text style={styles.overviewSubtext}>Available for Spending</Text>

          {/* Allocation Progress Bar */}
          <View style={styles.overviewProgressContainer}>
            <View style={[styles.overviewProgress, {
              width: `${Math.min((totalGoalsAllocated / (grossBalance || 1)) * 100, 100)}%`,
              backgroundColor: '#3B82F6'
            }]} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={{ fontSize: 11, color: '#94A3B8' }}>Total Wealth: {formatCurrency(grossBalance)}</Text>
            <Text style={{ fontSize: 11, color: '#94A3B8' }}>Saved: {formatCurrency(totalGoalsAllocated)}</Text>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'goals' && styles.tabActive]}
            onPress={() => setActiveTab('goals')}
          >
            <Icon
              name="target"
              size={20}
              color={activeTab === 'goals' ? '#FFFFFF' : '#94A3B8'}
            />
            <Text style={[styles.tabText, activeTab === 'goals' && styles.tabTextActive]}>
              Goals
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'categories' && styles.tabActive]}
            onPress={() => setActiveTab('categories')}
          >
            <Icon
              name="view-grid"
              size={20}
              color={activeTab === 'categories' ? '#FFFFFF' : '#94A3B8'}
            />
            <Text style={[styles.tabText, activeTab === 'categories' && styles.tabTextActive]}>
              Categories
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'goals' ? (
          // Savings Goals View
          <View style={styles.goalsContainer}>
            {goalsStatus === 'loading' && <ActivityIndicator size="large" color="#3B82F6" />}

            {goalsStatus !== 'loading' && activeGoals.length === 0 && (
              <Text style={{ textAlign: 'center', color: '#94A3B8', marginTop: 20 }}>
                No active savings goals. Create one!
              </Text>
            )}

            {activeGoals.map((goal, index) => {
              const current = goal.current_amount || 0;
              const target = goal.target_amount || 1;
              const percentage = (current / target) * 100;
              const remaining = Math.max(target - current, 0);
              const gradient = gradients[index % gradients.length];

              return (
                <TouchableOpacity key={goal.id || index} style={styles.goalCard} onPress={() => openEditModal(goal)}>
                  <LinearGradient
                    colors={gradient}
                    style={styles.goalGradient}
                  >
                    {/* Goal Header */}
                    <View style={styles.goalHeader}>
                      <View style={styles.goalIconWrapper}>
                        <Text style={styles.goalEmoji}>{goal.emoji || '💰'}</Text>
                      </View>
                      <View style={styles.goalInfo}>
                        <Text style={styles.goalName}>{goal.name}</Text>
                        <View style={styles.goalDeadline}>
                          <Icon name="calendar" size={14} color="rgba(255, 255, 255, 0.8)" />
                          <Text style={styles.goalDeadlineText}>{goal.deadline || 'No deadline'}</Text>
                        </View>
                      </View>
                      <TouchableOpacity style={styles.goalMenuButton} onPress={() => openEditModal(goal)}>
                        <Icon name="pencil" size={20} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>

                    {/* Progress Info */}
                    <View style={styles.goalProgressInfo}>
                      <View>
                        <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, marginBottom: 2 }}>Total Saved</Text>
                        <Text style={styles.goalCurrentAmount}>
                          {formatCurrency(current)}
                        </Text>
                        <Text style={styles.goalTargetAmount}>
                          Target: {formatCurrency(target)}
                        </Text>
                      </View>
                      <View style={styles.goalPercentageBadge}>
                        <Text style={styles.goalPercentageText}>{percentage.toFixed(0)}%</Text>
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.goalProgressContainer}>
                      <View style={[styles.goalProgress, { width: `${Math.min(percentage, 100)}%` }]} />
                    </View>

                    {/* Remaining Amount */}
                    <View style={styles.goalFooter}>
                      <View style={styles.goalRemainingInfo}>
                        <Icon name="flag-checkered" size={16} color="rgba(255, 255, 255, 0.9)" />
                        <Text style={styles.goalRemainingText}>
                          {formatCurrency(remaining)} to go
                        </Text>
                      </View>
                      {/* Add Funds Button */}
                      <TouchableOpacity
                        style={styles.goalAddButton}
                        onPress={() => openContributeModal(goal)}
                      >
                        <Icon name="plus-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.goalAddButtonText}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}

            {/* Create New Goal Button */}
            <TouchableOpacity
              style={styles.createGoalButton}
              onPress={openCreateModal}
            >
              <View style={styles.createGoalIconWrapper}>
                <Icon name="plus" size={32} color="#3B82F6" />
              </View>
              <Text style={styles.createGoalText}>Create New Goal</Text>
              <Text style={styles.createGoalSubtext}>
                Set a target and start saving today
              </Text>
            </TouchableOpacity>

            {completedGoals.length > 0 && (
              <View style={{ marginTop: 24, marginBottom: 20 }}>
                <View style={styles.categoriesHeader}>
                  <Text style={styles.categoriesTitle}>Completed Goals</Text>
                  <Text style={styles.categoriesSubtitle}>
                    Goals you've successfully reached!
                  </Text>
                </View>
                <View style={styles.categoryGrid}>
                  {completedGoals.map((goal, index) => (
                    <TouchableOpacity
                      key={`comp-${index}`}
                      style={[styles.categoryCard, { borderColor: '#10B981', backgroundColor: '#F0FDF4' }]}
                      onPress={() => openEditModal(goal)}
                    >
                      <View style={[styles.categoryIconContainer, { backgroundColor: '#10B98120' }]}>
                        <Text style={{ fontSize: 24 }}>{goal.emoji || '🎉'}</Text>
                      </View>
                      <Text style={styles.categoryName} numberOfLines={1}>{goal.name}</Text>
                      <Text style={[styles.categorySpent, { color: '#059669' }]}>
                        {formatCurrency(goal.current_amount)}
                      </Text>
                      <View style={[styles.overviewBadge, { backgroundColor: '#D1FAE5', alignSelf: 'flex-start', marginTop: 8 }]}>
                        <Icon name="check-circle" size={14} color="#059669" />
                        <Text style={{ color: '#059669', fontSize: 10, fontWeight: 'bold', marginLeft: 4 }}>REACHED</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        ) : (
          // Categories View
          <View style={styles.categoriesContainer}>
            <View style={styles.categoriesHeader}>
              <Text style={styles.categoriesTitle}>Spending Categories</Text>
              <Text style={styles.categoriesSubtitle}>
                Track expenses by category
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('CategoryManagement')}>
                <Text style={{ color: '#3B82F6', fontWeight: 'bold' }}>Edit All</Text>
              </TouchableOpacity>
            </View>

            {topCategoriesStatus === 'loading' && <ActivityIndicator size="large" color="#3B82F6" />}

            <View style={styles.categoryGrid}>
              {topCategories && topCategories.map((cat, index) => {
                const details = getCategoryDetails(cat.category);
                // Percentage of TOTAL spending, since we don't have category budgets
                const percentage = totalSpending > 0 ? (cat.total_spent / totalSpending) * 100 : 0;

                return (
                  <View key={index} style={styles.categoryCard}>
                    <View style={[styles.categoryIconContainer, { backgroundColor: details.color + '20' }]}>
                      <Icon name={details.icon} size={28} color={details.color} />
                    </View>
                    <Text style={styles.categoryName} numberOfLines={1}>{cat.category}</Text>
                    <Text style={styles.categorySpent}>
                      {formatCurrency(cat.total_spent)}
                    </Text>
                    <View style={styles.categoryProgressBg}>
                      <View
                        style={[
                          styles.categoryProgress,
                          {
                            width: `${Math.min(percentage, 100)}%`,
                            backgroundColor: details.color
                          }
                        ]}
                      />
                    </View>
                    <Text style={styles.categoryBudget}>
                      {percentage.toFixed(1)}% of total spent
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Goal Modal */}
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{goalToEdit ? 'Edit Goal' : 'Create New Goal'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalLabel}>Goal Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., Dream Vacation"
                placeholderTextColor="#94A3B8"
                value={goalName}
                onChangeText={setGoalName}
              />

              <Text style={styles.modalLabel}>Target Amount (PKR)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor="#94A3B8"
                value={goalTarget}
                onChangeText={setGoalTarget}
              />

              <Text style={styles.modalLabel}>Emoji (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="💰"
                placeholderTextColor="#94A3B8"
                value={goalEmoji}
                onChangeText={setGoalEmoji}
                maxLength={4}
              />
              <Text style={styles.modalLabel}>Deadline (Optional)</Text>
              <TouchableOpacity
                style={styles.modalInput}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: goalDeadline ? '#1E293B' : '#94A3B8' }}>
                  {goalDeadline || 'Select a deadline'}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={goalDeadline ? new Date(goalDeadline) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  minimumDate={new Date()}
                />
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.modalLabel}>Current Saved Amount (PKR)</Text>
              </View>
              <Text style={{ fontSize: 12, color: '#10B981', marginTop: -8, marginBottom: 8 }}>
                Pool Available: {formatCurrency(availableSavings + (goalToEdit ? goalToEdit.current_amount : 0))}
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor="#94A3B8"
                value={initialAmount}
                onChangeText={setInitialAmount}
              />

              <TouchableOpacity
                style={[styles.modalSaveButton, creating && { opacity: 0.7 }]}
                onPress={handleCreateOrUpdateGoal}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveButtonText}>{goalToEdit ? 'Save Changes' : 'Create Goal'}</Text>
                )}
              </TouchableOpacity>

              {goalToEdit && (
                <TouchableOpacity
                  style={styles.modalDeleteButton}
                  onPress={handleDeleteGoal}
                >
                  <Icon name="trash-can-outline" size={20} color="#EF4444" />
                  <Text style={styles.modalDeleteButtonText}>Delete Goal</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Contribute (Add Funds) Modal */}
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
          <View style={[styles.modalContent, { maxHeight: 300 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Funds</Text>
              <TouchableOpacity onPress={() => setContributeModalVisible(false)}>
                <Icon name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.modalLabel}>Amount to save for "{selectedGoalForFunds?.name}"</Text>
              </View>
              <Text style={{ fontSize: 12, color: '#10B981', marginTop: -8, marginBottom: 12 }}>
                Available in pool: {formatCurrency(availableSavings)}
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="0"
                keyboardType="numeric"
                autoFocus={true}
                placeholderTextColor="#94A3B8"
                value={contributeAmount}
                onChangeText={setContributeAmount}
              />

              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleContribute}
              >
                <Text style={styles.modalSaveButtonText}>Confirm Deposit</Text>
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
    </SafeAreaView >
  );
};

// Styles remain exactly the same as before


export default CategoryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  overviewCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 20,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  overviewLabel: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  overviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  overviewBadgeText: {
    fontSize: 12,
    color: '#6EE7B7',
    fontWeight: 'bold',
  },
  overviewAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  overviewSubtext: {
    fontSize: 13,
    color: '#CBD5E1',
    marginBottom: 16,
  },
  overviewProgressContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  overviewProgress: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
  },
  tabText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  goalsContainer: {
    paddingBottom: 100,
  },
  goalCard: {
    marginBottom: 16,
    borderRadius: 24,
    overflow: 'hidden',
  },
  goalGradient: {
    padding: 20,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  goalEmoji: {
    fontSize: 28,
  },
  goalInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  goalDeadline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  goalDeadlineText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  goalMenuButton: {
    padding: 8,
  },
  goalProgressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  goalCurrentAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  goalTargetAmount: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  goalPercentageBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  goalPercentageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  goalProgressContainer: {
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  goalProgress: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
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
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  goalAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  goalAddButtonText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  createGoalButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  createGoalIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  createGoalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  createGoalSubtext: {
    fontSize: 14,
    color: '#64748B',
  },
  categoriesContainer: {
    paddingBottom: 100,
  },
  categoriesHeader: {
    marginBottom: 20,
  },
  categoriesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  categoriesSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  categoryCard: {
    width: (width - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  categorySpent: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
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
  categoryBudget: {
    fontSize: 12,
    color: '#64748B',
  },
  categoryBudgetOver: {
    color: '#EF4444',
    fontWeight: '600',
  },
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addCategoryText: {
    fontSize: 15,
    color: '#3B82F6',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 20,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 20,
    paddingBottom: 50, // Increased bottom padding
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  modalBody: {
    padding: 24,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    marginTop: 16,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalSaveButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
  },
  modalDeleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
});
