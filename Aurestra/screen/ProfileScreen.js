import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Switch,
  Modal,
  FlatList,
  Animated,
  ToastAndroid,
  ActivityIndicator,
  TextInput,
  PermissionsAndroid,
  Linking,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { useSettings } from '../context/SettingsContext';

import { fetchUserProfile, registerDeviceToken, logoutUser, triggerManualBackup, getLatestBackup } from '../API/slice/API';
import { API_BASE_URL, setApiUrl } from '../API_URL';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import {
  isNotificationAccessGranted,
  promptBankNotificationAccessSetup,
} from '../utils/bankNotificationBridge';

const APP_VERSION = require('../package.json').version;
const { width } = Dimensions.get('window');

const LANGUAGES = ['English', 'Urdu', 'Arabic', 'French', 'Spanish'];
const CURRENCIES = ['PKR', 'USD', 'EUR', 'GBP', 'AED'];

const SelectionModal = ({ visible, onClose, title, data, onSelect, current }) => {
  const { isDarkMode, colors } = useSettings();

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: isDarkMode ? '#1A1A1D' : '#FFFFFF' }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                {title}
              </Text>
              <Text style={[styles.modalSubtitle, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
                Choose your preferred option
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.modalCloseButton, {
              backgroundColor: isDarkMode ? '#27272A' : '#F4F4F5'
            }]}>
              <Icon name="close" size={20} color={isDarkMode ? '#A1A1AA' : '#71717A'} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={data}
            keyExtractor={(item) => item}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  { borderBottomColor: isDarkMode ? '#27272A' : '#E4E4E7' },
                  index === data.length - 1 && styles.modalItemLast,
                  current === item && { backgroundColor: isDarkMode ? '#8B5CF620' : '#8B5CF610' }
                ]}
                onPress={() => { onSelect(item); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalItemText, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                  {item}
                </Text>
                {current === item && (
                  <View style={styles.selectedBadge}>
                    <Icon name="check-circle" size={20} color="#8B5CF6" />
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

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
    t,
    colors,
    globalStyles,
  } = useSettings();

  const [animatedValue] = useState(new Animated.Value(0));
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [currModalVisible, setCurrModalVisible] = useState(false);
  const [backupModalVisible, setBackupModalVisible] = useState(false);
  const [backupStatus, setBackupStatus] = useState('idle'); // idle, loading, success, error
  const [backupMessage, setBackupMessage] = useState('');
  const [timeRemaining, setTimeRemaining] = useState('');

  const [apiModalVisible, setApiModalVisible] = useState(false);
  const [apiUrlInput, setApiUrlInput] = useState(API_BASE_URL);

  const [bankNotifAccess, setBankNotifAccess] = useState(false);

  const refreshBankNotifAccess = React.useCallback(() => {
    if (Platform.OS !== 'android') {
      setBankNotifAccess(false);
      return;
    }
    isNotificationAccessGranted()
      .then(setBankNotifAccess)
      .catch(() => setBankNotifAccess(false));
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      refreshBankNotifAccess();
      registerTokenIfAvailable();
    }, [refreshBankNotifAccess]),
  );

  const lastCheck = useSelector(state => state.API.lastSmsCheck);

  React.useEffect(() => {
    dispatch(fetchUserProfile());
    Animated.spring(animatedValue, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [dispatch]);

  React.useEffect(() => {
    if (!lastCheck) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const nextSync = lastCheck + (5 * 60 * 1000);
      const diff = nextSync - now;

      if (diff <= 0) {
        setTimeRemaining('Syncing now...');
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastCheck]);

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      // App.js useEffect will automatically redirect to Login
    } catch (e) {
      console.error('Logout failed:', e);
    }
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

  const userStats = [
    { label: t('transactions'), value: user?.stats?.transactions || '0', icon: 'swap-horizontal', color: '#8B5CF6' },
    { label: 'Categories', value: user?.stats?.categories || '0', icon: 'shape', color: '#10B981' },
    { label: 'Goals', value: user?.stats?.goals || '0', icon: 'target', color: '#F59E0B' },
  ];

  const quickActions = [
    { icon: 'plus-circle', label: 'Add Transaction', color: '#8B5CF6', screen: 'Transaction', params: { openAddModal: true } },
    { icon: 'target', label: 'New Goal', color: '#10B981', screen: 'Saving' },
    { icon: 'chart-bar', label: 'Analytics', color: '#3B82F6', screen: 'Transaction' },
    { icon: 'brain', label: 'Monthly AI Insights', color: '#F59E0B', screen: 'FinancialInsights' },
  ];

  const handleSaveApiUrl = async () => {
    if (!apiUrlInput.trim()) {
      ToastAndroid.show('Invalid URL', ToastAndroid.SHORT);
      return;
    }
    const cleanUrl = apiUrlInput.trim().replace(/\/$/, "");
    setApiUrl(cleanUrl);
    await AsyncStorage.setItem('custom_api_url', cleanUrl);
    setApiModalVisible(false);
    ToastAndroid.show('API URL Updated', ToastAndroid.SHORT);
  };

  const handleBackup = async () => {
    setBackupModalVisible(true);
    setBackupStatus('loading');
    setBackupMessage('Encrypting & Uploading...');
    try {
      const response = await dispatch(triggerManualBackup()).unwrap();
      const res = response.results;
      
      const successCount = (res?.google_drive ? 1 : 0) + (res?.postgresql ? 1 : 0) + (res?.local ? 1 : 0);
      
      if (successCount === 3) {
        setBackupStatus('success');
        setBackupMessage('Backup fully successful across all 3 destinations!');
      } else if (successCount > 0) {
        setBackupStatus('success');
        let msg = `Partial Backup (${successCount}/3):\n`;
        msg += `Drive: ${res?.google_drive ? '✅' : '❌'}\n`;
        msg += `Database: ${res?.postgresql ? '✅' : '❌'}\n`;
        msg += `Local: ${res?.local ? '✅' : '❌'}`;
        setBackupMessage(msg);
      } else {
        setBackupStatus('error');
        setBackupMessage('All backup destinations failed. Check server logs.');
      }
    } catch (e) {
      setBackupStatus('error');
      setBackupMessage(e.message || "Could not complete backup");
    }
  };

  const accountMenuItems = [
    { icon: 'account-edit', label: t('editProfile'), screen: 'EditProfile', color: '#8B5CF6' },
    { icon: 'wallet', label: t('paymentMethods'), screen: 'PaymentMethods', color: '#10B981' },
    { icon: 'bank', label: t('linkedAccounts'), screen: 'LinkedAccounts', color: '#3B82F6' },
    { icon: 'shape', label: 'Categories', screen: 'CategoryManagement', color: '#EC4899' },
    { icon: 'file-document', label: t('transactionHistory'), screen: 'FullHistory', color: '#F59E0B' },
    {
      icon: 'database-export',
      label: 'Backup & Recovery',
      screen: 'BackupManagement',
      color: '#22E6A8',
    },
    {
      icon: 'api',
      label: 'Live State APIs',
      screen: 'LiveApis',
      color: '#6366F1',
    },
  ];

  const preferencesMenuItems = [
    {
      icon: 'theme-light-dark',
      label: t('darkMode'),
      toggle: true,
      value: isDarkMode,
      setter: (val) => updateTheme(val ? 'dark' : 'light'),
      color: '#64748B',
    },
    {
      icon: 'translate',
      label: t('language'),
      subtitle: language,
      action: () => setLangModalVisible(true),
      color: '#8B5CF6',
    },
    {
      icon: 'currency-usd',
      label: t('currency'),
      subtitle: currency,
      action: () => setCurrModalVisible(true),
      color: '#10B981',
    },
    {
      icon: 'server-network',
      label: 'API Configuration',
      subtitle: 'Manage Server URL',
      action: () => {
        setApiUrlInput(API_BASE_URL);
        setApiModalVisible(true);
      },
      color: '#6366F1',
    },
  ];

  const supportMenuItems = [
    { icon: 'help-circle', label: t('helpCenter'), color: '#3B82F6' },
    { icon: 'information', label: t('about'), color: '#8B5CF6' },
    { icon: 'shield-check', label: t('privacyPolicy'), color: '#10B981' },
    { icon: 'file-document-outline', label: t('termsOfService'), color: '#F59E0B' },
  ];

  const renderMenuItem = (item, index, isLastItem) => {
    if (item.toggle) {
      return (
        <View
          key={index}
          style={[
            styles.menuItem,
            isLastItem && styles.menuItemLast,
            { backgroundColor: isDarkMode ? '#27272A' : '#FFFFFF' }
          ]}
        >
          <View style={[styles.menuIcon, { backgroundColor: (item.color || '#64748B') + '15' }]}>
            <Icon name={item.icon} size={20} color={item.color || '#64748B'} />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={[styles.menuLabel, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
              {item.label}
            </Text>
          </View>
          <Switch
            value={item.value}
            onValueChange={item.setter}
            trackColor={{ false: isDarkMode ? '#3F3F46' : '#E4E4E7', true: (item.color || '#8B5CF6') + '40' }}
            thumbColor={item.value ? (item.color || '#8B5CF6') : '#FFFFFF'}
            ios_backgroundColor={isDarkMode ? '#3F3F46' : '#E4E4E7'}
          />
        </View>
      );
    }

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.menuItem,
          isLastItem && styles.menuItemLast,
          { backgroundColor: isDarkMode ? '#27272A' : '#FFFFFF' }
        ]}
        onPress={() => item.action ? item.action() : (item.screen && navigation.navigate(item.screen))}
        activeOpacity={0.7}
      >
        <View style={[styles.menuIcon, { backgroundColor: (item.color || '#64748B') + '15' }]}>
          <Icon name={item.icon} size={20} color={item.color || '#64748B'} />
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={[styles.menuLabel, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
            {item.label}
          </Text>
          {item.subtitle && (
            <Text style={[styles.menuSubtitle, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
              {item.subtitle}
            </Text>
          )}
        </View>
        <Icon name="chevron-right" size={20} color={isDarkMode ? '#52525B' : '#A1A1AA'} />
      </TouchableOpacity>
    );
  };



  return (
    <SafeAreaView
      style={[styles.container, globalStyles.screen, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Header */}
        <View style={styles.heroSection}>
          <View style={styles.heroTop}>
            {navigation.canGoBack() ? (
              <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, {
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
              }]}>
                <Icon name="arrow-left" size={22} color={isDarkMode ? '#FFFFFF' : '#1A1A1D'} />
              </TouchableOpacity>
            ) : (
              <View style={styles.backButton} />
            )}

            <TouchableOpacity style={[styles.settingsButton, {
              backgroundColor: isDarkMode ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.1)'
            }]} onPress={() => navigation.navigate('EditProfile')}>
              <Icon name="cog" size={22} color="#8B5CF6" />
            </TouchableOpacity>
          </View>

          {/* Profile Card */}
          <Animated.View style={[
            styles.profileCard,
            {
              transform: [{
                scale: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                })
              }],
              opacity: animatedValue,
            }
          ]}>
            <View style={styles.profileImageWrapper}>
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                style={styles.profileImageBorder}
              >
                <Image
                  source={{
                    uri: user?.avatar_url
                      ? (user.avatar_url.startsWith('http') ? user.avatar_url : `${API_BASE_URL}${user.avatar_url}`)
                      : 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'
                  }}
                  style={styles.profileImage}
                />
              </LinearGradient>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => navigation.navigate('EditProfile')}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#7C3AED']}
                  style={styles.editButtonGradient}
                >
                  <Icon name="camera" size={16} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <Text style={[styles.profileName, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
              {user?.full_name || 'User'}
            </Text>
            <Text style={[styles.profileEmail, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
              {user?.email || 'user@example.com'}
            </Text>

            <View style={styles.verifiedBadge}>
              <Icon name="check-decagram" size={14} color="#10B981" />
              <Text style={styles.verifiedText}>Verified Account</Text>
            </View>
          </Animated.View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {userStats.map((stat, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.statCard,
                  {
                    backgroundColor: isDarkMode ? '#1A1A1D' : '#FFFFFF',
                    borderColor: isDarkMode ? '#27272A' : '#E4E4E7',
                    transform: [{
                      translateY: animatedValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      })
                    }],
                    opacity: animatedValue,
                  }
                ]}
              >
                <View style={[styles.statIcon, { backgroundColor: (stat.color || '#64748B') + '15' }]}>
                  <Icon name={stat.icon} size={22} color={stat.color || '#64748B'} />
                </View>
                <Text style={[styles.statValue, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                  {stat.value}
                </Text>
                <Text style={[styles.statLabel, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
                  {stat.label}
                </Text>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
            Quick Actions
          </Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.quickActionCard, {
                  backgroundColor: isDarkMode ? '#1A1A1D' : '#FFFFFF',
                  borderColor: isDarkMode ? '#27272A' : '#E4E4E7'
                }]}
                onPress={() => action.screen && navigation.navigate(action.screen, action.params)}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: (action.color || '#64748B') + '15' }]}>
                  <Icon name={action.icon} size={20} color={action.color || '#64748B'} />
                </View>
                <Text style={[styles.quickActionLabel, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Menu Sections */}
        <View style={styles.menuSections}>
          {/* Account */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={[styles.sectionIcon, { backgroundColor: isDarkMode ? '#8B5CF620' : '#8B5CF610' }]}>
                  <Icon name="account-circle" size={16} color="#8B5CF6" />
                </View>
                <Text style={[styles.sectionLabel, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                  Account
                </Text>
              </View>
            </View>
            <View style={styles.menuList}>
              {accountMenuItems.map((item, index) =>
                renderMenuItem(item, index, index === accountMenuItems.length - 1)
              )}
            </View>
          </View>

          {/* Preferences */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={[styles.sectionIcon, { backgroundColor: isDarkMode ? '#10B98120' : '#10B98110' }]}>
                  <Icon name="tune" size={16} color="#10B981" />
                </View>
                <Text style={[styles.sectionLabel, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                  Preferences
                </Text>
              </View>
            </View>
            <View style={styles.menuList}>
              {preferencesMenuItems.map((item, index) =>
                renderMenuItem(item, index, index === preferencesMenuItems.length - 1)
              )}
            </View>
          </View>

          {/* Support */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={[styles.sectionIcon, { backgroundColor: isDarkMode ? '#3B82F620' : '#3B82F610' }]}>
                  <Icon name="lifebuoy" size={16} color="#3B82F6" />
                </View>
                <Text style={[styles.sectionLabel, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                  Support
                </Text>
              </View>
            </View>
            <View style={styles.menuList}>
              {supportMenuItems.map((item, index) =>
                renderMenuItem(item, index, index === supportMenuItems.length - 1)
              )}
            </View>
          </View>

          {/* Logout */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              style={styles.logoutGradient}
            >
              <Icon name="logout" size={20} color="#FFFFFF" />
              <Text style={styles.logoutText}>Logout</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* App Info */}
          <View style={styles.appInfo}>
            <View style={[styles.versionBadge, {
              backgroundColor: isDarkMode ? '#27272A' : '#F4F4F5'
            }]}>
              <Icon name="information-outline" size={14} color={isDarkMode ? '#A1A1AA' : '#71717A'} />
              <Text style={[styles.versionText, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
                Version {APP_VERSION}
              </Text>
            </View>

            {lastCheck && (
              <View style={styles.syncInfo}>
                <View style={styles.syncRow}>
                  <Icon name="sync" size={12} color={isDarkMode ? '#A1A1AA' : '#71717A'} />
                  <Text style={[styles.syncText, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
                    Last sync: {new Date(lastCheck).toLocaleTimeString()}
                  </Text>
                </View>
                {timeRemaining && (
                  <View style={styles.nextSyncBadge}>
                    <Icon name="clock-outline" size={12} color="#8B5CF6" />
                    <Text style={styles.nextSyncText}>Next: {timeRemaining}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
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

      {/* Backup Status Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={backupModalVisible}
        onRequestClose={() => {
          if (backupStatus !== 'loading') setBackupModalVisible(false);
        }}
      >
        <View style={styles.centeredModalOverlay}>
          <View style={[styles.centeredModalContent, { backgroundColor: isDarkMode ? '#1A1A1D' : '#FFFFFF' }]}>
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              {backupStatus === 'loading' ? (
                <View style={{ marginBottom: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#8B5CF6" />
                  <Text style={[styles.modalTitle, { marginVertical: 16, color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                    Creating Backup...
                  </Text>
                </View>
              ) : backupStatus === 'success' ? (
                <View style={{ marginBottom: 20, alignItems: 'center' }}>
                  {/* Show warning icon for partial backup, full success for all 3 */}
                  <Icon
                    name={backupMessage.startsWith('Partial') ? 'alert-circle-outline' : 'cloud-check'}
                    size={56}
                    color={backupMessage.startsWith('Partial') ? '#F59E0B' : '#10B981'}
                  />
                  <Text style={[styles.modalTitle, { marginVertical: 16, color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                    {backupMessage.startsWith('Partial') ? 'Partial Backup' : 'Backup Complete'}
                  </Text>
                </View>
              ) : (
                <View style={{ marginBottom: 20, alignItems: 'center' }}>
                  <Icon name="alert-circle" size={56} color="#EF4444" />
                  <Text style={[styles.modalTitle, { marginVertical: 16, color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                    Backup Failed
                  </Text>
                </View>
              )}

              <Text style={[styles.modalSubtitle, { textAlign: 'center', color: isDarkMode ? '#A1A1AA' : '#71717A', marginBottom: 24, fontSize: 13 }]}>
                {backupMessage}
              </Text>

              {backupStatus !== 'loading' && (
                <TouchableOpacity
                  style={{
                    backgroundColor: backupStatus === 'success' ? '#10B981' : '#27272A',
                    paddingVertical: 12,
                    paddingHorizontal: 32,
                    borderRadius: 16,
                    width: '100%',
                    alignItems: 'center'
                  }}
                  onPress={() => setBackupModalVisible(false)}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* API Edit Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={apiModalVisible}
        onRequestClose={() => setApiModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setApiModalVisible(false)}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.modalContent, { backgroundColor: isDarkMode ? '#1A1A1D' : '#FFFFFF' }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                API Configuration
              </Text>
              <TouchableOpacity onPress={() => setApiModalVisible(false)}>
                <Icon name="close" size={24} color={isDarkMode ? '#A1A1AA' : '#71717A'} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 16 }}>
              <Text style={{
                color: isDarkMode ? '#A1A1AA' : '#71717A',
                marginBottom: 8,
                fontSize: 13
              }}>
                Enter new API Base URL (e.g. https://api.example.com)
              </Text>
              <TextInput
                value={apiUrlInput}
                onChangeText={setApiUrlInput}
                placeholder="https://..."
                placeholderTextColor={isDarkMode ? '#52525B' : '#A1A1AA'}
                style={{
                  backgroundColor: isDarkMode ? '#27272A' : '#F4F4F5',
                  color: isDarkMode ? '#FFFFFF' : '#1A1A1D',
                  padding: 12,
                  borderRadius: 12,
                  fontSize: 15,
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#3F3F46' : '#E4E4E7'
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: isDarkMode ? '#27272A' : '#F4F4F5',
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center'
                }}
                onPress={() => setApiUrlInput(API_BASE_URL)} // Reset to current
              >
                <Text style={{ color: isDarkMode ? '#FFFFFF' : '#1A1A1D', fontWeight: '600' }}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#8B5CF6',
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center'
                }}
                onPress={handleSaveApiUrl}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 28,
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight + 16,
    paddingBottom: 24,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profileImageWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImageBorder: {
    padding: 3,
    borderRadius: 60,
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: 18,
    overflow: 'hidden',
  },
  editButtonGradient: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderRadius: 18,
  },
  profileName: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16,185,129,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.3,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: (width - 52) / 2,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  menuSections: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  menuList: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    letterSpacing: -0.1,
  },
  menuSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  logoutButton: {
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  appInfo: {
    alignItems: 'center',
    gap: 12,
  },
  versionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  syncInfo: {
    alignItems: 'center',
    gap: 6,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncText: {
    fontSize: 11,
    fontWeight: '500',
  },
  nextSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(139,92,246,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  nextSyncText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  centeredModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  centeredModalContent: {
    width: '100%',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  modalItemLast: {
    borderBottomWidth: 0,
  },
  modalItemText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  selectedBadge: {
    marginLeft: 'auto',
  },
});

export default ProfileScreen;