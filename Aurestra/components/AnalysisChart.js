// components/AnalysisChart.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSettings } from '../context/SettingsContext';

const AnalysisChart = () => {
  const { colors } = useSettings();

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      {/* Chart Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Income & Expenses</Text>
        <View style={styles.iconGroup}>
          <Icon name="magnify" size={24} color={colors.icon} style={styles.icon} />
          <Icon name="calendar-month-outline" size={24} color={colors.icon} />
        </View>
      </View>

      {/* Main Chart Area */}
      <View style={styles.chartArea}>
        {/* Y-Axis Labels */}
        <View style={styles.yAxis}>
          {['15k', '10k', '5k', '1k'].map(label => (
            <Text key={label} style={[styles.yAxisLabel, { color: colors.textSecondary }]}>{label}</Text>
          ))}
        </View>

        {/* Chart Bars (representing daily data) */}
        <View style={[styles.chart, { borderColor: colors.border }]}>
          {/* Each View below represents a day's bar */}
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
            // Mock heights for simplicity or passed props
            const heights = [
              { blue: '30%', green: '50%' },
              { blue: '10%', green: '20%' },
              { blue: '40%', green: '15%' },
              { blue: '20%', green: '60%' },
              { blue: '5%', green: '10%' },
              { blue: '3%', green: '5%' },
              { blue: '15%', green: '30%' },
            ];
            return (
              <View key={day} style={styles.barContainer}>
                <View style={[styles.bar, styles.blueBar, { height: heights[index].blue, backgroundColor: colors.primary }]} />
                <View style={[styles.bar, styles.greenBar, { height: heights[index].green, backgroundColor: colors.secondary }]} />
                <Text style={[styles.xAxisLabel, { color: colors.textSecondary }]}>{day}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Income and Expense Totals */}
      <View style={styles.totalsContainer}>
        <View style={styles.totalItem}>
          <View style={[styles.totalIcon, { backgroundColor: colors.primary + '20' }]}>
            <Icon name="arrow-up" size={16} color={colors.primary} />
          </View>
          <View style={styles.totalTextContainer}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Income</Text>
            <Text style={[styles.totalAmount, { color: colors.text }]}>$4,120.00</Text>
          </View>
        </View>
        <View style={styles.totalItem}>
          <View style={[styles.totalIcon, { backgroundColor: colors.secondary + '20' }]}>
            <Icon name="arrow-down" size={16} color={colors.secondary} />
          </View>
          <View style={styles.totalTextContainer}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Expense</Text>
            <Text style={[styles.totalAmount, { color: colors.text }]}>$1,187.40</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
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
    height: 150,
    marginBottom: 20,
  },
  yAxis: {
    justifyContent: 'space-between',
    paddingRight: 10,
  },
  yAxisLabel: {
    fontSize: 12,
  },
  chart: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
  },
  barContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  bar: {
    width: 15,
  },
  greenBar: {
    // backgroundColor handled inline for theme
  },
  blueBar: {
    // backgroundColor handled inline for theme
  },
  xAxisLabel: {
    fontSize: 12,
    marginTop: 5,
  },
  totalsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  totalItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  totalTextContainer: {},
  totalLabel: {
    fontSize: 12,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AnalysisChart;