import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/theme';
import { WhatsAppMessage, ReplyRecord } from '../types';
import { StorageService } from '../services/storage';
import { GeminiService } from '../services/gemini';
import { SupabaseService } from '../services/supabase';

const SIMULATION_PRESETS = [
  {
    senderName: 'Vendor - Acme Supplies',
    senderPhone: '+15552345678',
    messageText: 'Hello! Checking to confirm if we should dispatch the project materials on Friday morning or if you need an expedited date?',
  },
  {
    senderName: 'Prof. David Roberts',
    senderPhone: '+15558765432',
    messageText: 'Hi, please send over your updated thesis outline and study schedule before the department review today.',
  },
  {
    senderName: 'Alex - Project Manager',
    senderPhone: '+15554321098',
    messageText: 'Hey! Are we still aligned for the 3:00 PM sync to finalize the mobile app sprint deliverable?',
  },
];

export const WhatsAppUnreadHub: React.FC = () => {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [editingReplies, setEditingReplies] = useState<{ [id: string]: string }>({});

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    const msgs = await StorageService.getWhatsAppMessages();
    setMessages(msgs);

    // Initialize editing replies
    const map: { [id: string]: string } = {};
    msgs.forEach(m => {
      if (m.suggestedReply) map[m.id] = m.suggestedReply;
    });
    setEditingReplies(map);
    setLoading(false);
  };

  // Simulate incoming WhatsApp message
  const handleSimulateIncomingMessage = async () => {
    const randomPreset = SIMULATION_PRESETS[Math.floor(Math.random() * SIMULATION_PRESETS.length)];
    const newMsg: WhatsAppMessage = {
      id: `wa_${Date.now()}`,
      senderName: randomPreset.senderName,
      senderPhone: randomPreset.senderPhone,
      messageText: randomPreset.messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      unread: true,
      suggestedReply: undefined,
    };

    const updated = await StorageService.addWhatsAppMessage(newMsg);
    setMessages(updated);

    // Automatically trigger AI suggestion draft
    handleDraftAIReply(newMsg);
  };

  // 1-Tap Agentic AI Reply Generation
  const handleDraftAIReply = async (msg: WhatsAppMessage) => {
    setDraftingId(msg.id);
    try {
      const knowledge = await StorageService.getKnowledge();
      const reply = await GeminiService.draftWhatsAppReply(msg.messageText, msg.senderName, knowledge);
      
      const updated = await StorageService.updateWhatsAppSuggestedReply(msg.id, reply);
      setMessages(updated);
      setEditingReplies(prev => ({ ...prev, [msg.id]: reply }));
    } catch (e: any) {
      console.warn('Draft reply error:', e);
    } finally {
      setDraftingId(null);
    }
  };

  // 1-Tap Agentic Auto-Reply & WhatsApp Dispatch
  const handleSendViaWhatsApp = async (msg: WhatsAppMessage) => {
    const replyText = editingReplies[msg.id] || msg.suggestedReply;
    if (!replyText) {
      Alert.alert('No Reply Text', 'Please generate or enter a reply before dispatching.');
      return;
    }

    const cleanPhone = msg.senderPhone.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(replyText);
    const waUrl = `whatsapp://send?phone=${cleanPhone}&text=${encoded}`;
    const webFallbackUrl = `https://wa.me/${cleanPhone}?text=${encoded}`;

    // Mark as read
    const updated = await StorageService.markWhatsAppMessageRead(msg.id);
    setMessages(updated);

    // Save record to archive
    const replyRecord: ReplyRecord = {
      id: `wa_reply_${Date.now()}`,
      contactName: msg.senderName,
      contactPhone: msg.senderPhone,
      channel: 'WhatsApp',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sentiment: 'Positive',
      summary: `Auto-replied to message: "${msg.messageText.slice(0, 40)}..."`,
      transcript: `[Contact ${msg.senderName}]: ${msg.messageText}\n[Sky AI Suggested & Dispatched]: ${replyText}`,
      actionTaken: '1-Tap Agentic Auto-Reply opened in WhatsApp',
      createdAt: new Date().toISOString(),
    };

    await StorageService.addReplyRecord(replyRecord);
    await SupabaseService.syncReplyRecord(replyRecord);

    try {
      const supported = await Linking.canOpenURL(waUrl);
      if (supported) {
        await Linking.openURL(waUrl);
      } else {
        await Linking.openURL(webFallbackUrl);
      }
    } catch {
      await Linking.openURL(webFallbackUrl);
    }
  };

  const unreadCount = messages.filter(m => m.unread).length;

  return (
    <View style={styles.container}>
      {/* Simulation Bar */}
      <View style={styles.simulationBar}>
        <View style={styles.unreadStatusGroup}>
          <View style={styles.waBadge}>
            <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
            <Text style={styles.waBadgeText}>UNREAD INBOX ({unreadCount})</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.simulateBtn} onPress={handleSimulateIncomingMessage}>
          <LinearGradient colors={['#1E293B', '#111827']} style={styles.simulateGradient}>
            <Ionicons name="flash-outline" size={14} color={COLORS.cyan} />
            <Text style={styles.simulateText}>Simulate Message</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Messages Feed */}
      <ScrollView style={styles.messagesList} contentContainerStyle={{ paddingBottom: 24 }}>
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.cyan} style={{ marginVertical: 30 }} />
        ) : messages.length === 0 ? (
          <View style={styles.emptyInbox}>
            <Ionicons name="chatbubble-ellipses-outline" size={44} color={COLORS.textDisabled} />
            <Text style={styles.emptyTitle}>No WhatsApp Messages</Text>
            <Text style={styles.emptySubtitle}>
              Tap "Simulate Message" to test the 1-Tap Agentic Auto-Reply workflow in this prototype environment.
            </Text>
          </View>
        ) : (
          messages.map((msg) => {
            const isDrafting = draftingId === msg.id;
            const currentReply = editingReplies[msg.id] ?? msg.suggestedReply;

            return (
              <View key={msg.id} style={[styles.messageCard, msg.unread && styles.unreadCard]}>
                {/* Message Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.senderGroup}>
                    {msg.unread && <View style={styles.unreadDot} />}
                    <Text style={styles.senderName}>{msg.senderName}</Text>
                    <Text style={styles.senderPhone}>{msg.senderPhone}</Text>
                  </View>
                  <Text style={styles.timestamp}>{msg.timestamp}</Text>
                </View>

                {/* Received Text */}
                <View style={styles.incomingBubble}>
                  <Text style={styles.incomingText}>{msg.messageText}</Text>
                </View>

                {/* Agentic AI Suggested Reply Box */}
                <View style={styles.replyBox}>
                  <View style={styles.replyBoxHeader}>
                    <View style={styles.aiLabelRow}>
                      <Ionicons name="sparkles" size={14} color={COLORS.cyan} />
                      <Text style={styles.aiLabel}>SKY AI SUGGESTED REPLY</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDraftAIReply(msg)}
                      disabled={isDrafting}
                      style={styles.reDraftBtn}
                    >
                      <Ionicons name="refresh" size={12} color={COLORS.cyan} />
                      <Text style={styles.reDraftText}>Regenerate</Text>
                    </TouchableOpacity>
                  </View>

                  {isDrafting ? (
                    <View style={styles.draftingRow}>
                      <ActivityIndicator size="small" color={COLORS.cyan} />
                      <Text style={styles.draftingText}>Grounding response in your schedule...</Text>
                    </View>
                  ) : (
                    <TextInput
                      style={styles.replyInput}
                      value={currentReply || ''}
                      onChangeText={(t) => setEditingReplies(prev => ({ ...prev, [msg.id]: t }))}
                      placeholder="Generating context-aware reply..."
                      placeholderTextColor={COLORS.textMuted}
                      multiline
                    />
                  )}

                  {/* 1-Tap WhatsApp Action Button */}
                  <TouchableOpacity
                    style={styles.oneTapSendBtn}
                    onPress={() => handleSendViaWhatsApp(msg)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#25D366', '#128C7E']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.sendGradient}
                    >
                      <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
                      <Text style={styles.sendBtnText}>1-Tap Agentic Auto-Reply</Text>
                      <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  simulationBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  unreadStatusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  waBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(37, 211, 102, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  waBadgeText: {
    color: '#25D366',
    fontSize: 11,
    fontWeight: '800',
  },
  simulateBtn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  simulateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    borderRadius: 10,
  },
  simulateText: {
    color: COLORS.cyan,
    fontSize: 11,
    fontWeight: '700',
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  emptyInbox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 10,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  messageCard: {
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  unreadCard: {
    borderColor: 'rgba(37, 211, 102, 0.4)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  senderGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#25D366',
  },
  senderName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  senderPhone: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  timestamp: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  incomingBubble: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#25D366',
    marginBottom: 10,
  },
  incomingText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    lineHeight: 18,
  },
  replyBox: {
    backgroundColor: 'rgba(0, 240, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.2)',
    borderRadius: 12,
    padding: 10,
  },
  replyBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  aiLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiLabel: {
    color: COLORS.cyan,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  reDraftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reDraftText: {
    color: COLORS.cyan,
    fontSize: 10,
    fontWeight: '600',
  },
  draftingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  draftingText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
  },
  replyInput: {
    color: COLORS.textPrimary,
    fontSize: 12,
    backgroundColor: '#070A12',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 8,
    padding: 8,
    minHeight: 50,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  oneTapSendBtn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  sendGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});

