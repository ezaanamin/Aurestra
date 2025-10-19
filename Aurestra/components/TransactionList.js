// components/TransactionList.js
import React from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import TransactionItem from './TransactionItem';
import { transactions } from '../data/dummyData';

const TransactionList = () => {
  return (
    <View style={styles.container}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionItem item={item} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    marginTop: 20,
  },
});

export default TransactionList;