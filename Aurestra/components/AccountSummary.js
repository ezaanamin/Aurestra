import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSettings } from '../context/SettingsContext';

const formatPKR = (amount) => {
  const value = typeof amount === 'number' ? amount : 0;
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const BudgetProgressBar = ({ savings, budget, expense }) => {
  if (budget <= 0) {
    return (
      <View style={styles.budgetStatusContainer}>
        <Text style={styles.budgetStatusText}>Budget goal not set for this month.</Text>
      </View>
    );
  }

  // Calculate budget utilization and savings performance against budget
  const amountRemaining = budget - expense;
  const progress = (expense / budget) * 100;
  const normalizedProgress = Math.min(100, progress);

  let message = "";
  let color = "#a7f3d0"; // Light green for progress bar fill (on blue background)

  if (amountRemaining >= 0) {
    message = `Under Budget by ${formatPKR(amountRemaining)}`;
    color = "#a7f3d0"; // Light green
  } else {
    message = `Over Budget by ${formatPKR(Math.abs(amountRemaining))}`;
    color = "#fca5a5"; // Light red
  }

  return (
    <View style={styles.progressBarSection}>
      <View style={styles.progressBarBackground}>
        {/* Fill shows the percentage of the budget utilized */}
        <View style={[styles.progressBarFill, { width: `${normalizedProgress}%`, backgroundColor: color }]} />
      </View>

      <View style={styles.progressTextContainer}>
        <Text style={[styles.progressMessage, { color: '#e2e8f0' }]}> {/* Changed text color to light gray */}
          <Text style={{ fontWeight: 'bold' }}>{Math.round(progress)}%</Text> Budget Utilized
        </Text>
        <Text style={styles.budgetStatusText}>{message}</Text>
      </View>
    </View>
  );
};

const AccountSummary = ({
  totalBalance,
  totalExpense,
  totalSavings, // NEW
  totalBudget,  // NEW
  rawExpense    // NEW: Raw expense amount for calculation
}) => {
  const { colors, isDarkMode } = useSettings();

  // Current date for "last updated"
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Convert formatted strings back to numbers for display (only totalBalance/totalExpense are formatted)
  const formattedBudget = formatPKR(totalBudget);
  const formattedSavings = formatPKR(totalSavings);

  // We keep the card colored (Primary color) to make it stand out, 
  // but ensure it works in dark mode too (Primary is adjusted in theme).
  // Text inside this card is always light because the card background is colored.

  return (
    <View style={[styles.container, {
      backgroundColor: colors.primary,
      borderColor: isDarkMode ? colors.border : 'rgba(255,255,255,0.2)'
    }]}>
      {/* Balance, Expense, and Savings */}
      <View style={styles.balanceContainer}>
        <View style={styles.balanceBox}>
          <Text style={styles.label}>Total Balance</Text>
          <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
            {totalBalance}
          </Text>
        </View>

        <View style={styles.verticalDivider} />

        <View style={styles.balanceBox}>
          <Text style={styles.label}>Total Expense</Text>
          <Text style={styles.expenseAmount} numberOfLines={1} adjustsFontSizeToFit>
            {totalExpense}
          </Text>
        </View>

        <View style={styles.verticalDivider} />

        {/* NEW: Total Savings Box */}
        <View style={styles.balanceBox}>
          <Text style={styles.label}>Net Savings</Text>
          <Text style={styles.savingsAmount} numberOfLines={1} adjustsFontSizeToFit>
            {formattedSavings}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.horizontalDivider} />

      {/* Budget Goal */}
      <View style={styles.budgetGoalContainer}>
        <Text style={styles.budgetGoalLabel}>Monthly Budget :</Text>
        <Text style={styles.budgetGoalAmount}>{formattedBudget}</Text>
      </View>

      {/* Divider */}
      <View style={styles.horizontalDivider} />

      {/* Budget Performance Progress Bar */}
      <BudgetProgressBar
        savings={totalSavings}
        budget={totalBudget}
        expense={rawExpense}
      />

      <Text style={styles.lastUpdated}>Last summary calculated: {formattedDate}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 15,
    borderRadius: 15,
    // Shadow properties
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 8,
    marginBottom: 10,
    marginHorizontal: 15,
    borderWidth: 1,
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    alignItems: 'center',
  },
  balanceBox: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  verticalDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.3)', // Lighter divider
  },
  horizontalDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)', // Lighter divider
    marginVertical: 10,
  },
  label: {
    fontSize: 12,
    color: '#e2e8f0', // Always light since bg is themed primary
    marginBottom: 4,
    fontWeight: '500',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff', // Always white
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fca5a5', // Light red for readability on colored bg
  },
  savingsAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#a7f3d0', // Light green for readability on colored bg
  },
  budgetGoalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 5,
  },
  budgetGoalLabel: {
    fontSize: 14,
    color: '#e2e8f0',
    fontWeight: '600',
  },
  budgetGoalAmount: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  progressBarSection: {
    paddingHorizontal: 10,
    marginTop: 5,
    marginBottom: 10,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressMessage: {
    fontSize: 12,
    fontWeight: '500',
    color: '#e2e8f0',
  },
  budgetStatusContainer: {
    alignItems: 'center',
    paddingVertical: 5,
  },
  budgetStatusText: {
    fontSize: 12,
    color: '#e2e8f0',
    fontStyle: 'italic',
  },
  lastUpdated: {
    fontSize: 10,
    color: '#cbd5e0',
    textAlign: 'center',
    marginTop: 5,
  },
});

export default AccountSummary;