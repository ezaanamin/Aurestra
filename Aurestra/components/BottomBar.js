import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const BottomBar = ({ navigation }) => {
  const state = navigation?.getState();
  const activeRouteName =
    state?.routeNames?.[state.index] ?? null;

  const isScreenActive = (screenName) =>
    activeRouteName === screenName;

  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => navigation.navigate('Home')}
      >
        <View
          style={[
            styles.navIconWrapper,
            isScreenActive('Home') && styles.navIconActive,
          ]}
        >
          <Icon
            name="home"
            size={24}
            color={isScreenActive('Home') ? '#FFFFFF' : '#94A3B8'}
          />
        </View>
        <Text
          style={[
            styles.navLabel,
            isScreenActive('Home') && styles.navLabelActive,
          ]}
        >
          Home
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navItem}
        onPress={() => navigation.navigate('Budget')}
      >
        <View
          style={[
            styles.navIconWrapper,
            isScreenActive('Budget') && styles.navIconActive,
          ]}
        >
          <Icon
            name="chart-bar"
            size={24}
            color={isScreenActive('Budget') ? '#FFFFFF' : '#94A3B8'}
          />
        </View>
        <Text
          style={[
            styles.navLabel,
            isScreenActive('Budget') && styles.navLabelActive,
          ]}
        >
          Budget
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navItem}
        onPress={() => navigation.navigate('Transaction')}
      >
        <View
          style={[
            styles.navIconWrapper,
            isScreenActive('Transaction') && styles.navIconActive,
          ]}
        >
          <Icon
            name="swap-horizontal"
            size={24}
            color={isScreenActive('Transaction') ? '#FFFFFF' : '#94A3B8'}
          />
        </View>
        <Text
          style={[
            styles.navLabel,
            isScreenActive('Transaction') && styles.navLabelActive,
          ]}
        >
          Transactions
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navItem}
        onPress={() => navigation.navigate('Saving')}
      >
        <View
          style={[
            styles.navIconWrapper,
            isScreenActive('Saving') && styles.navIconActive,
          ]}
        >
          <Icon
            name="piggy-bank"
            size={24}
            color={isScreenActive('Saving') ? '#FFFFFF' : '#94A3B8'}
          />
        </View>
        <Text
          style={[
            styles.navLabel,
            isScreenActive('Saving') && styles.navLabelActive,
          ]}
        >
          Savings
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navItem}
        onPress={() => navigation.navigate('Profile')}
      >
        <View
          style={[
            styles.navIconWrapper,
            isScreenActive('Profile') && styles.navIconActive,
          ]}
        >
          <Icon
            name="account-circle"
            size={24}
            color={isScreenActive('Profile') ? '#FFFFFF' : '#94A3B8'}
          />
        </View>
        <Text
          style={[
            styles.navLabel,
            isScreenActive('Profile') && styles.navLabelActive,
          ]}
        >
          Profile
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  navIconWrapper: {
    padding: 8,
    borderRadius: 16,
  },
  navIconActive: {
    backgroundColor: '#3B82F6',
  },
  navLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#3B82F6',
  },
});

export default BottomBar;
