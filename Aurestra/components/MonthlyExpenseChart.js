import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BarChart } from 'react-native-chart-kit';
import { fetchFourMonthHistory } from "../API/slice/API";

const MonthlyExpenseChart = () => {
  const dispatch = useDispatch();
  
  const historyData = useSelector((state) => state.API.fourMonthHistory);
  const historyStatus = useSelector((state) => state.API.historyStatus);
  const historyError = useSelector((state) => state.API.historyError); 
  
  useEffect(() => {
    if (historyStatus === 'idle') {
      dispatch(fetchFourMonthHistory());
    }
  }, [dispatch, historyStatus]);

  // Prepare Chart Data from Redux State
  const chartData = (historyData || [])
    .map(item => {
      const actualExpense = item.actual?.expense || 0;
      const totalBudget = item.budget?.total_budget || 0;
      const type =
        actualExpense > totalBudget
          ? 'over_budget'
          : totalBudget > 0
          ? 'under_budget'
          : 'default';

      return {
        month: item.month,
        value: actualExpense,
        budget: totalBudget,
        type,
      };
    })
    .reverse();

  // Handle Loading/Error/Empty States
  if (historyStatus === 'loading') {
    return (
      <View style={[styles.chartCard, styles.center]}>
        <ActivityIndicator size="large" color="red" />
        <Text style={{ marginTop: 10, color: '#red', fontWeight: '500' }}>
          Loading Budget History...
        </Text>
      </View>
    );
  }

  if (historyStatus === 'failed') {
    console.log("Budget History Fetch Failed:", historyError);
    return (
      <View style={[styles.chartCard, styles.center]}>
        <Icon name="alert-circle-outline" size={32} color="#e53e3e" style={{ marginBottom: 8 }} />
        <Text style={[styles.chartTitle, { color: '#e53e3e', fontSize: 18 }]}>
          Data Load Failed
        </Text>
        <Text style={styles.chartSubtitle}>
          Error: {historyError || 'An unknown error occurred. See console for details.'}
        </Text>
      </View>
    );
  }

  if (chartData.length === 0 && historyStatus === 'succeeded') {
    return (
      <View style={[styles.chartCard, styles.center]}>
        <Icon name="database-off" size={32} color="red" style={{ marginBottom: 8 }} />
        <Text style={styles.chartTitle}>No Historical Data</Text>
        <Text style={styles.chartSubtitle}>
          Set a budget and track expenses to populate this chart.
        </Text>
      </View>
    );
  }

  // Format short currency
  const formatShortCurrency = (amount) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}k`;
    return `${amount.toFixed(0)}`;
  };

  // Build the data object for BarChart
  const labels = chartData.map(item => {
    const date = new Date(item.month + '-01');
    const monthLabel = date.toLocaleString('en-US', { month: 'short' });
    const yearLabel = date.toLocaleString('en-US', { year: '2-digit' });
    return `${monthLabel}-${yearLabel}`;
  });

  // ✅ Split into two datasets: one red (over), one green (under)
  const data = {
    labels,
    datasets: [
      {
        data: chartData.map(item => (item.type === 'over_budget' ? item.value : 0)),
        color: () => '#ef4444', // Red for Over Budget
      },
      {
        data: chartData.map(item => (item.type === 'under_budget' ? item.value : 0)),
        color: () => '#48bb78', // Green for Under Budget
      },
    ],
  };

  const screenWidth = Dimensions.get('window').width - 60;

 const isOverBudget = chartData.some(item => item.type === 'over_budget');

const chartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) =>
    isOverBudget
      ? `rgba(239, 68, 68, ${opacity})` // Red
      : `rgba(72, 187, 120, ${opacity})`, // Green
  labelColor: (opacity = 1) => `rgba(45, 55, 72, ${opacity})`,
  barPercentage: 0.6,
  propsForBackgroundLines: {
    strokeDasharray: '',
    stroke: '#e2e8f0',
    strokeWidth: 1,
  },
  formatYLabel: (value) => `Rs${formatShortCurrency(parseFloat(value))}`,
};


  // Render Component
  return (
    <View style={styles.chartCard}>
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.chartTitle}>Actual Monthly Spending</Text>
          <Text style={styles.chartSubtitle}>Last {chartData.length} months</Text>
        </View>
        <View style={styles.iconContainer}>
          <Icon name="chart-bar" size={24} color="#4299e1" />
        </View>
      </View>

      <View style={styles.chartContainer}>
        <BarChart
          data={data}
          width={screenWidth}
          height={220}
          chartConfig={chartConfig}
          style={styles.chart}
          showValuesOnTopOfBars
          fromZero
          withInnerLines
          segments={4}
          flatColor
        />
      </View>

      <View style={styles.footer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendDotUnderBudget]} />
          <Text style={styles.legendText}>Under Budget</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendDotOverBudget]} />
          <Text style={styles.legendText}>Over Budget</Text>
        </View>
      </View>
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f4f8',
  },
  center: {
    minHeight: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    backgroundColor: '#ebf8ff',
    borderRadius: 12,
    padding: 10,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: 4,
    textAlign: 'center',
  },
  chartSubtitle: {
    fontSize: 13,
    color: '#718096',
    fontWeight: '500',
    textAlign: 'center',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  chart: {
    borderRadius: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f4f8',
    gap: 16,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendDotOverBudget: {
    backgroundColor: '#ef4444',
  },
  legendDotUnderBudget: {
    backgroundColor: '#48bb78',
  },
  legendText: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
});

export default MonthlyExpenseChart;
