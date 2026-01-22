import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { API_BASE_URL } from '../API_URL';

const FinancialInsightsScreen = ({ navigation }) => {
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchInsights = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_BASE_URL}/api/insights`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (response.ok) {
                setInsights(data);
            } else {
                console.error("Failed to fetch insights:", data);
            }
        } catch (error) {
            console.error("Error fetching insights:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchInsights();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchInsights();
    };

    const getTagColor = (tag) => {
        if (tag.includes('high_savings')) return '#10B981'; // Green
        if (tag.includes('deficit')) return '#EF4444'; // Red
        return '#3B82F6'; // Blue default
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    const generateSummary = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_BASE_URL}/api/insights/generate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });
            const data = await response.json();
            if (response.ok) {
                fetchInsights();
            } else {
                alert("Failed: " + (data.error || "Unknown error"));
                setLoading(false);
            }
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Financial Memories</Text>
                </View>
                <TouchableOpacity onPress={generateSummary} style={styles.generateButton}>
                    <Ionicons name="flash" size={20} color="#F59E0B" />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />}
            >
                {insights.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="document-text-outline" size={48} color="#64748B" />
                        <Text style={styles.emptyText}>No financial insights yet.</Text>
                        <Text style={styles.emptySubText}>Insights are generated at the end of each month.</Text>
                    </View>
                ) : (
                    insights.map((insight) => (
                        <View key={insight.id} style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.monthText}>
                                    {insight.month}
                                </Text>
                                <View style={styles.tagsContainer}>
                                    {insight.tags && insight.tags.split(',').map((tag, index) => (
                                        <View key={index} style={[styles.tag, { backgroundColor: getTagColor(tag) + '20' }]}>
                                            <Text style={[styles.tagText, { color: getTagColor(tag) }]}>
                                                {tag.replace('_', ' ')}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>

                            <Text style={styles.contentText}>
                                {insight.content}
                            </Text>

                            {insight.metrics && insight.metrics.top_categories && (
                                <View style={styles.metricsContainer}>
                                    <Text style={styles.metricsLabel}>Top Spending:</Text>
                                    <View style={styles.categoriesRow}>
                                        {insight.metrics.top_categories.map((cat, idx) => (
                                            <Text key={idx} style={styles.categoryItem}>
                                                • {cat[0]} ({Number(cat[1]).toLocaleString()})
                                            </Text>
                                        ))}
                                    </View>
                                </View>
                            )}
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0F172A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#1E293B',
    },
    backButton: {
        marginRight: 15,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
    },
    generateButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 20,
    },
    card: {
        backgroundColor: '#1E293B',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    monthText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#E2E8F0',
    },
    tagsContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    tag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    tagText: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    contentText: {
        color: '#94A3B8',
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 16,
    },
    metricsContainer: {
        backgroundColor: '#0F172A',
        padding: 12,
        borderRadius: 12,
    },
    metricsLabel: {
        color: '#64748B',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    categoriesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    categoryItem: {
        color: '#CBD5E1',
        fontSize: 13,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
    },
    emptyText: {
        color: '#E2E8F0',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 16,
    },
    emptySubText: {
        color: '#64748B',
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    }
});

export default FinancialInsightsScreen;
