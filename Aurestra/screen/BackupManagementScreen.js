import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, StatusBar,
  TouchableOpacity, ScrollView, RefreshControl, Alert, ActivityIndicator,
  Modal, TextInput,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import CustomAlert from '../components/CustomAlert';
import { createBackup, listBackups, deleteBackup, restoreBackup } from '../API/slice/API';

const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};
const formatTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const BackupManagementScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null); // which backup is mid-action
  const [alert, setAlert] = useState({ visible: false, type: 'error', title: '', message: '' });

  // Restore Modal State
  const [restoreBackupItem, setRestoreBackupItem] = useState(null);
  const [decKey, setDecKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const showAlert = (type, title, message) => setAlert({ visible: true, type, title, message });
  const hideAlert = () => setAlert(prev => ({ ...prev, visible: false }));

  const loadBackups = useCallback(async () => {
    try {
      const res = await dispatch(listBackups()).unwrap();
      setBackups(res.backups || []);
    } catch (e) {
      showAlert('error', 'Load Failed', String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dispatch]);

  useEffect(() => { loadBackups(); }, [loadBackups]);

  const handleCreate = async () => {
    setActionId('create');
    try {
      const res = await dispatch(createBackup()).unwrap();
      showAlert('success', 'Backup Created', `${res.backup.filename}\n${res.backup.size_mb} MB`);
      loadBackups();
    } catch (e) {
      showAlert('error', 'Backup Failed', String(e));
    } finally {
      setActionId(null);
    }
  };

  const handleRestoreClick = (backup) => {
    setRestoreBackupItem(backup);
    setDecKey('');
    setShowKey(false);
  };

  const executeRestore = async () => {
    if (!restoreBackupItem) return;
    const backupId = restoreBackupItem.id;
    setActionId('restore');
    try {
      const res = await dispatch(restoreBackup({ backupId, decryptionKey: decKey })).unwrap();
      setRestoreBackupItem(null);
      setDecKey('');
      
      const counts = Object.entries(res.result.counts)
        .map(([k, v]) => `${k.replace('_', ' ')}: ${v}`)
        .join('\n');
      
      showAlert('success', 'Restore Complete', `Restored rows successfully:\n\n${counts}`);
      loadBackups();
    } catch (e) {
      showAlert('error', 'Restore Failed', String(e));
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = (backup) => {
    Alert.alert(
      'Delete Backup',
      `Delete backup from ${formatDate(backup.created_at)}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionId(backup.id);
            try {
              await dispatch(deleteBackup({ backupId: backup.id })).unwrap();
              showAlert('success', 'Deleted', 'Backup deleted successfully.');
              loadBackups();
            } catch (e) {
              showAlert('error', 'Delete Failed', String(e));
            } finally {
              setActionId(null);
            }
          }
        }
      ]
    );
  };

  const totalSize = backups.reduce((sum, b) => sum + (b.size_bytes || 0), 0);
  const totalMB = (totalSize / 1024 / 1024).toFixed(2);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={22} color="#22E6A8" />
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitle}>Backup & Recovery</Text>
          <Text style={styles.headerSub}>{backups.length} backups · {totalMB} MB used</Text>
        </View>
        <TouchableOpacity
          onPress={handleCreate}
          style={styles.createBtn}
          disabled={actionId === 'create'}
        >
          {actionId === 'create'
            ? <ActivityIndicator size="small" color="#064E3B" />
            : <Icon name="plus" size={20} color="#064E3B" />}
        </TouchableOpacity>
      </LinearGradient>

      {/* Encryption badge */}
      <View style={styles.encBadge}>
        <Icon name="shield-lock" size={14} color="#22E6A8" />
        <Text style={styles.encText}>All backups encrypted with AES-256-GCM · Your key only</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadBackups(); }} tintColor="#22E6A8" />}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#22E6A8" />
            <Text style={styles.loadingText}>Loading backups…</Text>
          </View>
        ) : backups.length === 0 ? (
          <View style={styles.centered}>
            <Icon name="database-off-outline" size={56} color="#334155" />
            <Text style={styles.emptyTitle}>No Backups Yet</Text>
            <Text style={styles.emptySubtitle}>Tap + to create your first encrypted backup.</Text>
          </View>
        ) : (
          backups.map((b, idx) => (
            <BackupCard
              key={b.id}
              backup={b}
              isLatest={idx === 0}
              isLoading={actionId === b.id}
              onRestore={() => handleRestoreClick(b)}
              onDelete={() => handleDelete(b)}
            />
          ))
        )}
      </ScrollView>

      {/* Decrypt & Restore Modal */}
      <Modal
        visible={!!restoreBackupItem}
        transparent
        animationType="fade"
        onRequestClose={() => { if (actionId !== 'restore') setRestoreBackupItem(null); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconRing}>
                <Icon name="shield-lock-open-outline" size={26} color="#22E6A8" />
              </View>
              <Text style={styles.modalTitle}>Decrypt & Restore</Text>
            </View>

            <Text style={styles.modalDesc}>
              Enter your vault decryption key to restore backup from{' '}
              <Text style={styles.modalHighlight}>
                {formatDate(restoreBackupItem?.created_at)} {formatTime(restoreBackupItem?.created_at)}
              </Text>.
            </Text>

            <View style={styles.inputContainer}>
              <Icon name="key-outline" size={20} color="#475569" style={styles.inputIcon} />
              <TextInput
                style={styles.keyInput}
                placeholder="Enter decryption key"
                placeholderTextColor="#475569"
                secureTextEntry={!showKey}
                value={decKey}
                onChangeText={setDecKey}
                autoCapitalize="none"
                autoCorrect={false}
                editable={actionId !== 'restore'}
              />
              <TouchableOpacity
                onPress={() => setShowKey(!showKey)}
                style={styles.eyeBtn}
                disabled={actionId === 'restore'}
              >
                <Icon name={showKey ? 'eye-off' : 'eye'} size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, actionId === 'restore' && styles.disabledBtn]}
                onPress={() => { setRestoreBackupItem(null); setDecKey(''); }}
                disabled={actionId === 'restore'}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalRestoreBtn, (!decKey || actionId === 'restore') && styles.disabledBtn]}
                onPress={executeRestore}
                disabled={!decKey || actionId === 'restore'}
              >
                {actionId === 'restore' ? (
                  <ActivityIndicator size="small" color="#020617" />
                ) : (
                  <>
                    <Icon name="cloud-download-outline" size={16} color="#020617" style={{ marginRight: 6 }} />
                    <Text style={styles.modalRestoreText}>Restore</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CustomAlert {...alert} onClose={hideAlert} />
    </SafeAreaView>
  );
};

const BackupCard = ({ backup, isLatest, isLoading, onRestore, onDelete }) => (
  <View style={[styles.card, isLatest && styles.cardLatest]}>
    <View style={styles.cardHeader}>
      <View style={styles.cardDateBlock}>
        <Text style={styles.cardDate}>{formatDate(backup.created_at)}</Text>
        <Text style={styles.cardTime}>{formatTime(backup.created_at)}</Text>
      </View>
      {isLatest && (
        <View style={styles.latestBadge}>
          <Text style={styles.latestBadgeText}>LATEST</Text>
        </View>
      )}
    </View>

    <View style={styles.cardMeta}>
      <MetaPill icon="database" label={`${backup.size_mb} MB`} />
      <MetaPill icon="cog-outline" label={`v${backup.app_version}`} />
      <MetaPill icon="shield-check" label={backup.enc_version} />
      <MetaPill
        icon={backup.status === 'completed' ? 'check-circle-outline' : 'alert-circle-outline'}
        label={backup.status}
        color={backup.status === 'completed' ? '#22E6A8' : '#EF4444'}
      />
    </View>

    {backup.table_counts && Object.keys(backup.table_counts).length > 0 && (
      <View style={styles.countsRow}>
        {Object.entries(backup.table_counts).map(([k, v]) => (
          <Text key={k} style={styles.countChip}>{k.replace('_', ' ')}: {v}</Text>
        ))}
      </View>
    )}

    <View style={styles.cardActions}>
      {isLoading ? (
        <ActivityIndicator size="small" color="#22E6A8" style={{ marginLeft: 'auto' }} />
      ) : (
        <>
          <TouchableOpacity style={styles.restoreBtn} onPress={onRestore}>
            <Icon name="restore" size={16} color="#22E6A8" />
            <Text style={styles.restoreBtnText}>Restore</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
            <Icon name="trash-can-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        </>
      )}
    </View>
  </View>
);

const MetaPill = ({ icon, label, color = '#64748B' }) => (
  <View style={styles.pill}>
    <Icon name={icon} size={12} color={color} />
    <Text style={[styles.pillText, { color }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: '#020617' },
  header:         { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(34,230,168,0.1)' },
  backBtn:        { padding: 8, marginRight: 8 },
  headerTitleBlock: { flex: 1 },
  headerTitle:    { fontSize: 18, fontWeight: '700', color: '#F0F6FF' },
  headerSub:      { fontSize: 12, color: '#64748B', marginTop: 2 },
  createBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: '#22E6A8', justifyContent: 'center', alignItems: 'center' },
  encBadge:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: 'rgba(34,230,168,0.05)', borderBottomWidth: 1, borderBottomColor: 'rgba(34,230,168,0.08)' },
  encText:        { fontSize: 11, color: '#22E6A8', flex: 1 },
  scroll:         { flex: 1 },
  scrollContent:  { padding: 16, paddingBottom: 40 },
  centered:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  loadingText:    { color: '#64748B', marginTop: 12, fontSize: 14 },
  emptyTitle:     { color: '#94A3B8', fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtitle:  { color: '#64748B', fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 32 },
  card:           { backgroundColor: '#0F172A', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 16, marginBottom: 12 },
  cardLatest:     { borderColor: 'rgba(34,230,168,0.25)' },
  cardHeader:     { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardDateBlock:  { flex: 1 },
  cardDate:       { color: '#F0F6FF', fontSize: 15, fontWeight: '600' },
  cardTime:       { color: '#64748B', fontSize: 12, marginTop: 2 },
  latestBadge:    { backgroundColor: 'rgba(34,230,168,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(34,230,168,0.3)' },
  latestBadgeText:{ color: '#22E6A8', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  cardMeta:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  pill:           { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  pillText:       { fontSize: 11, fontWeight: '500' },
  countsRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  countChip:      { fontSize: 10, color: '#475569', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  cardActions:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  restoreBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(34,230,168,0.3)', borderRadius: 10, paddingVertical: 8 },
  restoreBtnText: { color: '#22E6A8', fontSize: 13, fontWeight: '600' },
  deleteBtn:      { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  
  // Modal Styles
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent:   { backgroundColor: '#0F172A', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 24, width: '100%', maxWidth: 360 },
  modalHeader:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  modalIconRing:  { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(34,230,168,0.1)', justifyContent: 'center', alignItems: 'center' },
  modalTitle:     { fontSize: 18, fontWeight: '700', color: '#F0F6FF' },
  modalDesc:      { fontSize: 14, color: '#94A3B8', lineHeight: 20, marginBottom: 20 },
  modalHighlight: { color: '#22E6A8', fontWeight: '600' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#020617', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 12, height: 48, marginBottom: 24 },
  inputIcon:      { marginRight: 8 },
  keyInput:       { flex: 1, color: '#F0F6FF', fontSize: 14, padding: 0 },
  eyeBtn:         { padding: 6 },
  modalActions:   { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  modalCancelText:{ color: '#94A3B8', fontSize: 14, fontWeight: '600' },
  modalRestoreBtn:{ flex: 1, height: 44, borderRadius: 12, backgroundColor: '#22E6A8', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  modalRestoreText:{ color: '#020617', fontSize: 14, fontWeight: '600' },
  disabledBtn:    { opacity: 0.5 },
});

export default BackupManagementScreen;
