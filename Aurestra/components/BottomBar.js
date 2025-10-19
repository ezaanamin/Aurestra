// components/BottomBar.js
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const BottomBar = ({ navigation }) => {
  const isScreenActive = (screenName) => {
    if (!navigation || !navigation.getState()) return false;
    return navigation.getState().routeNames[navigation.getState().index] === screenName;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.iconWrapper} onPress={() => navigation.navigate('Home')}>
        <Icon name="home" size={24} color={isScreenActive('Home') ? '#34d399' : '#a0aec0'} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconWrapper} onPress={() => navigation.navigate('Budget')}>
        <Icon name="chart-bar" size={24} color={isScreenActive('Budget') ? '#34d399' : '#a0aec0'} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconWrapper} onPress={() => navigation.navigate('Transaction')}>
        <Icon name="refresh-circle-outline" size={24} color={isScreenActive('Transaction') ? '#34d399' : '#a0aec0'} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconWrapper} onPress={() => navigation.navigate('Categories')}>
        <Icon name="credit-card-outline" size={24} color={isScreenActive('Categories') ? '#34d399' : '#a0aec0'} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconWrapper} onPress={() => navigation.navigate('Profile')}>
        <Icon name="account-circle-outline" size={24} color={isScreenActive('Profile') ? '#34d399' : '#a0aec0'} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 60,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 20,
  },
  iconWrapper: {
    padding: 10,
  },
});

export default BottomBar;