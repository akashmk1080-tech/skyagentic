import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SkyLogo } from './SkyLogo';
import { COLORS } from '../constants/theme';
import { SupabaseService, SyncStatus } from '../services/supabase';
import { StorageService } from '../services/storage';

interface SkylineHeaderProps {
  onOpenKnowledgeHub: () => void;
  onOpenSupabaseConfig: () => void;
}

export const SkylineHeader: React.FC<SkylineHeaderProps> = ({
  onOpenKnowledgeHub,
  onOpenSupabaseConfig,
}) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [knowledgeCount, setKnowledgeCount] = useState<number>(0);

  useEffect(() => {
    // Subscribe to Supabase sync changes
    const unsub = SupabaseService.subscribeStatus(setSyncStatus);

    // Initial fetch of knowledge count
    const loadCount = async () => {
      const items = await StorageService.getKnowledge();
      setKnowledgeCount(items.length);
    };
    loadCount();

    // Poll periodically for file count updates
    const interval = setInterval(loadCount, 2500);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  const getStatusDisplay = () => {
    switch (syncStatus) {
      case 'active':
        return {
          text: 'Supabase Active',
          color: COLORS.success,
          dotColor: '#10B981',
          icon: 'cloud-done-outline' as const,
        };
      case 'syncing':
        return {
          text: 'Syncing...',
          color: COLORS.warning,
          dotColor: '#F59E0B',
          icon: 'sync-outline' as const,
        };
      case 'error':
        return {
          text: 'Sync Error',
          color: COLORS.urgent,
          dotColor: '#EF4444',
          icon: 'cloud-offline-outline' as const,
        };
      case 'offline':
      default:
        return {
          text: 'Local / Tap to Connect',
          color: COLORS.textMuted,
          dotColor: '#64748B',
          icon: 'cloud-offline-outline' as const,
        };
    }
  };

  const statusInfo = getStatusDisplay();

  return (
    <View style={styles.headerContainer}>
      {/* Top row with Logo and Brand */}
      <View style={styles.contentRow}>
        {/* Brand with Logo */}
        <View style={styles.leftBrand}>
          <SkyLogo size={38} showBadge={true} />
          <View style={styles.brandTextGroup}>
            <Text style={styles.brandTitle}>SKY</Text>
            <Text style={styles.brandSubtitle}>AGENTIC ASSISTANT</Text>
          </View>
        </View>

        {/* Real-time Supabase Cloud Status Indicator */}
        <TouchableOpacity
          style={styles.syncStatusButton}
          onPress={onOpenSupabaseConfig}
          activeOpacity={0.7}
        >
          <View style={[styles.statusDot, { backgroundColor: statusInfo.dotColor }]} />
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.text}
          </Text>
          <Ionicons name={statusInfo.icon} size={14} color={statusInfo.color} style={styles.statusIcon} />
        </TouchableOpacity>

        {/* Top-Right Person Icon with Dynamic Knowledge Count Badge */}
        <TouchableOpacity
          style={styles.personIconButton}
          onPress={onOpenKnowledgeHub}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#1E293B', '#0F172A']}
            style={styles.personIconGradient}
          >
            <Ionicons name="person" size={20} color={COLORS.cyan} />
            {knowledgeCount > 0 && (
              <View style={styles.dynamicBadge}>
                <Text style={styles.badgeText}>
                  {knowledgeCount > 99 ? '99+' : knowledgeCount}
                </Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30, 41, 59, 0.65)',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  leftBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTextGroup: {
    marginLeft: 8,
  },
  brandTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    color: COLORS.cyan,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  syncStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusIcon: {
    marginLeft: 4,
  },
  personIconButton: {
    position: 'relative',
  },
  personIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },
  dynamicBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.cyan,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },
  badgeText: {
    color: '#070A12',
    fontSize: 9,
    fontWeight: '900',
  },
});

