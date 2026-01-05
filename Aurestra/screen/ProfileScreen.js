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
  Modal,
  FlatList
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { useSettings } from '../context/SettingsContext';

import { fetchUserProfile, registerDeviceToken } from '../API/slice/API';
import { API_BASE_URL } from '../API_URL';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const LANGUAGES = ['English', 'Urdu', 'Arabic', 'French', 'Spanish'];
const CURRENCIES = ['PKR', 'USD', 'EUR', 'GBP', 'AED'];

const ProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.API);
  const {
    isDarkMode,
    updateTheme,
    theme,
    notificationsEnabled,
    toggleNotifications,
    language,
    updateLanguage,
    currency,
    updateCurrency,
    t
  } = useSettings();

  const [langModalVisible, setLangModalVisible] = useState(false);
  const [currModalVisible, setCurrModalVisible] = useState(false);

  console.log('ProfileScreen Render:', {
    user,
    settings: { language, currency, isDarkMode, notificationsEnabled }
  });

  React.useEffect(() => {
    dispatch(fetchUserProfile());
  }, [dispatch]);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    // Optional: dispatch(clearState())
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const registerTokenIfAvailable = async () => {
    try {
      const pToken = await AsyncStorage.getItem('pushToken');
      if (pToken) {
        dispatch(registerDeviceToken(pToken));
      }
    } catch (e) {
      console.error('Profile register token fail:', e);
    }
  };

  // User Stats
  const userStats = [
    { label: t('transactions'), value: user?.stats?.transactions || '0', icon: 'swap-horizontal', color: '#3B82F6' },
    { label: 'Categories', value: user?.stats?.categories || '0', icon: 'shape', color: '#8B5CF6' },
    { label: 'Goals', value: user?.stats?.goals || '0', icon: 'target', color: '#10B981' },
  ];

  // Menu Sections
  const accountMenuItems = [
    { icon: 'account-edit', label: t('editProfile'), screen: 'EditProfile', color: '#3B82F6' },
    { icon: 'wallet', label: t('paymentMethods'), screen: 'PaymentMethods', color: '#8B5CF6' },
    { icon: 'bank', label: t('linkedAccounts'), screen: 'LinkedAccounts', color: '#10B981' },
    { icon: 'shape', label: 'Categories', screen: 'CategoryManagement', color: '#8B5CF6' },
    { icon: 'file-document', label: t('transactionHistory'), screen: 'FullHistory', color: '#F59E0B' },
  ];

  const preferencesMenuItems = [
    {
      icon: 'bell',
      label: t('notifications'),
      toggle: true,
      value: notificationsEnabled,
      setter: (val) => {
        toggleNotifications(val);
        if (val) {
          // If enabling notifications, ensure device is registered
          registerTokenIfAvailable();
        }
      },
      color: '#EF4444'
    },
    {
      icon: 'theme-light-dark',
      label: t('darkMode'),
      toggle: true,
      value: isDarkMode,
      setter: (val) => updateTheme(val ? 'dark' : 'light'),
      color: '#64748B'
    },
    {
      icon: 'translate',
      label: t('language'),
      subtitle: language,
      action: () => setLangModalVisible(true), // Open Modal
      color: '#3B82F6'
    },
    {
      icon: 'currency-usd',
      label: t('currency'),
      subtitle: currency,
      action: () => setCurrModalVisible(true), // Open Modal
      color: '#10B981'
    },
  ];

  const supportMenuItems = [
    { icon: 'help-circle', label: t('helpCenter'), color: '#3B82F6' },
    { icon: 'information', label: t('about'), color: '#8B5CF6' },
    { icon: 'shield-check', label: t('privacyPolicy'), color: '#10B981' },
    { icon: 'file-document-outline', label: t('termsOfService'), color: '#F59E0B' },
  ];

  const isScreenActive = (screenName) => {
    return screenName === 'Profile';
  };

  const themeStyles = {
    container: isDarkMode ? '#0F172A' : '#F8FAFC',
    text: isDarkMode ? '#F1F5F9' : '#1E293B',
    cardBg: isDarkMode ? '#1E293B' : '#FFFFFF',
    headerGradient: isDarkMode ? ['#020617', '#1E293B'] : ['#1E293B', '#334155'],
    sectionHeader: isDarkMode ? '#94A3B8' : '#64748B',
    border: isDarkMode ? '#334155' : '#E2E8F0'
  };

  const renderMenuItem = (item, index, isLastItem) => {
    if (item.toggle) {
      return (
        <View key={index} style={[styles.menuItem, isLastItem && styles.menuItemLast, { borderBottomColor: themeStyles.border }]}>
          <View style={[styles.menuIconWrapper, { backgroundColor: item.color + '20' }]}>
            <Icon name={item.icon} size={22} color={item.color} />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={[styles.menuLabel, { color: themeStyles.text }]}>{item.label}</Text>
          </View>
          <Switch
            value={item.value}
            onValueChange={item.setter}
            trackColor={{ false: isDarkMode ? '#334155' : '#E2E8F0', true: item.color + '40' }}
            thumbColor={item.value ? item.color : '#FFFFFF'}
          />
        </View>
      );
    }

    return (
      <TouchableOpacity
        key={index}
        style={[styles.menuItem, isLastItem && styles.menuItemLast, { borderBottomColor: themeStyles.border }]}
        onPress={() => item.action ? item.action() : (item.screen && navigation.navigate(item.screen))}
      >
        <View style={[styles.menuIconWrapper, { backgroundColor: item.color + '20' }]}>
          <Icon name={item.icon} size={22} color={item.color} />
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={[styles.menuLabel, { color: themeStyles.text }]}>{item.label}</Text>
          {item.subtitle && <Text style={styles.menuSubtitle}>{item.subtitle}</Text>}
        </View>
        <Icon name="chevron-right" size={20} color="#94A3B8" />
      </TouchableOpacity>
    );
  };

  const SelectionModal = ({ visible, onClose, title, data, onSelect, current }) => (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: themeStyles.cardBg }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: themeStyles.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={data}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.modalItem, { borderBottomColor: themeStyles.border }]}
                onPress={() => { onSelect(item); onClose(); }}
              >
                <Text style={[styles.modalItemText, { color: themeStyles.text }]}>{item}</Text>
                {current === item && <Icon name="check" size={20} color="#3B82F6" />}
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyles.container }]}>
      <StatusBar barStyle="light-content" backgroundColor={themeStyles.headerGradient[0]} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with Gradient */}
        <LinearGradient colors={themeStyles.headerGradient} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Icon name="arrow-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('profile')}</Text>
            <TouchableOpacity style={styles.settingsButton}>
              <Icon name="cog" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.profileImageWrapper}>
              <Image
                source={{
                  uri: user?.avatar_url
                    ? (user.avatar_url.startsWith('http') ? user.avatar_url : `${API_BASE_URL}${user.avatar_url}`)
                    : 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'
                }}
                style={styles.profileImage}
              />
              <TouchableOpacity style={styles.editImageButton} onPress={() => navigation.navigate('EditProfile')}>
                <Icon name="pencil" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.profileName}>{user?.full_name || 'User'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'user@example.com'}</Text>
            <View style={styles.verifiedBadge}>
              <Icon name="check-decagram" size={16} color="#10B981" />
              <Text style={styles.verifiedText}>{t('verifiedAccount')}</Text>
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
            <Icon name="account-circle" size={20} color={themeStyles.sectionHeader} />
            <Text style={[styles.sectionTitle, { color: themeStyles.sectionHeader }]}>{t('account')}</Text>
          </View>
          <View style={[styles.menuSection, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border }]}>
            {accountMenuItems.map((item, index) =>
              renderMenuItem(item, index, index === accountMenuItems.length - 1)
            )}
          </View>

          {/* Preferences Section */}
          <View style={styles.sectionHeader}>
            <Icon name="tune" size={20} color={themeStyles.sectionHeader} />
            <Text style={[styles.sectionTitle, { color: themeStyles.sectionHeader }]}>{t('preferences')}</Text>
          </View>
          <View style={[styles.menuSection, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border }]}>
            {preferencesMenuItems.map((item, index) =>
              renderMenuItem(item, index, index === preferencesMenuItems.length - 1)
            )}
          </View>

          {/* Support Section */}
          <View style={styles.sectionHeader}>
            <Icon name="lifebuoy" size={20} color={themeStyles.sectionHeader} />
            <Text style={[styles.sectionTitle, { color: themeStyles.sectionHeader }]}>{t('support')}</Text>
          </View>
          <View style={[styles.menuSection, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border }]}>
            {supportMenuItems.map((item, index) =>
              renderMenuItem(item, index, index === supportMenuItems.length - 1)
            )}
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              style={styles.logoutGradient}
            >
              <Icon name="logout" size={20} color="#FFFFFF" />
              <Text style={styles.logoutText}>{t('logout')}</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* App Version */}
          <Text style={styles.versionText}>Version 1.1.0</Text>
        </View>
      </ScrollView>

      {/* Modals */}
      <SelectionModal
        visible={langModalVisible}
        onClose={() => setLangModalVisible(false)}
        title="Select Language"
        data={LANGUAGES}
        onSelect={updateLanguage}
        current={language}
      />
      <SelectionModal
        visible={currModalVisible}
        onClose={() => setCurrModalVisible(false)}
        title="Select Currency"
        data={CURRENCIES}
        onSelect={updateCurrency}
        current={currency}
      />

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
            {t('home')}
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
            {t('budget')}
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
            {t('transactions')}
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
            {t('savings')}
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
            {t('profile')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuSection: {
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  modalItemText: {
    fontSize: 16,
    fontWeight: '500'
  }
});

export default ProfileScreen;