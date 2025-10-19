import  { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Text,
  ScrollView,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { PieChart } from 'react-native-chart-kit';

import AnalysisHeader from '../components/AnalysisHeader';
import MonthlyExpenseChart from '../components/MonthlyExpenseChart';
import TransactionList from '../components/TransactionList';
import BottomBar from '../components/BottomBar';
import { fetchFourMonthHistory } from '../API/slice/API';

const screenWidth = Dimensions.get('window').width - 40;

const TransactionScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const historyData = useSelector((state) => state.API.fourMonthHistory);
  const historyStatus = useSelector((state) => state.API.historyStatus);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (historyStatus === 'idle') dispatch(fetchFourMonthHistory());
  }, [dispatch, historyStatus]);

  const onRefresh = () => {
    setRefreshing(true);
    dispatch(fetchFourMonthHistory()).finally(() => setRefreshing(false));
  };

  // Example trend logic
  const current = historyData?.[0]?.actual?.expense || 0;
  const prev = historyData?.[1]?.actual?.expense || 1;
  const trend = Math.round(((current - prev) / prev) * 100);

  const insight =
    trend > 0
      ? `⚠️ You spent ${trend}% more than last month`
      : `🎉 You spent ${Math.abs(trend)}% less than last month`;

  const pieData = [
    { name: 'Food', amount: 4500, color: '#48bb78', legendFontColor: '#333', legendFontSize: 13 },
    { name: 'Bills', amount: 2500, color: '#4299e1', legendFontColor: '#333', legendFontSize: 13 },
    { name: 'Transport', amount: 1200, color: '#ed8936', legendFontColor: '#333', legendFontSize: 13 },
    { name: 'Shopping', amount: 800, color: '#805ad5', legendFontColor: '#333', legendFontSize: 13 },
  ];

  const topCategories = pieData.sort((a, b) => b.amount - a.amount).slice(0, 3);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4299e1" />
      <View style={styles.headerBackground}>

          <AnalysisHeader navigation={navigation} title="Transactions & Analysis" />
    
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4299e1']} />
        }
      >
     
        <MonthlyExpenseChart />

   
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Spending by Category</Text>
          <PieChart
            data={pieData.map((item) => ({
              name: item.name,
              population: item.amount,
              color: item.color,
              legendFontColor: item.legendFontColor,
              legendFontSize: item.legendFontSize,
            }))}
            width={screenWidth}
            height={200}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="12"
            chartConfig={{
              color: (opacity = 1) => `rgba(0,0,0,${opacity})`,
            }}
          />
        </View>
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Top Spending Categories</Text>
          {topCategories.map((item, index) => (
            <View key={index} style={styles.categoryItem}>
              <View style={[styles.categoryDot, { backgroundColor: item.color }]} />
              <Text style={styles.categoryName}>{item.name}</Text>
              <Text style={styles.categoryAmount}>₹{item.amount}</Text>
            </View>
          ))}
        </View>

        {/* Transaction List */}
        <TransactionList />
      </ScrollView>

      <BottomBar navigation={navigation} />
    </View>
  );
};

// ---------------------------
// 💅 STYLES
// ---------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  headerBackground: {
    backgroundColor: '#4299e1',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 20,
    paddingHorizontal: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  safeArea: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 0,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  summaryCard: {
    backgroundColor: '#ebf8ff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2b6cb0',
    marginBottom: 5,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#cbd5e0',
  },
  filterText: {
    color: '#4a5568',
    fontWeight: '600',
  },
  activeFilter: {
    backgroundColor: '#4299e1',
    borderColor: '#4299e1',
  },
  activeFilterText: {
    color: '#fff',
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  chartTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    color: '#4a5568',
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3748',
  },
});

export default TransactionScreen;
