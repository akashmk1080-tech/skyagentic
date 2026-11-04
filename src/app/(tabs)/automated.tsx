import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../../constants/theme';
import {
  AutomatedTask,
  AgenticMode,
  AutomatedChannel,
  DeviceContact,
} from '../../types';
import { StorageService } from '../../services/storage';
import { SchedulerService } from '../../services/scheduler';
import { PreciseTimePicker } from '../../components/PreciseTimePicker';
import { ContactsPickerModal } from '../../components/ContactsPickerModal';
import { VoiceCallModal } from '../../components/VoiceCallModal';
import { WhatsAppUnreadHub } from '../../components/WhatsAppUnreadHub';

const WORK_GOAL_PRESETS = [
  'Ask vendor to confirm delivery date and negotiate a 10% discount',
  'Coordinate 3:00 PM sprint review meeting agenda and confirm availability',
  'Follow up on invoice approval and request disbursement confirmation',
  'Check with client regarding feedback on the new mobile app design milestones',
];

export default function AutomatedScreen() {
  const [subTab, setSubTab] = useState<'scheduler' | 'whatsapp'>('scheduler');
  const [scheduledTasks, setScheduledTasks] = useState<AutomatedTask[]>([]);

  // Task Creation Form State
  const [mode, setMode] = useState<AgenticMode>('Agentic AI');
  const [channel, setChannel] = useState<AutomatedChannel>('Phone Call');
  const [selectedContact, setSelectedContact] = useState<DeviceContact>({
    id: 'c1',
    name: 'Vendor - Acme Supplies',
    phoneNumber: '+1 (555) 234-5678',
  });
  const [contextGoal, setContextGoal] = useState(
    'Ask vendor to confirm delivery date and negotiate a 10% discount'
  );

  // Time state (default to next 10 mins)
  const now = new Date();
  let defaultHour = (now.getHours() % 12) || 12;
  let defaultMin = (now.getMinutes() + 5) % 60;
  let defaultPeriod: 'AM' | 'PM' = now.getHours() >= 12 ? 'PM' : 'AM';

  const [hour, setHour] = useState(defaultHour);
  const [minute, setMinute] = useState(defaultMin);
  const [period, setPeriod] = useState<'AM' | 'PM'>(defaultPeriod);

  // Modals
  const [showContactsPicker, setShowContactsPicker] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);

  useEffect(() => {
    loadTasks();
    // Start background scheduler
    SchedulerService.start();

    // Listen for scheduled task triggers
    const unsub = SchedulerService.onTaskTrigger((triggeredTask) => {
      if (triggeredTask.channel === 'Phone Call') {
        setSelectedContact({
          id: 'triggered',
          name: triggeredTask.contactName,
          phoneNumber: triggeredTask.contactPhone,
        });
        setContextGoal(triggeredTask.contextGoal);
        setShowCallModal(true);
      }
      loadTasks();
    });

    return () => {
      unsub();
    };
  }, []);

  const loadTasks = async () => {
    const list = await StorageService.getAutomatedTasks();
    setScheduledTasks(list);
  };

  const handleScheduleTask = async () => {
    if (!contextGoal.trim()) {
      Alert.alert('Context Goal Required', 'Please specify the exact work context and objectives for Sky AI.');
      return;
    }

    const newTask: AutomatedTask = {
      id: `task_${Date.now()}`,
      title: `${channel} to ${selectedContact.name}`,
      contactName: selectedContact.name,
      contactPhone: selectedContact.phoneNumber,
      channel: channel,
      scheduledTime: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${period}`,
      scheduledHour: hour,
      scheduledMinute: minute,
      scheduledPeriod: period,
      contextGoal: contextGoal.trim(),
      mode: mode,
      status: 'Scheduled',
      createdAt: new Date().toISOString(),
    };

    const updated = await StorageService.saveAutomatedTask(newTask);
    setScheduledTasks(updated);

    Alert.alert(
      'Task Scheduled with Sky AI',
      `Sky AI is set to ${mode === 'Agentic AI' ? 'autonomously execute' : 'prompt for confirmation'} at ${newTask.scheduledTime}.`
    );
  };

  const handleDeleteTask = async (id: string) => {
    const updated = await StorageService.deleteAutomatedTask(id);
    setScheduledTasks(updated);
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Top Segmented Sub-Tab Switcher */}
      <View style={styles.segmentedContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, subTab === 'scheduler' && styles.segmentBtnActive]}
          onPress={() => setSubTab('scheduler')}
        >
          <Ionicons
            name="calendar-sharp"
            size={16}
            color={subTab === 'scheduler' ? '#070A12' : COLORS.textMuted}
          />
          <Text
            style={[styles.segmentText, subTab === 'scheduler' && styles.segmentTextActive]}
          >
            Agentic Scheduler
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, subTab === 'whatsapp' && styles.segmentBtnActive]}
          onPress={() => setSubTab('whatsapp')}
        >
          <Ionicons
            name="logo-whatsapp"
            size={16}
            color={subTab === 'whatsapp' ? '#070A12' : COLORS.textMuted}
          />
          <Text
            style={[styles.segmentText, subTab === 'whatsapp' && styles.segmentTextActive]}
          >
            WhatsApp Unread Hub
          </Text>
        </TouchableOpacity>
      </View>

      {subTab === 'whatsapp' ? (
        <WhatsAppUnreadHub />
      ) : (
        <ScrollView style={styles.scrollArea} contentContainerStyle={{ paddingBottom: 110 }}>
          {/* Autonomous Mode Toggle Card */}
          <View style={styles.modeCard}>
            <View style={styles.modeTextGroup}>
              <View style={styles.modeTitleRow}>
                <Ionicons
                  name={mode === 'Agentic AI' ? 'hardware-chip' : 'hand-left'}
                  size={18}
                  color={COLORS.cyan}
                />
                <Text style={styles.modeTitle}>{mode}</Text>
              </View>
              <Text style={styles.modeDescription}>
                {mode === 'Agentic AI'
                  ? 'Autonomous execution: AI dials, introduces itself, articulates goal, negotiates terms, and logs transcript.'
                  : 'Manual confirmation: AI prepares script and prompts you before placing call or sending message.'}
              </Text>
            </View>

            <Switch
              value={mode === 'Agentic AI'}
              onValueChange={(val) => setMode(val ? 'Agentic AI' : 'Manual Mode')}
              trackColor={{ false: '#334155', true: COLORS.azure }}
              thumbColor={mode === 'Agentic AI' ? COLORS.cyan : '#94A3B8'}
            />
          </View>

          {/* Channel Selector */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>COMMUNICATION CHANNEL</Text>
            <View style={styles.channelRow}>
              {(['Phone Call', 'WhatsApp', 'Gmail'] as AutomatedChannel[]).map((ch) => (
                <TouchableOpacity
                  key={ch}
                  style={[styles.channelChip, channel === ch && styles.channelChipActive]}
                  onPress={() => setChannel(ch)}
                >
                  <Ionicons
                    name={
                      ch === 'Phone Call'
                        ? 'call'
                        : ch === 'WhatsApp'
                        ? 'logo-whatsapp'
                        : 'mail'
                    }
                    size={16}
                    color={channel === ch ? COLORS.cyan : COLORS.textMuted}
                  />
                  <Text
                    style={[styles.channelText, channel === ch && styles.channelTextActive]}
                  >
                    {ch}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Contact Selector */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>TARGET CONTACT</Text>
              <TouchableOpacity
                style={styles.changeContactBtn}
                onPress={() => setShowContactsPicker(true)}
              >
                <Ionicons name="people-outline" size={14} color={COLORS.cyan} />
                <Text style={styles.changeContactText}>Browse Address Book</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.selectedContactBox}
              onPress={() => setShowContactsPicker(true)}
            >
              <View style={styles.contactAvatar}>
                <Text style={styles.avatarLetter}>
                  {selectedContact.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.contactDetails}>
                <Text style={styles.contactName}>{selectedContact.name}</Text>
                <Text style={styles.contactPhone}>{selectedContact.phoneNumber}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Work Goal & Context Specification */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>CONTEXT & WORK GOAL SPECIFICATION</Text>
            <Text style={styles.goalHelpText}>
              Specify exactly what Sky AI should achieve, negotiate, or confirm with this contact.
            </Text>

            <TextInput
              style={styles.goalInput}
              value={contextGoal}
              onChangeText={setContextGoal}
              placeholder="e.g. Ask vendor to confirm delivery date and negotiate a 10% discount"
              placeholderTextColor={COLORS.textMuted}
              multiline
            />

            {/* Quick Preset Goal Chips */}
            <Text style={styles.presetHeading}>QUICK GOAL TEMPLATES:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
              {WORK_GOAL_PRESETS.map((preset, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.presetChip}
                  onPress={() => setContextGoal(preset)}
                >
                  <Text style={styles.presetText} numberOfLines={1}>
                    {preset}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Precise Timing Scheduler */}
          <PreciseTimePicker
            hour={hour}
            minute={minute}
            period={period}
            onChange={(h, m, p) => {
              setHour(h);
              setMinute(m);
              setPeriod(p);
            }}
          />

          {/* Execution Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            {/* Direct Instant AI Call Trigger */}
            {channel === 'Phone Call' && (
              <TouchableOpacity
                style={styles.instantCallBtn}
                onPress={() => setShowCallModal(true)}
              >
                <LinearGradient
                  colors={['#00F0FF', '#0284C7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.instantCallGradient}
                >
                  <Ionicons name="call" size={18} color="#070A12" />
                  <Text style={styles.instantCallText}>Launch Autonomous AI Call Now</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Schedule Task Button */}
            <TouchableOpacity style={styles.scheduleBtn} onPress={handleScheduleTask}>
              <LinearGradient
                colors={['#1E293B', '#0F172A']}
                style={styles.scheduleGradient}
              >
                <Ionicons name="time" size={18} color={COLORS.cyan} />
                <Text style={styles.scheduleBtnText}>
                  Schedule for {hour.toString().padStart(2, '0')}:{minute.toString().padStart(2, '0')} {period}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Active Scheduled Tasks Queue */}
          <View style={styles.queueSection}>
            <Text style={styles.queueHeader}>
              SCHEDULED AGENTIC QUEUE ({scheduledTasks.length})
            </Text>

            {scheduledTasks.length === 0 ? (
              <View style={styles.emptyQueue}>
                <Text style={styles.emptyQueueText}>
                  No active scheduled agentic tasks. Configure a contact and goal above to schedule autonomous execution.
                </Text>
              </View>
            ) : (
              scheduledTasks.map((t) => (
                <View key={t.id} style={styles.taskQueueCard}>
                  <View style={styles.queueTopRow}>
                    <View style={styles.taskMetaGroup}>
                      <View style={styles.timeTag}>
                        <Ionicons name="time-outline" size={12} color={COLORS.cyan} />
                        <Text style={styles.timeTagText}>{t.scheduledTime}</Text>
                      </View>
                      <View style={styles.channelBadge}>
                        <Text style={styles.channelBadgeText}>{t.channel}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteTask(t.id)}>
                      <Ionicons name="trash-outline" size={16} color={COLORS.urgent} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.taskTarget}>Contact: {t.contactName} ({t.contactPhone})</Text>
                  <Text style={styles.taskGoalText} numberOfLines={2}>
                    Goal: "{t.contextGoal}"
                  </Text>

                  <View style={styles.queueFooter}>
                    <Text style={styles.modeBadgeText}>Mode: {t.mode}</Text>
                    <Text style={styles.statusBadgeText}>Status: {t.status}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* Contacts Picker Modal */}
      <ContactsPickerModal
        visible={showContactsPicker}
        onClose={() => setShowContactsPicker(false)}
        onSelectContact={(c) => setSelectedContact(c)}
      />

      {/* Autonomous Voice Call Interface Modal */}
      <VoiceCallModal
        visible={showCallModal}
        contactName={selectedContact.name}
        contactPhone={selectedContact.phoneNumber}
        contextGoal={contextGoal}
        onClose={() => setShowCallModal(false)}
        onCallSaved={() => loadTasks()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    width: '100%',
  },
  segmentedContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.cyan,
  },
  segmentText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: '#070A12',
  },
  scrollArea: {
    flex: 1,
    paddingHorizontal: 16,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  modeTextGroup: {
    flex: 1,
    paddingRight: 12,
  },
  modeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  modeTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },
  modeDescription: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  sectionCard: {
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionLabel: {
    color: COLORS.cyan,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  changeContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeContactText: {
    color: COLORS.cyan,
    fontSize: 11,
    fontWeight: '700',
  },
  channelRow: {
    flexDirection: 'row',
    gap: 10,
  },
  channelChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: 6,
  },
  channelChipActive: {
    borderColor: COLORS.cyan,
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
  },
  channelText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  channelTextActive: {
    color: COLORS.cyan,
  },
  selectedContactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
  },
  contactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.azure,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  contactPhone: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  goalHelpText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 8,
  },
  goalInput: {
    backgroundColor: '#070A12',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
    borderRadius: 12,
    padding: 12,
    color: COLORS.textPrimary,
    fontSize: 13,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  presetHeading: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 6,
  },
  presetScroll: {
    flexDirection: 'row',
  },
  presetChip: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginRight: 8,
    maxWidth: 240,
  },
  presetText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  actionButtonsContainer: {
    gap: 10,
    marginVertical: 10,
  },
  instantCallBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  instantCallGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  instantCallText: {
    color: '#070A12',
    fontSize: 14,
    fontWeight: '900',
  },
  scheduleBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },
  scheduleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  scheduleBtnText: {
    color: COLORS.cyan,
    fontSize: 14,
    fontWeight: '800',
  },
  queueSection: {
    marginTop: 16,
  },
  queueHeader: {
    color: COLORS.cyan,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  emptyQueue: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  emptyQueueText: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  taskQueueCard: {
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  queueTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  taskMetaGroup: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeTagText: {
    color: COLORS.cyan,
    fontSize: 12,
    fontWeight: '800',
  },
  channelBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  channelBadgeText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  taskTarget: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  taskGoalText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  queueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(30, 41, 59, 0.4)',
    paddingTop: 6,
  },
  modeBadgeText: {
    color: COLORS.cyanMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadgeText: {
    color: COLORS.success,
    fontSize: 10,
    fontWeight: '700',
  },
});

