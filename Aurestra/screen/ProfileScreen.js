import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

const ProfileScreen = ({ navigation }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  // User Stats
  const userStats = [
    { label: 'Transactions', value: '248', icon: 'swap-horizontal', color: '#3B82F6' },
    { label: 'Categories', value: '12', icon: 'shape', color: '#8B5CF6' },
    { label: 'Goals', value: '4', icon: 'target', color: '#10B981' },
  ];

  // Menu Sections
  const accountMenuItems = [
    { icon: 'account-edit', label: 'Edit Profile', screen: 'EditProfile', color: '#3B82F6' },
    { icon: 'wallet', label: 'Payment Methods', screen: 'PaymentMethods', color: '#8B5CF6' },
    { icon: 'bank', label: 'Linked Accounts', screen: 'LinkedAccounts', color: '#10B981' },
    { icon: 'file-document', label: 'Transaction History', screen: 'Transaction', color: '#F59E0B' },
  ];

  const preferencesMenuItems = [
    { icon: 'bell', label: 'Notifications', toggle: true, value: notificationsEnabled, setter: setNotificationsEnabled, color: '#EF4444' },
    { icon: 'fingerprint', label: 'Biometric Login', toggle: true, value: biometricEnabled, setter: setBiometricEnabled, color: '#8B5CF6' },
    { icon: 'theme-light-dark', label: 'Dark Mode', toggle: true, value: darkModeEnabled, setter: setDarkModeEnabled, color: '#64748B' },
    { icon: 'translate', label: 'Language', subtitle: 'English', color: '#3B82F6' },
    { icon: 'currency-usd', label: 'Currency', subtitle: 'PKR', color: '#10B981' },
  ];

  const supportMenuItems = [
    { icon: 'help-circle', label: 'Help Center', color: '#3B82F6' },
    { icon: 'information', label: 'About', color: '#8B5CF6' },
    { icon: 'shield-check', label: 'Privacy Policy', color: '#10B981' },
    { icon: 'file-document-outline', label: 'Terms of Service', color: '#F59E0B' },
  ];

  const isScreenActive = (screenName) => {
    return screenName === 'Profile';
  };

  const renderMenuItem = (item, index, isLastItem) => {
    if (item.toggle) {
      return (
        <View key={index} style={[styles.menuItem, isLastItem && styles.menuItemLast]}>
          <View style={[styles.menuIconWrapper, { backgroundColor: item.color + '20' }]}>
            <Icon name={item.icon} size={22} color={item.color} />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuLabel}>{item.label}</Text>
          </View>
          <Switch
            value={item.value}
            onValueChange={item.setter}
            trackColor={{ false: '#E2E8F0', true: item.color + '40' }}
            thumbColor={item.value ? item.color : '#FFFFFF'}
          />
        </View>
      );
    }

    return (
      <TouchableOpacity
        key={index}
        style={[styles.menuItem, isLastItem && styles.menuItemLast]}
        onPress={() => item.screen && navigation.navigate(item.screen)}
      >
        <View style={[styles.menuIconWrapper, { backgroundColor: item.color + '20' }]}>
          <Icon name={item.icon} size={22} color={item.color} />
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={styles.menuLabel}>{item.label}</Text>
          {item.subtitle && <Text style={styles.menuSubtitle}>{item.subtitle}</Text>}
        </View>
        <Icon name="chevron-right" size={20} color="#94A3B8" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E293B" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with Gradient */}
        <LinearGradient colors={['#1E293B', '#334155']} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Icon name="arrow-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profile</Text>
            <TouchableOpacity style={styles.settingsButton}>
              <Icon name="cog" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.profileImageWrapper}>
              <Image
                source={{ uri: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png' }}
                style={styles.profileImage}
              />
              <TouchableOpacity style={styles.editImageButton}>
                <Icon name="camera" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.profileName}>Muhammad Ali</Text>
            <Text style={styles.profileEmail}>muhammad.ali@example.com</Text>
            <View style={styles.verifiedBadge}>
              <Icon name="check-decagram" size={16} color="#10B981" />
              <Text style={styles.verifiedText}>Verified Account</Text>
            </View>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            {userStats.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <View style={[styles.statIconWrapper, { backgroundColor: stat.color + '20' }]}>
                  <Icon name={stat.icon} size={20} color={stat.color} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Menu Sections */}
        <View style={styles.content}>
          {/* Account Section */}
          <View style={styles.sectionHeader}>
            <Icon name="account-circle" size={20} color="#64748B" />
            <Text style={styles.sectionTitle}>Account</Text>
          </View>
          <View style={styles.menuSection}>
            {accountMenuItems.map((item, index) =>
              renderMenuItem(item, index, index === accountMenuItems.length - 1)
            )}
          </View>

          {/* Preferences Section */}
          <View style={styles.sectionHeader}>
            <Icon name="tune" size={20} color="#64748B" />
            <Text style={styles.sectionTitle}>Preferences</Text>
          </View>
          <View style={styles.menuSection}>
            {preferencesMenuItems.map((item, index) =>
              renderMenuItem(item, index, index === preferencesMenuItems.length - 1)
            )}
          </View>

          {/* Support Section */}
          <View style={styles.sectionHeader}>
            <Icon name="lifebuoy" size={20} color="#64748B" />
            <Text style={styles.sectionTitle}>Support</Text>
          </View>
          <View style={styles.menuSection}>
            {supportMenuItems.map((item, index) =>
              renderMenuItem(item, index, index === supportMenuItems.length - 1)
            )}
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton}>
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              style={styles.logoutGradient}
            >
              <Icon name="logout" size={20} color="#FFFFFF" />
              <Text style={styles.logoutText}>Logout</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* App Version */}
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => navigation.navigate('Home')}
        >
          <View style={[styles.navIconWrapper, isScreenActive('Home') && styles.navIconActive]}>
            <Icon 
              name="home" 
              size={24} 
              color={isScreenActive('Home') ? '#FFFFFF' : '#94A3B8'} 
            />
          </View>
          <Text style={[styles.navLabel, isScreenActive('Home') && styles.navLabelActive]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => navigation.navigate('Budget')}
        >
          <View style={[styles.navIconWrapper, isScreenActive('Budget') && styles.navIconActive]}>
            <Icon 
              name="chart-bar" 
              size={24} 
              color={isScreenActive('Budget') ? '#FFFFFF' : '#94A3B8'} 
            />
          </View>
          <Text style={[styles.navLabel, isScreenActive('Budget') && styles.navLabelActive]}>
            Budget
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => navigation.navigate('Transaction')}
        >
          <View style={[styles.navIconWrapper, isScreenActive('Transaction') && styles.navIconActive]}>
            <Icon 
              name="swap-horizontal" 
              size={24} 
              color={isScreenActive('Transaction') ? '#FFFFFF' : '#94A3B8'} 
            />
          </View>
          <Text style={[styles.navLabel, isScreenActive('Transaction') && styles.navLabelActive]}>
            Transactions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => navigation.navigate('Saving')}
        >
          <View style={[styles.navIconWrapper, isScreenActive('Saving') && styles.navIconActive]}>
            <Icon 
              name="piggy-bank" 
              size={24} 
              color={isScreenActive('Saving') ? '#FFFFFF' : '#94A3B8'} 
            />
          </View>
          <Text style={[styles.navLabel, isScreenActive('Saving') && styles.navLabelActive]}>
            Savings
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={[styles.navIconWrapper, isScreenActive('Profile') && styles.navIconActive]}>
            <Icon 
              name="account-circle" 
              size={24} 
              color={isScreenActive('Profile') ? '#FFFFFF' : '#94A3B8'} 
            />
          </View>
          <Text style={[styles.navLabel, isScreenActive('Profile') && styles.navLabelActive]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  settingsButton: {
    padding: 8,
  },
  profileCard: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  profileImageWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#334155',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 12,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  verifiedText: {
    fontSize: 12,
    color: '#6EE7B7',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  logoutButton: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  versionText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 24,
  },
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

export default ProfileScreen;