import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSettings } from '../context/SettingsContext';

const BottomBar = ({ navigation }) => {
  const state = navigation?.getState();
  const activeRouteName =
    state?.routeNames?.[state.index] ?? null;

  const isScreenActive = (screenName) =>
    activeRouteName === screenName;

  const { t, colors } = useSettings();

  return (
    <View style={[styles.bottomNav, {
      backgroundColor: colors.card,
      borderTopColor: colors.border
    }]}>
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => navigation.navigate('Home')}
      >
        <View
          style={[
            styles.navIconWrapper,
            isScreenActive('Home') && { backgroundColor: colors.primary },
          ]}
        >
          <Icon
            name="home"
            size={24}
            color={isScreenActive('Home') ? '#FFFFFF' : colors.textSecondary}
          />
        </View>
        <Text
          style={[
            styles.navLabel,
            { color: colors.textSecondary },
            isScreenActive('Home') && { color: colors.primary },
          ]}
        >
          {t('home')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navItem}
        onPress={() => navigation.navigate('Budget')}
      >
        <View
          style={[
            styles.navIconWrapper,
            isScreenActive('Budget') && { backgroundColor: colors.primary },
          ]}
        >
          <Icon
            name="chart-bar"
            size={24}
            color={isScreenActive('Budget') ? '#FFFFFF' : colors.textSecondary}
          />
        </View>
        <Text
          style={[
            styles.navLabel,
            { color: colors.textSecondary },
            isScreenActive('Budget') && { color: colors.primary },
          ]}
        >
          {t('budget')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navItem}
        onPress={() => navigation.navigate('Transaction')}
      >
        <View
          style={[
            styles.navIconWrapper,
            isScreenActive('Transaction') && { backgroundColor: colors.primary },
          ]}
        >
          <Icon
            name="swap-horizontal"
            size={24}
            color={isScreenActive('Transaction') ? '#FFFFFF' : colors.textSecondary}
          />
        </View>
        <Text
          style={[
            styles.navLabel,
            { color: colors.textSecondary },
            isScreenActive('Transaction') && { color: colors.primary },
          ]}
        >
          {t('transactions')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navItem}
        onPress={() => navigation.navigate('Saving')}
      >
        <View
          style={[
            styles.navIconWrapper,
            isScreenActive('Saving') && { backgroundColor: colors.primary },
          ]}
        >
          <Icon
            name="piggy-bank"
            size={24}
            color={isScreenActive('Saving') ? '#FFFFFF' : colors.textSecondary}
          />
        </View>
        <Text
          style={[
            styles.navLabel,
            { color: colors.textSecondary },
            isScreenActive('Saving') && { color: colors.primary },
          ]}
        >
          {t('savings')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navItem}
        onPress={() => navigation.navigate('Profile')}
      >
        <View
          style={[
            styles.navIconWrapper,
            isScreenActive('Profile') && { backgroundColor: colors.primary },
          ]}
        >
          <Icon
            name="account-circle"
            size={24}
            color={isScreenActive('Profile') ? '#FFFFFF' : colors.textSecondary}
          />
        </View>
        <Text
          style={[
            styles.navLabel,
            { color: colors.textSecondary },
            isScreenActive('Profile') && { color: colors.primary },
          ]}
        >
          {t('profile')}
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  navIconWrapper: {
    padding: 8,
    borderRadius: 16,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
});

export default BottomBar;
