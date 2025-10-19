// components/TimeframeTabs.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const TimeframeTabs = () => {
  const [activeTab, setActiveTab] = useState('Monthly');
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'Daily' && styles.activeTab]}
        onPress={() => setActiveTab('Daily')}>
        <Text
          style={[
            styles.tabText,
            activeTab === 'Daily' && styles.activeTabText,
          ]}>
          Daily
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'Weekly' && styles.activeTab]}
        onPress={() => setActiveTab('Weekly')}>
        <Text
          style={[
            styles.tabText,
            activeTab === 'Weekly' && styles.activeTabText,
          ]}>
          Weekly
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'Monthly' && styles.activeTab]}
        onPress={() => setActiveTab('Monthly')}>
        <Text
          style={[
            styles.tabText,
            activeTab === 'Monthly' && styles.activeTabText,
          ]}>
          Monthly
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#edf2f7',
    marginHorizontal: 20,
    borderRadius: 25,
    marginTop: 20,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: '#34d399',
  },
  tabText: {
    fontSize: 16,
    color: '#4a5568',
  },
  activeTabText: {
    color: '#fff',
  },
});

export default TimeframeTabs;