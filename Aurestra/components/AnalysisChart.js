// components/AnalysisChart.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const AnalysisChart = () => {
  return (
    <View style={styles.card}>
      {/* Chart Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Income & Expenses</Text>
        <View style={styles.iconGroup}>
          <Icon name="magnify" size={24} color="#a0aec0" style={styles.icon} />
          <Icon name="calendar-month-outline" size={24} color="#a0aec0" />
        </View>
      </View>

      {/* Main Chart Area */}
      <View style={styles.chartArea}>
        {/* Y-Axis Labels */}
        <View style={styles.yAxis}>
          <Text style={styles.yAxisLabel}>15k</Text>
          <Text style={styles.yAxisLabel}>10k</Text>
          <Text style={styles.yAxisLabel}>5k</Text>
          <Text style={styles.yAxisLabel}>1k</Text>
        </View>

        {/* Chart Bars (representing daily data) */}
        <View style={styles.chart}>
          {/* Each View below represents a day's bar */}
          <View style={styles.barContainer}>
            <View style={[styles.bar, styles.blueBar, { height: '30%' }]} />
            <View style={[styles.bar, styles.greenBar, { height: '50%' }]} />
            <Text style={styles.xAxisLabel}>Mon</Text>
          </View>
          <View style={styles.barContainer}>
            <View style={[styles.bar, styles.blueBar, { height: '10%' }]} />
            <View style={[styles.bar, styles.greenBar, { height: '20%' }]} />
            <Text style={styles.xAxisLabel}>Tue</Text>
          </View>
          <View style={styles.barContainer}>
            <View style={[styles.bar, styles.blueBar, { height: '40%' }]} />
            <View style={[styles.bar, styles.greenBar, { height: '15%' }]} />
            <Text style={styles.xAxisLabel}>Wed</Text>
          </View>
          <View style={styles.barContainer}>
            <View style={[styles.bar, styles.blueBar, { height: '20%' }]} />
            <View style={[styles.bar, styles.greenBar, { height: '60%' }]} />
            <Text style={styles.xAxisLabel}>Thu</Text>
          </View>
          <View style={styles.barContainer}>
            <View style={[styles.bar, styles.blueBar, { height: '5%' }]} />
            <View style={[styles.bar, styles.greenBar, { height: '10%' }]} />
            <Text style={styles.xAxisLabel}>Fri</Text>
          </View>
          <View style={styles.barContainer}>
            <View style={[styles.bar, styles.blueBar, { height: '3%' }]} />
            <View style={[styles.bar, styles.greenBar, { height: '5%' }]} />
            <Text style={styles.xAxisLabel}>Sat</Text>
          </View>
          <View style={styles.barContainer}>
            <View style={[styles.bar, styles.blueBar, { height: '15%' }]} />
            <View style={[styles.bar, styles.greenBar, { height: '30%' }]} />
            <Text style={styles.xAxisLabel}>Sun</Text>
          </View>
        </View>
      </View>

      {/* Income and Expense Totals */}
      <View style={styles.totalsContainer}>
        <View style={styles.totalItem}>
          <View style={styles.totalIcon}>
            <Icon name="arrow-up" size={16} color="#4299e1" />
          </View>
          <View style={styles.totalTextContainer}>
            <Text style={styles.totalLabel}>Income</Text>
            <Text style={styles.totalAmount}>$4,120.00</Text>
          </View>
        </View>
        <View style={styles.totalItem}>
          <View style={styles.totalIcon}>
            <Icon name="arrow-down" size={16} color="#34d399" />
          </View>
          <View style={styles.totalTextContainer}>
            <Text style={styles.totalLabel}>Expense</Text>
            <Text style={styles.totalAmount}>$1,187.40</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
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
    color: '#2d3748',
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
    color: '#a0aec0',
  },
  chart: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
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
    backgroundColor: '#34d399',
  },
  blueBar: {
    backgroundColor: '#4299e1',
  },
  xAxisLabel: {
    fontSize: 12,
    marginTop: 5,
    color: '#718096',
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
    backgroundColor: '#ebf4ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  totalTextContainer: {},
  totalLabel: {
    fontSize: 12,
    color: '#a0aec0',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3748',
  },
});

export default AnalysisChart;