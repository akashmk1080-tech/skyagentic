import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../../constants/theme';
import { ChatMessage, KnowledgeItem, ScheduleItem } from '../../types';
import { StorageService } from '../../services/storage';
import { GeminiService } from '../../services/gemini';
import { TTSService, TTSState } from '../../services/tts';

const QUICK_PROMPTS = [
  'Summarize my day & timetable',
  'What is my next priority task?',
  'Review uploaded syllabus & habit notes',
  'Suggest schedule optimizations',
];

export default function AIChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [ttsState, setTtsState] = useState<TTSState>({ isSpeaking: false, currentText: null });

  const [knowledgeList, setKnowledgeList] = useState<KnowledgeItem[]>([]);
  const [scheduleList, setScheduleList] = useState<ScheduleItem[]>([]);

  const scrollViewRef = useRef<any>(null);

  useEffect(() => {
    loadChatAndGroundingData();
    const unsub = TTSService.subscribe(setTtsState);
    return () => {
      unsub();
      TTSService.stop();
    };
  }, []);

  const loadChatAndGroundingData = async () => {
    const chat = await StorageService.getChatMessages();
    const knowledge = await StorageService.getKnowledge();
    const schedule = await StorageService.getSchedule();
    const settings = await StorageService.getSettings();

    setKnowledgeList(knowledge);
    setScheduleList(schedule);
    setAutoSpeak(settings.autoSpeakTTS || false);

    if (chat.length === 0) {
      // Friendly initial greeting
      const welcomeMsg: ChatMessage = {
        id: 'msg_welcome',
        sender: 'sky',
        text: `Greetings! I am Sky AI, your autonomous assistant. I am grounded in your uploaded knowledge documents (${knowledge.length} files) and current schedule (${schedule.length} items). Ask me anything about your day, or tell me to execute tasks!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        groundingSources: knowledge.map(k => k.title),
      };
      setMessages([welcomeMsg]);
      await StorageService.saveChatMessage(welcomeMsg);
    } else {
      setMessages(chat);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    setInputText('');
    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedWithUser = [...messages, userMsg];
    setMessages(updatedWithUser);
    await StorageService.saveChatMessage(userMsg);

    // Scroll to bottom
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    setLoading(true);
    try {
      const historyFormatted = updatedWithUser.map(m => ({ sender: m.sender, text: m.text }));
      const response = await GeminiService.chatAssistant(
        text,
        knowledgeList,
        scheduleList,
        historyFormatted
      );

      const aiMsg: ChatMessage = {
        id: `msg_sky_${Date.now()}`,
        sender: 'sky',
        text: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        groundingSources: response.sources.length > 0 ? response.sources : undefined,
      };

      const finalMessages = [...updatedWithUser, aiMsg];
      setMessages(finalMessages);
      await StorageService.saveChatMessage(aiMsg);

      // Auto speak if enabled
      if (autoSpeak) {
        TTSService.speak(response.text);
      }
    } catch (e: any) {
      console.warn('AI chat error:', e);
    } finally {
      setLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const toggleAutoSpeak = async () => {
    const nextVal = !autoSpeak;
    setAutoSpeak(nextVal);
    const s = await StorageService.getSettings();
    await StorageService.saveSettings({ ...s, autoSpeakTTS: nextVal });
    if (!nextVal) {
      TTSService.stop();
    }
  };

  const handlePlayTTS = (text: string) => {
    if (ttsState.isSpeaking && ttsState.currentText === text) {
      TTSService.stop();
    } else {
      TTSService.speak(text);
    }
  };

  const handleClearChat = async () => {
    await StorageService.clearChatMessages();
    setMessages([]);
    loadChatAndGroundingData();
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      {/* Top Status & TTS Bar */}
      <View style={styles.topControlBar}>
        <View style={styles.groundingIndicator}>
          <Ionicons name="shield-checkmark" size={14} color={COLORS.cyan} />
          <Text style={styles.groundingText}>
            Grounded in {knowledgeList.length} files & {scheduleList.length} schedule items
          </Text>
        </View>

        <View style={styles.barRightActions}>
          {/* Auto Speak Toggle */}
          <TouchableOpacity
            style={[styles.autoSpeakChip, autoSpeak && styles.autoSpeakChipActive]}
            onPress={toggleAutoSpeak}
          >
            <Ionicons
              name={autoSpeak ? 'volume-high' : 'volume-mute'}
              size={13}
              color={autoSpeak ? '#070A12' : COLORS.textMuted}
            />
            <Text
              style={[styles.autoSpeakText, autoSpeak && styles.autoSpeakTextActive]}
            >
              Auto-Speak
            </Text>
          </TouchableOpacity>

          {/* Clear Chat */}
          <TouchableOpacity onPress={handleClearChat} style={styles.clearBtn}>
            <Ionicons name="trash-outline" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Visual Speaking Status Indicator */}
      {ttsState.isSpeaking && (
        <View style={styles.speakingBanner}>
          <View style={styles.speakingLeft}>
            <Ionicons name="mic" size={16} color={COLORS.cyan} />
            <Text style={styles.speakingText}>Speaking Response (TTS Voice)...</Text>
          </View>
          <TouchableOpacity onPress={() => TTSService.stop()} style={styles.stopSpeechBtn}>
            <Ionicons name="stop-circle" size={16} color="#EF4444" />
            <Text style={styles.stopSpeechText}>Stop</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Chat Messages Feed */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatScroll}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {messages.map((msg) => {
          const isSky = msg.sender === 'sky';
          const isCurrentlySpeakingThis = ttsState.isSpeaking && ttsState.currentText === msg.text;

          return (
            <View
              key={msg.id}
              style={[styles.messageRow, isSky ? styles.rowSky : styles.rowUser]}
            >
              {isSky && (
                <View style={styles.skyAvatarCircle}>
                  <Ionicons name="sparkles" size={14} color="#FFFFFF" />
                </View>
              )}

              <View
                style={[
                  styles.messageBubble,
                  isSky ? styles.bubbleSky : styles.bubbleUser,
                  isCurrentlySpeakingThis && styles.bubbleSpeaking,
                ]}
              >
                <Text style={styles.bubbleText}>{msg.text}</Text>

                {/* Grounding Source Badges */}
                {msg.groundingSources && msg.groundingSources.length > 0 && (
                  <View style={styles.sourcesContainer}>
                    <Text style={styles.sourcesTitle}>GROUNDED IN:</Text>
                    <View style={styles.sourcesRow}>
                      {msg.groundingSources.map((src, i) => (
                        <View key={i} style={styles.sourceBadge}>
                          <Ionicons name="document-text-outline" size={10} color={COLORS.cyan} />
                          <Text style={styles.sourceBadgeText} numberOfLines={1}>{src}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Timestamp & TTS Audio Playback Button */}
                <View style={styles.bubbleFooter}>
                  <Text style={styles.bubbleTimestamp}>{msg.timestamp}</Text>

                  {isSky && (
                    <TouchableOpacity
                      style={styles.audioPlayBtn}
                      onPress={() => handlePlayTTS(msg.text)}
                    >
                      <Ionicons
                        name={isCurrentlySpeakingThis ? 'stop-circle' : 'volume-high-outline'}
                        size={15}
                        color={isCurrentlySpeakingThis ? COLORS.cyan : COLORS.textMuted}
                      />
                      <Text style={[styles.audioPlayLabel, isCurrentlySpeakingThis && { color: COLORS.cyan }]}>
                        {isCurrentlySpeakingThis ? 'Stop' : 'Listen'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          );
        })}

        {loading && (
          <View style={styles.loadingBubble}>
            <ActivityIndicator size="small" color={COLORS.cyan} />
            <Text style={styles.loadingText}>Sky AI is synthesizing answer...</Text>
          </View>
        )}
      </ScrollView>

      {/* Quick Prompt Chips */}
      <View style={styles.quickPromptsArea}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {QUICK_PROMPTS.map((prompt, i) => (
            <TouchableOpacity
              key={i}
              style={styles.quickChip}
              onPress={() => handleSendMessage(prompt)}
            >
              <Text style={styles.quickChipText}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder="Ask Sky AI or command an action..."
          placeholderTextColor={COLORS.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />

        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
          onPress={() => handleSendMessage()}
          disabled={!inputText.trim() || loading}
        >
          <LinearGradient
            colors={!inputText.trim() ? ['#334155', '#1E293B'] : GRADIENTS.skyPrimary}
            style={styles.sendGradient}
          >
            <Ionicons name="arrow-up" size={18} color={!inputText.trim() ? COLORS.textMuted : '#070A12'} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingBottom: 75,
    width: '100%',
  },
  topControlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  groundingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  groundingText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  barRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  autoSpeakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  autoSpeakChipActive: {
    backgroundColor: COLORS.cyan,
    borderColor: COLORS.cyan,
  },
  autoSpeakText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  autoSpeakTextActive: {
    color: '#070A12',
  },
  clearBtn: {
    padding: 4,
  },
  speakingBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 240, 255, 0.3)',
  },
  speakingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  speakingText: {
    color: COLORS.cyan,
    fontSize: 11,
    fontWeight: '700',
  },
  stopSpeechBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stopSpeechText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '800',
  },
  chatScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-end',
  },
  rowSky: {
    justifyContent: 'flex-start',
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  skyAvatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.azure,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleSky: {
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    borderBottomRightRadius: 4,
  },
  bubbleSpeaking: {
    borderColor: COLORS.cyan,
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  bubbleText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    lineHeight: 19,
  },
  sourcesContainer: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(30, 41, 59, 0.6)',
  },
  sourcesTitle: {
    color: COLORS.cyan,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sourcesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sourceBadgeText: {
    color: COLORS.cyanMuted,
    fontSize: 9,
    maxWidth: 120,
  },
  bubbleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  bubbleTimestamp: {
    color: COLORS.textMuted,
    fontSize: 9,
  },
  audioPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  audioPlayLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  quickPromptsArea: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  quickChip: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  quickChipText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    backgroundColor: COLORS.backgroundCard,
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#070A12',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    fontSize: 13,
    maxHeight: 80,
  },
  sendButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendGradient: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
