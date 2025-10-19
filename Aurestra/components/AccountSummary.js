import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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


  return (
    <View style={styles.container}>
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
    backgroundColor: '#4299e1', // CHANGED: Blue background
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 8,
    marginBottom: 10,
    marginHorizontal: 15,
    borderWidth: 1, // Added border for subtle definition
    borderColor: 'rgba(255,255,255,0.2)', // Light border
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
    backgroundColor: 'rgba(255,255,255,0.3)', // CHANGED: Lighter divider for blue background
  },
  horizontalDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)', // CHANGED: Lighter divider for blue background
    marginVertical: 10,
  },
  label: {
    fontSize: 12,
    color: '#e2e8f0', // CHANGED: Lighter gray for readability on blue
    marginBottom: 4,
    fontWeight: '500',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff', // CHANGED: White for total balance
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fca5a5', // CHANGED: Lighter red for readability on blue
  },
  savingsAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#a7f3d0', // CHANGED: Lighter green for readability on blue
  },
  budgetGoalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 5,
  },
  budgetGoalLabel: {
    fontSize: 14,
    color: '#e2e8f0', // CHANGED: Lighter gray
    fontWeight: '600',
  },
  budgetGoalAmount: {
    fontSize: 14,
    color: '#fff', // CHANGED: White
    fontWeight: '600',
  },
  progressBarSection: {
    paddingHorizontal: 10,
    marginTop: 5,
    marginBottom: 10,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.3)', // CHANGED: Lighter background for progress bar
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
    color: '#e2e8f0', // CHANGED: Lighter gray for message
  },
  budgetStatusContainer: {
    alignItems: 'center',
    paddingVertical: 5,
  },
  budgetStatusText: {
    fontSize: 12,
    color: '#e2e8f0', // CHANGED: Lighter gray for italic text
    fontStyle: 'italic',
  },
  lastUpdated: {
    fontSize: 10,
    color: '#cbd5e0', // CHANGED: Even lighter gray
    textAlign: 'center',
    marginTop: 5,
  },
});

export default AccountSummary;