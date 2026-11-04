import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { COLORS, GRADIENTS } from '../../constants/theme';
import { ReplyRecord, SentimentType } from '../../types';
import { StorageService } from '../../services/storage';
import { SupabaseService } from '../../services/supabase';

export default function RepliesScreen() {
  const [replies, setReplies] = useState<ReplyRecord[]>([]);
  const [channelFilter, setChannelFilter] = useState<'All' | 'Call' | 'WhatsApp'>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Manual Log Modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualChannel, setManualChannel] = useState<'Call' | 'WhatsApp'>('Call');
  const [manualSentiment, setManualSentiment] = useState<SentimentType>('Positive');
  const [manualSummary, setManualSummary] = useState('');
  const [manualTranscript, setManualTranscript] = useState('');

  useEffect(() => {
    loadReplies();
    const interval = setInterval(loadReplies, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadReplies = async () => {
    const list = await StorageService.getReplies();
    setReplies(list);
  };

  const handleCopyTranscript = async (record: ReplyRecord) => {
    const textToCopy = `[Sky AI Record: ${record.channel} with ${record.contactName}]\nTime: ${record.timestamp}\nSentiment: ${record.sentiment}\nSummary: ${record.summary}\n\nTranscript:\n${record.transcript}`;
    await Clipboard.setStringAsync(textToCopy);
    setCopiedId(record.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteRecord = async (id: string) => {
    Alert.alert('Delete Record', 'Are you sure you want to delete this archived transcript?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = await StorageService.deleteReplyRecord(id);
          setReplies(updated);
        },
      },
    ]);
  };

  const handleSaveManualLog = async () => {
    if (!manualName.trim() || !manualSummary.trim()) {
      Alert.alert('Required Fields', 'Please enter at least the contact name and action summary.');
      return;
    }

    const newRecord: ReplyRecord = {
      id: `manual_${Date.now()}`,
      contactName: manualName.trim(),
      contactPhone: manualPhone.trim() || 'Manual Entry',
      channel: manualChannel,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sentiment: manualSentiment,
      durationSeconds: manualChannel === 'Call' ? 60 : undefined,
      summary: manualSummary.trim(),
      transcript: manualTranscript.trim() || `[Manual Log for ${manualName}]: ${manualSummary}`,
      actionTaken: 'Manually logged by user',
      createdAt: new Date().toISOString(),
    };

    const updated = await StorageService.addReplyRecord(newRecord);
    setReplies(updated);
    await SupabaseService.syncReplyRecord(newRecord);

    setManualName('');
    setManualPhone('');
    setManualSummary('');
    setManualTranscript('');
    setShowManualModal(false);
  };

  const filteredReplies = replies.filter(r => {
    if (channelFilter === 'Call') return r.channel === 'Call';
    if (channelFilter === 'WhatsApp') return r.channel === 'WhatsApp';
    return true;
  });

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Top Banner */}
      <View style={styles.topBanner}>
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>Replies & Call Records Archive</Text>
          <Text style={styles.bannerSubtitle}>
            {replies.length} transcripts synchronized with Supabase
          </Text>
        </View>

        <TouchableOpacity
          style={styles.manualLogBtn}
          onPress={() => setShowManualModal(true)}
        >
          <LinearGradient colors={GRADIENTS.floatingButton} style={styles.manualBtnGradient}>
            <Ionicons name="create-outline" size={16} color="#070A12" />
            <Text style={styles.manualBtnText}>Manual Log</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['All', 'Call', 'WhatsApp'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, channelFilter === f && styles.filterChipActive]}
            onPress={() => setChannelFilter(f)}
          >
            <Ionicons
              name={
                f === 'Call'
                  ? 'call'
                  : f === 'WhatsApp'
                  ? 'logo-whatsapp'
                  : 'albums'
              }
              size={13}
              color={channelFilter === f ? COLORS.cyan : COLORS.textMuted}
            />
            <Text
              style={[
                styles.filterText,
                channelFilter === f && styles.filterTextActive,
              ]}
            >
              {f === 'Call' ? 'AI Voice Calls' : f === 'WhatsApp' ? 'WhatsApp Transcripts' : 'All Channels'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Archive Records List */}
      <ScrollView style={styles.listArea} contentContainerStyle={{ paddingBottom: 110 }}>
        {filteredReplies.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="file-tray-outline" size={50} color={COLORS.textDisabled} />
            <Text style={styles.emptyTitle}>Archive Clean & Ready</Text>
            <Text style={styles.emptyDesc}>
              No incoming call or WhatsApp records yet. Launch an autonomous AI call from the Automated screen or log a response manually.
            </Text>
          </View>
        ) : (
          filteredReplies.map((record) => {
            const isExpanded = expandedId === record.id;
            const isCopied = copiedId === record.id;

            return (
              <View key={record.id} style={styles.recordCard}>
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    <View
                      style={[
                        styles.channelIconCircle,
                        record.channel === 'WhatsApp' && { backgroundColor: 'rgba(37, 211, 102, 0.15)' },
                      ]}
                    >
                      <Ionicons
                        name={record.channel === 'Call' ? 'call' : 'logo-whatsapp'}
                        size={16}
                        color={record.channel === 'WhatsApp' ? '#25D366' : COLORS.cyan}
                      />
                    </View>
                    <View>
                      <Text style={styles.contactName}>{record.contactName}</Text>
                      <Text style={styles.contactPhone}>{record.contactPhone}</Text>
                    </View>
                  </View>

                  <View style={styles.headerRight}>
                    {/* Sentiment Tag */}
                    <View
                      style={[
                        styles.sentimentBadge,
                        record.sentiment === 'Positive'
                          ? styles.sentimentPositive
                          : record.sentiment === 'Urgent'
                          ? styles.sentimentUrgent
                          : styles.sentimentNeutral,
                      ]}
                    >
                      <Text
                        style={[
                          styles.sentimentText,
                          record.sentiment === 'Positive'
                            ? styles.sentimentTextPositive
                            : record.sentiment === 'Urgent'
                            ? styles.sentimentTextUrgent
                            : styles.sentimentTextNeutral,
                        ]}
                      >
                        {record.sentiment}
                      </Text>
                    </View>

                    <Text style={styles.timestampText}>{record.timestamp}</Text>
                  </View>
                </View>

                {/* Duration if call */}
                {record.durationSeconds && (
                  <View style={styles.durationPill}>
                    <Ionicons name="timer-outline" size={12} color={COLORS.cyan} />
                    <Text style={styles.durationLabel}>Call Duration: {record.durationSeconds}s</Text>
                  </View>
                )}

                {/* Summary */}
                <Text style={styles.summaryText}>{record.summary}</Text>

                {/* Expanded Transcript */}
                {isExpanded && (
                  <View style={styles.transcriptBox}>
                    <Text style={styles.transcriptBoxTitle}>FULL RECORDED TRANSCRIPT:</Text>
                    <Text style={styles.transcriptFullText}>{record.transcript}</Text>
                  </View>
                )}

                {/* Bottom Actions */}
                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    style={styles.expandToggle}
                    onPress={() => setExpandedId(isExpanded ? null : record.id)}
                  >
                    <Text style={styles.expandToggleText}>
                      {isExpanded ? 'Hide Transcript' : 'View Full Transcript'}
                    </Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color={COLORS.cyan}
                    />
                  </TouchableOpacity>

                  <View style={styles.actionButtons}>
                    {/* Copy to Clipboard */}
                    <TouchableOpacity
                      style={styles.iconAction}
                      onPress={() => handleCopyTranscript(record)}
                    >
                      <Ionicons
                        name={isCopied ? 'checkmark' : 'copy-outline'}
                        size={16}
                        color={isCopied ? COLORS.success : COLORS.cyan}
                      />
                      <Text
                        style={[
                          styles.actionLabel,
                          isCopied && { color: COLORS.success },
                        ]}
                      >
                        {isCopied ? 'Copied' : 'Copy'}
                      </Text>
                    </TouchableOpacity>

                    {/* Delete */}
                    <TouchableOpacity
                      style={styles.iconAction}
                      onPress={() => handleDeleteRecord(record.id)}
                    >
                      <Ionicons name="trash-outline" size={16} color={COLORS.urgent} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Manual Log Modal */}
      <Modal visible={showManualModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manual Contact Record</Text>
              <TouchableOpacity onPress={() => setShowManualModal(false)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.inputLabel}>Contact Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Acme Supplies Vendor"
                placeholderTextColor={COLORS.textMuted}
                value={manualName}
                onChangeText={setManualName}
              />

              <Text style={styles.inputLabel}>Phone / Handle</Text>
              <TextInput
                style={styles.input}
                placeholder="+1 (555) 000-0000"
                placeholderTextColor={COLORS.textMuted}
                value={manualPhone}
                onChangeText={setManualPhone}
              />

              <Text style={styles.inputLabel}>Channel</Text>
              <View style={styles.chipRow}>
                {(['Call', 'WhatsApp'] as const).map(ch => (
                  <TouchableOpacity
                    key={ch}
                    style={[styles.chip, manualChannel === ch && styles.chipActive]}
                    onPress={() => setManualChannel(ch)}
                  >
                    <Text style={[styles.chipText, manualChannel === ch && styles.chipTextActive]}>
                      {ch}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Sentiment</Text>
              <View style={styles.chipRow}>
                {(['Positive', 'Urgent', 'Neutral'] as SentimentType[]).map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, manualSentiment === s && styles.chipActive]}
                    onPress={() => setManualSentiment(s)}
                  >
                    <Text style={[styles.chipText, manualSentiment === s && styles.chipTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Summary of Agreement / Notes</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                placeholder="Confirmed delivery terms and agreed on schedule."
                placeholderTextColor={COLORS.textMuted}
                value={manualSummary}
                onChangeText={setManualSummary}
                multiline
              />

              <Text style={styles.inputLabel}>Full Transcript (Optional)</Text>
              <TextInput
                style={[styles.input, { height: 90 }]}
                placeholder="[Contact]: ...&#10;[User/Sky]: ..."
                placeholderTextColor={COLORS.textMuted}
                value={manualTranscript}
                onChangeText={setManualTranscript}
                multiline
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveManualLog}>
                <LinearGradient colors={GRADIENTS.floatingButton} style={styles.saveGradient}>
                  <Text style={styles.saveBtnText}>Save to Archive & Supabase</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    width: '100%',
  },
  topBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  bannerSubtitle: {
    color: COLORS.cyan,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  manualLogBtn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  manualBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  manualBtnText: {
    color: '#070A12',
    fontSize: 11,
    fontWeight: '800',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginVertical: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterChipActive: {
    borderColor: COLORS.cyan,
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
  },
  filterText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  filterTextActive: {
    color: COLORS.cyan,
  },
  listArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    gap: 10,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  emptyDesc: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  recordCard: {
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  channelIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  contactPhone: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  sentimentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sentimentPositive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  sentimentUrgent: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  sentimentNeutral: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  sentimentText: {
    fontSize: 9,
    fontWeight: '800',
  },
  sentimentTextPositive: {
    color: '#10B981',
  },
  sentimentTextUrgent: {
    color: '#EF4444',
  },
  sentimentTextNeutral: {
    color: '#94A3B8',
  },
  timestampText: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F172A',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  durationLabel: {
    color: COLORS.cyan,
    fontSize: 10,
    fontWeight: '700',
  },
  summaryText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  transcriptBox: {
    backgroundColor: '#070A12',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.2)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  transcriptBoxTitle: {
    color: COLORS.cyan,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  transcriptFullText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'monospace',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(30, 41, 59, 0.5)',
    paddingTop: 8,
  },
  expandToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expandToggleText: {
    color: COLORS.cyan,
    fontSize: 11,
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionLabel: {
    color: COLORS.cyan,
    fontSize: 11,
    fontWeight: '700',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.backgroundCardElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  inputLabel: {
    color: COLORS.cyan,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#070A12',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    padding: 10,
    color: COLORS.textPrimary,
    fontSize: 13,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    backgroundColor: '#070A12',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  chipActive: {
    borderColor: COLORS.cyan,
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
  },
  chipText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  chipTextActive: {
    color: COLORS.cyan,
  },
  saveBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 18,
  },
  saveGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  saveBtnText: {
    color: '#070A12',
    fontSize: 14,
    fontWeight: '800',
  },
});

