import React, { useState } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

const SavingScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('goals'); // 'goals' or 'categories'
  const [modalVisible, setModalVisible] = useState(false);

  // Savings Goals Data
  const savingsGoals = [
    {
      id: 1,
      name: 'Emergency Fund',
      icon: 'shield-check',
      target: 500000,
      current: 320000,
      color: '#3B82F6',
      gradient: ['#3B82F6', '#2563EB'],
      emoji: '🛡️',
      deadline: 'Dec 2025',
    },
    {
      id: 2,
      name: 'Vacation Trip',
      icon: 'airplane',
      target: 200000,
      current: 85000,
      color: '#8B5CF6',
      gradient: ['#8B5CF6', '#7C3AED'],
      emoji: '✈️',
      deadline: 'Jun 2026',
    },
    {
      id: 3,
      name: 'New Laptop',
      icon: 'laptop',
      target: 150000,
      current: 95000,
      color: '#10B981',
      gradient: ['#10B981', '#059669'],
      emoji: '💻',
      deadline: 'Mar 2026',
    },
    {
      id: 4,
      name: 'Wedding Fund',
      icon: 'heart',
      target: 1000000,
      current: 250000,
      color: '#EC4899',
      gradient: ['#EC4899', '#DB2777'],
      emoji: '💍',
      deadline: 'Dec 2026',
    },
  ];

  // Spending Categories Data
  const categories = [
    { name: 'Food & Dining', icon: 'food', spent: 12000, budget: 15000, color: '#EF4444' },
    { name: 'Transport', icon: 'car', spent: 8000, budget: 10000, color: '#F59E0B' },
    { name: 'Shopping', icon: 'shopping', spent: 10000, budget: 12000, color: '#8B5CF6' },
    { name: 'Bills & Utilities', icon: 'receipt', spent: 15000, budget: 18000, color: '#3B82F6' },
    { name: 'Healthcare', icon: 'medical-bag', spent: 5000, budget: 8000, color: '#10B981' },
    { name: 'Entertainment', icon: 'movie', spent: 4000, budget: 6000, color: '#EC4899' },
    { name: 'Education', icon: 'school', spent: 6000, budget: 10000, color: '#6366F1' },
    { name: 'Gifts', icon: 'gift', spent: 2000, budget: 5000, color: '#F59E0B' },
  ];

  const totalSaved = savingsGoals.reduce((sum, goal) => sum + goal.current, 0);
  const totalGoals = savingsGoals.reduce((sum, goal) => sum + goal.target, 0);
  const overallProgress = (totalSaved / totalGoals) * 100;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatShortCurrency = (amount) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K`;
    }
    return amount.toString();
  };

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
            onPress={() => setModalVisible(true)}
          >
            <Icon name="plus" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Overview Card */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <Text style={styles.overviewLabel}>Total Saved</Text>
            <View style={styles.overviewBadge}>
              <Icon name="trending-up" size={16} color="#10B981" />
              <Text style={styles.overviewBadgeText}>{overallProgress.toFixed(0)}%</Text>
            </View>
          </View>
          <Text style={styles.overviewAmount}>{formatCurrency(totalSaved)}</Text>
          <Text style={styles.overviewSubtext}>of {formatCurrency(totalGoals)} total goal</Text>
          
          {/* Overall Progress Bar */}
          <View style={styles.overviewProgressContainer}>
            <View style={[styles.overviewProgress, { width: `${overallProgress}%` }]} />
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
            {savingsGoals.map((goal) => {
              const percentage = (goal.current / goal.target) * 100;
              const remaining = goal.target - goal.current;

              return (
                <TouchableOpacity key={goal.id} style={styles.goalCard}>
                  <LinearGradient
                    colors={goal.gradient}
                    style={styles.goalGradient}
                  >
                    {/* Goal Header */}
                    <View style={styles.goalHeader}>
                      <View style={styles.goalIconWrapper}>
                        <Text style={styles.goalEmoji}>{goal.emoji}</Text>
                      </View>
                      <View style={styles.goalInfo}>
                        <Text style={styles.goalName}>{goal.name}</Text>
                        <View style={styles.goalDeadline}>
                          <Icon name="calendar" size={14} color="rgba(255, 255, 255, 0.8)" />
                          <Text style={styles.goalDeadlineText}>{goal.deadline}</Text>
                        </View>
                      </View>
                      <TouchableOpacity style={styles.goalMenuButton}>
                        <Icon name="dots-vertical" size={20} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>

                    {/* Progress Info */}
                    <View style={styles.goalProgressInfo}>
                      <View>
                        <Text style={styles.goalCurrentAmount}>
                          {formatCurrency(goal.current)}
                        </Text>
                        <Text style={styles.goalTargetAmount}>
                          of {formatCurrency(goal.target)}
                        </Text>
                      </View>
                      <View style={styles.goalPercentageBadge}>
                        <Text style={styles.goalPercentageText}>{percentage.toFixed(0)}%</Text>
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.goalProgressContainer}>
                      <View style={[styles.goalProgress, { width: `${percentage}%` }]} />
                    </View>

                    {/* Remaining Amount */}
                    <View style={styles.goalFooter}>
                      <View style={styles.goalRemainingInfo}>
                        <Icon name="flag-checkered" size={16} color="rgba(255, 255, 255, 0.9)" />
                        <Text style={styles.goalRemainingText}>
                          {formatCurrency(remaining)} to go
                        </Text>
                      </View>
                      <TouchableOpacity style={styles.goalAddButton}>
                        <Icon name="plus-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.goalAddButtonText}>Add Funds</Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}

            {/* Create New Goal Button */}
            <TouchableOpacity 
              style={styles.createGoalButton}
              onPress={() => setModalVisible(true)}
            >
              <View style={styles.createGoalIconWrapper}>
                <Icon name="plus" size={32} color="#3B82F6" />
              </View>
              <Text style={styles.createGoalText}>Create New Goal</Text>
              <Text style={styles.createGoalSubtext}>
                Set a target and start saving today
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Categories View
          <View style={styles.categoriesContainer}>
            <View style={styles.categoriesHeader}>
              <Text style={styles.categoriesTitle}>Spending Categories</Text>
              <Text style={styles.categoriesSubtitle}>
                Track expenses by category
              </Text>
            </View>

            <View style={styles.categoryGrid}>
              {categories.map((category, index) => {
                const percentage = (category.spent / category.budget) * 100;
                const isOverBudget = percentage > 100;

                return (
                  <TouchableOpacity key={index} style={styles.categoryCard}>
                    <View style={[styles.categoryIconContainer, { backgroundColor: category.color + '20' }]}>
                      <Icon name={category.icon} size={28} color={category.color} />
                    </View>
                    
                    <Text style={styles.categoryName}>{category.name}</Text>
                    
                    <Text style={styles.categorySpent}>
                      {formatCurrency(category.spent)}
                    </Text>
                    
                    <View style={styles.categoryProgressBg}>
                      <View 
                        style={[
                          styles.categoryProgress, 
                          { 
                            width: `${Math.min(percentage, 100)}%`,
                            backgroundColor: isOverBudget ? '#EF4444' : category.color
                          }
                        ]} 
                      />
                    </View>
                    
                    <Text style={[
                      styles.categoryBudget,
                      isOverBudget && styles.categoryBudgetOver
                    ]}>
                      {isOverBudget ? 'Over budget!' : `${formatCurrency(category.budget)} budget`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Add Category Button */}
            <TouchableOpacity style={styles.addCategoryButton}>
              <Icon name="plus-circle-outline" size={24} color="#3B82F6" />
              <Text style={styles.addCategoryText}>Add New Category</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add Goal Modal (Placeholder) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Goal</Text>
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
              />

              <Text style={styles.modalLabel}>Target Amount (PKR)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.modalLabel}>Deadline</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Select Date"
                placeholderTextColor="#94A3B8"
              />

              <TouchableOpacity style={styles.modalSaveButton}>
                <Text style={styles.modalSaveButtonText}>Create Goal</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    maxHeight: '80%',
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
});

export default SavingScreen;