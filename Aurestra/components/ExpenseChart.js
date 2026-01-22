// components/ExpenseChart.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSettings } from '../context/SettingsContext';

const ExpenseChart = () => {
  const { colors } = useSettings();

  // Dummy data for the chart bars
  const chartData = [
    { week: '1st Week', height1: '25%', height2: '15%' },
    { week: '2nd Week', height1: '5%', height2: '20%' },
    { week: '3rd Week', height1: '60%', height2: '25%' },
    { week: '4th Week', height1: '30%', height2: '40%' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Chart header with title and icons */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>April Expenses</Text>
        <View style={styles.iconGroup}>
          <Icon name="magnify" size={24} color={colors.icon} style={styles.icon} />
          <Icon name="calendar-month-outline" size={24} color={colors.icon} />
        </View>
      </View>
      {/* Main chart area */}
      <View style={styles.chartArea}>
        {/* Y-axis labels */}
        <View style={styles.yAxis}>
          {['15k', '10k', '5k', '1k'].map(label => (
            <Text key={label} style={[styles.yAxisLabel, { color: colors.textSecondary }]}>{label}</Text>
          ))}
          <Text style={styles.yAxisLabel}></Text>
        </View>
        {/* Chart bars */}
        <View style={styles.chart}>
          {chartData.map((data, index) => (
            <View key={index} style={styles.barGroup}>
              {/* First bar (green/secondary) */}
              <View style={[styles.bar, { backgroundColor: colors.secondary, height: data.height1 }]} />
              {/* Second bar (blue/primary) */}
              <View style={[styles.bar, { backgroundColor: colors.primary, height: data.height2 }]} />
              {/* X-axis label (week) */}
              <Text style={[styles.xAxisLabel, { color: colors.textSecondary }]}>{data.week}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  iconGroup: {
    flexDirection: 'row',
  },
  icon: {
    marginRight: 10,
  },
  chartArea: {
    flexDirection: 'row',
  },
  yAxis: {
    justifyContent: 'space-between',
    paddingRight: 10,
    paddingBottom: 25,
  },
  yAxisLabel: {
    fontSize: 12,
  },
  chart: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  },
  barGroup: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: 10,
    borderRadius: 5,
    marginHorizontal: 2,
  },
  xAxisLabel: {
    fontSize: 12,
    marginTop: 5,
  },
});

export default ExpenseChart;