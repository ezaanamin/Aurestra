import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import BottomBar from '../components/BottomBar';

import HomeScreen from '../screen/HomeScreen';
import BudgetScreen from '../screen/BudgetScreen';
import TransactionScreen from '../screen/TransactionScreen';
import CategoryScreen from '../screen/CategoryScreen';
import ProfileScreen from '../screen/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Budget" component={BudgetScreen} />
      <Tab.Screen name="Transaction" component={TransactionScreen} />
      <Tab.Screen name="Saving" component={CategoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
