// screen/CategoryScreen.js

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import AnalysisHeader from '../components/AnalysisHeader';
import AccountSummary from '../components/AccountSummary';
import CategoryItem from '../components/CategoryItem';
import BottomBar from '../components/BottomBar';

const categories = [
  { name: 'Food', icon: 'silverware' },
  { name: 'Transport', icon: 'bus' },
  { name: 'Medicine', icon: 'pill' },
  { name: 'Groceries', icon: 'shopping' },
  { name: 'Rent', icon: 'key' },
  { name: 'Gifts', icon: 'gift' },
  { name: 'Savings', icon: 'bank' },
  { name: 'Entertainment', icon: 'ticket-percent' },
  { name: 'More', icon: 'plus' },
];

const CategoryScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2b6cb0" />
      <View style={styles.headerBackground}>
        <SafeAreaView>
          <AnalysisHeader navigation={navigation} title="Categories" />
          <AccountSummary totalBalance="7,783.00" totalExpense="-1,187.40" progress={30} />
        </SafeAreaView>
      </View>
      <ScrollView style={styles.contentContainer}>
        <View style={styles.categoryGrid}>
          {categories.map((category, index) => (
            <CategoryItem key={index} name={category.name} icon={category.icon} />
          ))}
        </View>
      </ScrollView>
      <BottomBar navigation={navigation} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerBackground: {
    backgroundColor: '#2b6cb0',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 20,
  },
  contentContainer: {
    flex: 1,
    marginTop: 20,
    marginHorizontal: 20,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});

export default CategoryScreen;