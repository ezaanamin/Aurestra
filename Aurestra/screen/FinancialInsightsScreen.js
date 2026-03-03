import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Platform, Animated,
    StatusBar, LayoutAnimation, UIManager
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { API_BASE_URL } from '../API_URL';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const METHOD_COLORS = {
    GET: { bg: '#10B98115', border: '#10B981', text: '#10B981' },
    POST: { bg: '#3B82F615', border: '#3B82F6', text: '#3B82F6' },
    PUT: { bg: '#F59E0B15', border: '#F59E0B', text: '#F59E0B' },
    DELETE: { bg: '#EF444415', border: '#EF4444', text: '#EF4444' },
    PATCH: { bg: '#8B5CF615', border: '#8B5CF6', text: '#8B5CF6' },
};

// Map endpoint segments to icons
const getEndpointIcon = (endpoint) => {
    if (endpoint.includes('overview')) return { name: 'stats-chart', color: '#6366F1' };
    if (endpoint.includes('cashflow')) return { name: 'swap-horizontal', color: '#10B981' };
    if (endpoint.includes('budget')) return { name: 'wallet', color: '#F59E0B' };
    if (endpoint.includes('savings')) return { name: 'flag', color: '#EC4899' };
    if (endpoint.includes('categories')) return { name: 'grid', color: '#8B5CF6' };
    if (endpoint.includes('recurring')) return { name: 'repeat', color: '#06B6D4' };
    if (endpoint.includes('net-worth')) return { name: 'diamond', color: '#F97316' };
    if (endpoint.includes('anomalies')) return { name: 'warning', color: '#EF4444' };
    if (endpoint.includes('projections')) return { name: 'trending-up', color: '#10B981' };
    if (endpoint.includes('transactions')) return { name: 'list', color: '#94A3B8' };
    if (endpoint.includes('investments')) return { name: 'bar-chart', color: '#F59E0B' };
    if (endpoint.includes('statements')) return { name: 'document-text', color: '#6366F1' };
    if (endpoint.includes('mom')) return { name: 'analytics', color: '#3B82F6' };
    if (endpoint.includes('dashboard')) return { name: 'apps', color: '#10B981' };
    if (endpoint.includes('token')) return { name: 'key', color: '#64748B' };
    return { name: 'code-slash', color: '#64748B' };
};

// Format description — only take first line/sentence
const shortDesc = (desc) => {
    if (!desc) return '';
    const firstLine = desc.split('\n')[0].trim();
    return firstLine.length > 120 ? firstLine.substring(0, 117) + '...' : firstLine;
};

// ApiCard component with expand/collapse
const ApiCard = ({ api, index }) => {
    const [expanded, setExpanded] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 350,
                delay: index * 60,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 350,
                delay: index * 60,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const toggle = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(e => !e);
    };

    const icon = getEndpointIcon(api.endpoint);
    const methods = api.methods || [];
    const hasSample = api.sample_response && typeof api.sample_response === 'object';
    const sampleStr = hasSample ? JSON.stringify(api.sample_response, null, 2) : null;

    return (
        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY }] }]}>
            <TouchableOpacity onPress={toggle} activeOpacity={0.8}>
                <View style={styles.cardTop}>
                    {/* Icon */}
                    <View style={[styles.iconWrap, { backgroundColor: icon.color + '20' }]}>
                        <Ionicons name={icon.name} size={20} color={icon.color} />
                    </View>

                    {/* Endpoint + methods */}
                    <View style={styles.cardMeta}>
                        <Text style={styles.endpointText} numberOfLines={1}>{api.endpoint}</Text>
                        <View style={styles.methodsRow}>
                            {methods.map((m, i) => {
                                const mc = METHOD_COLORS[m] || METHOD_COLORS.GET;
                                return (
                                    <View key={i} style={[styles.methodBadge, { backgroundColor: mc.bg, borderColor: mc.border }]}>
                                        <Text style={[styles.methodText, { color: mc.text }]}>{m}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    {/* Expand chevron */}
                    <Ionicons
                        name={expanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color="#475569"
                    />
                </View>

                {/* Short description always visible */}
                <Text style={styles.descText}>{shortDesc(api.description)}</Text>
            </TouchableOpacity>

            {/* Expanded content */}
            {expanded && (
                <View style={styles.expandedSection}>
                    {/* Full description */}
                    <View style={styles.divider} />
                    <Text style={styles.sectionLabel}>📋 Full Description</Text>
                    <Text style={styles.fullDescText}>{(api.description || '').trim()}</Text>

                    {/* Live data response */}
                    {sampleStr && (
                        <>
                            <View style={styles.divider} />
                            <View style={styles.sampleHeader}>
                                <Ionicons name="flash" size={14} color="#10B981" />
                                <Text style={styles.sectionLabel}> Live Sample Response</Text>
                            </View>
                            <View style={styles.codeBlock}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <Text style={styles.codeText}>{sampleStr}</Text>
                                </ScrollView>
                            </View>
                        </>
                    )}
                </View>
            )}
        </Animated.View>
    );
};


const FinancialInsightsScreen = ({ navigation }) => {
    const [apis, setApis] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const headerAnim = useRef(new Animated.Value(0)).current;

    const fetchApis = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_BASE_URL}/api/insights`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                // Sort: exclude generate-token first, then alphabetically
                const sorted = [...data].sort((a, b) => {
                    if (a.endpoint.includes('generate-token')) return 1;
                    if (b.endpoint.includes('generate-token')) return -1;
                    return a.endpoint.localeCompare(b.endpoint);
                });
                setApis(sorted);
            }
        } catch (err) {
            console.error('Error fetching agent APIs:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchApis();
        Animated.timing(headerAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchApis();
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <StatusBar barStyle="light-content" backgroundColor="#0A0F1E" />
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={styles.loadingText}>Loading Agent APIs…</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0A0F1E" />

            {/* Header */}
            <Animated.View style={[styles.header, { opacity: headerAnim }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#E2E8F0" />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <View style={styles.agentBadge}>
                        <Ionicons name="hardware-chip-outline" size={14} color="#6366F1" />
                        <Text style={styles.agentBadgeText}>AI AGENT</Text>
                    </View>
                    <Text style={styles.headerTitle}>Exposed APIs</Text>
                    <Text style={styles.headerSubtitle}>{apis.length} endpoints available</Text>
                </View>

                <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
                    <Ionicons name="reload-outline" size={20} color="#6366F1" />
                </TouchableOpacity>
            </Animated.View>

            {/* Stats bar */}
            <View style={styles.statsBar}>
                {[
                    { label: 'Total', value: apis.length, color: '#6366F1' },
                    { label: 'GET', value: apis.filter(a => a.methods?.includes('GET')).length, color: '#10B981' },
                    { label: 'POST', value: apis.filter(a => a.methods?.includes('POST')).length, color: '#3B82F6' },
                ].map((s, i) => (
                    <View key={i} style={styles.statItem}>
                        <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                        <Text style={styles.statLabel}>{s.label}</Text>
                    </View>
                ))}
            </View>

            {/* API Cards */}
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" colors={['#6366F1']} />}
            >
                <Text style={styles.sectionHeader}>Tap any card to expand live data</Text>
                {apis.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="server-outline" size={56} color="#334155" />
                        <Text style={styles.emptyText}>No APIs found</Text>
                        <Text style={styles.emptySubText}>Ensure the backend is running and pull down to refresh.</Text>
                    </View>
                ) : (
                    apis.map((api, index) => (
                        <ApiCard key={api.endpoint} api={api} index={index} />
                    ))
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0F1E',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0A0F1E',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    loadingText: {
        color: '#64748B',
        fontSize: 14,
        marginTop: 12,
    },

    /* ── Header ── */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 28) + 10,
        paddingBottom: 16,
        paddingHorizontal: 20,
        backgroundColor: '#0D1525',
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B',
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#1E293B',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    agentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#6366F115',
        borderWidth: 1,
        borderColor: '#6366F130',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 20,
        marginBottom: 4,
    },
    agentBadgeText: {
        color: '#6366F1',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#F1F5F9',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#475569',
        marginTop: 2,
    },
    refreshBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#6366F115',
        justifyContent: 'center',
        alignItems: 'center',
    },

    /* ── Stats bar ── */
    statsBar: {
        flexDirection: 'row',
        backgroundColor: '#0D1525',
        paddingHorizontal: 20,
        paddingBottom: 14,
        gap: 24,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 11,
        color: '#475569',
        marginTop: 2,
    },

    /* ── List ── */
    scrollContent: {
        padding: 16,
    },
    sectionHeader: {
        color: '#334155',
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 14,
        letterSpacing: 0.5,
    },

    /* ── Card ── */
    card: {
        backgroundColor: '#0D1525',
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#1E293B',
        overflow: 'hidden',
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        gap: 12,
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardMeta: {
        flex: 1,
    },
    endpointText: {
        color: '#CBD5E1',
        fontSize: 13,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontWeight: '600',
        marginBottom: 6,
    },
    methodsRow: {
        flexDirection: 'row',
        gap: 6,
        flexWrap: 'wrap',
    },
    methodBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
    },
    methodText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    descText: {
        color: '#475569',
        fontSize: 12,
        lineHeight: 18,
        paddingHorizontal: 14,
        paddingBottom: 14,
    },

    /* ── Expanded ── */
    expandedSection: {
        paddingHorizontal: 14,
        paddingBottom: 16,
    },
    divider: {
        height: 1,
        backgroundColor: '#1E293B',
        marginVertical: 12,
    },
    sampleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    sectionLabel: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    fullDescText: {
        color: '#64748B',
        fontSize: 13,
        lineHeight: 20,
    },
    codeBlock: {
        backgroundColor: '#060C18',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: '#1E293B',
    },
    codeText: {
        color: '#10B981',
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
        fontSize: 11,
        lineHeight: 18,
    },

    /* ── Empty ── */
    emptyState: {
        alignItems: 'center',
        paddingTop: 80,
        gap: 12,
    },
    emptyText: {
        color: '#E2E8F0',
        fontSize: 18,
        fontWeight: '700',
    },
    emptySubText: {
        color: '#475569',
        fontSize: 13,
        textAlign: 'center',
        paddingHorizontal: 40,
        lineHeight: 20,
    },
});

export default FinancialInsightsScreen;
