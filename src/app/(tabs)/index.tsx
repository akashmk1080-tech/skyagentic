import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../../constants/theme';
import { ScheduleItem, PriorityLevel, TaskCategory } from '../../types';
import { StorageService } from '../../services/storage';
import { SupabaseService } from '../../services/supabase';

export default function ScheduleScreen() {
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [filter, setFilter] = useState<'All' | 'Timetable' | 'Tasks' | 'Done'>('All');
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New item form
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('09:00 AM');
  const [newDuration, setNewDuration] = useState('45');
  const [newCategory, setNewCategory] = useState<TaskCategory>('Deep Work');
  const [newPriority, setNewPriority] = useState<PriorityLevel>('High');
  const [newCitation, setNewCitation] = useState('Manual Entry');
  const [isActionable, setIsActionable] = useState(true);

  const loadSchedule = useCallback(async () => {
    const items = await StorageService.getSchedule();
    setScheduleItems(items);
  }, []);

  useEffect(() => {
    loadSchedule();
    // Poll updates
    const interval = setInterval(loadSchedule, 3000);
    return () => clearInterval(interval);
  }, [loadSchedule]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSchedule();
    setRefreshing(false);
  };

  const handleToggleTask = async (id: string) => {
    const updated = await StorageService.toggleScheduleTask(id);
    setScheduleItems(updated);
    await SupabaseService.syncSchedule(updated);
  };

  const handleDeleteItem = async (id: string, title: string) => {
    Alert.alert('Remove Item', `Delete "${title}" from your schedule?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = await StorageService.deleteScheduleItem(id);
          setScheduleItems(updated);
          await SupabaseService.syncSchedule(updated);
        },
      },
    ]);
  };

  const handleAddNewItem = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Title Required', 'Please enter a title for the task or timetable block.');
      return;
    }

    const item: ScheduleItem = {
      id: `sched_${Date.now()}`,
      time: newTime.trim() || '09:00 AM',
      timestamp: Date.now(),
      title: newTitle.trim(),
      durationMinutes: parseInt(newDuration, 10) || 45,
      category: newCategory,
      priority: newPriority,
      sourceCitation: newCitation.trim() || 'Manual Entry',
      completed: false,
      isActionableTask: isActionable,
      createdAt: new Date().toISOString(),
    };

    const updated = await StorageService.addScheduleItems([item]);
    setScheduleItems(updated);
    await SupabaseService.syncSchedule(updated);

    setNewTitle('');
    setShowAddModal(false);
  };

  // Filtered view
  const filteredItems = scheduleItems.filter(item => {
    if (filter === 'Timetable') return !item.isActionableTask;
    if (filter === 'Tasks') return item.isActionableTask && !item.completed;
    if (filter === 'Done') return item.completed;
    return true;
  });

  const totalTasks = scheduleItems.filter(i => i.isActionableTask).length;
  const completedTasks = scheduleItems.filter(i => i.isActionableTask && i.completed).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Progress & Stat Banner */}
      <View style={styles.statBanner}>
        <View style={styles.statInfo}>
          <Text style={styles.statTitle}>Schedule & Action Execution</Text>
          <Text style={styles.statSubtitle}>
            {completedTasks} of {totalTasks} actionable tasks completed ({progressPercent}%)
          </Text>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <LinearGradient colors={GRADIENTS.floatingButton} style={styles.addGradient}>
            <Ionicons name="add" size={20} color="#070A12" />
            <Text style={styles.addBtnText}>Add</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Progress Line */}
      {totalTasks > 0 && (
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['All', 'Tasks', 'Timetable', 'Done'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterChip, filter === tab && styles.filterChipActive]}
            onPress={() => setFilter(tab)}
          >
            <Text style={[styles.filterText, filter === tab && styles.filterTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Schedule List */}
      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.cyan} />
        }
      >
        {filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={54} color={COLORS.textDisabled} />
            <Text style={styles.emptyTitle}>Clean Initial State</Text>
            <Text style={styles.emptyDescription}>
              Sky begins with an empty timetable so you start with a clean slate. Tap the floating center Sky logo or top-right person icon to upload files and generate your personalized schedule with Gemini!
            </Text>
            <TouchableOpacity style={styles.quickAddAction} onPress={() => setShowAddModal(true)}>
              <Text style={styles.quickAddText}>+ Add Manual Task or Block</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredItems.map(item => (
            <View key={item.id} style={[styles.itemCard, item.completed && styles.itemCardCompleted]}>
              {/* Left Action / Checkbox */}
              {item.isActionableTask ? (
                <TouchableOpacity
                  style={[styles.checkbox, item.completed && styles.checkboxCompleted]}
                  onPress={() => handleToggleTask(item.id)}
                >
                  {item.completed && <Ionicons name="checkmark" size={14} color="#070A12" />}
                </TouchableOpacity>
              ) : (
                <View style={styles.blockIconBadge}>
                  <Ionicons name="time-outline" size={16} color={COLORS.cyan} />
                </View>
              )}

              {/* Main Content */}
              <View style={styles.itemContent}>
                <View style={styles.itemTopRow}>
                  <Text style={styles.timeBadge}>{item.time}</Text>
                  <View style={styles.badgeGroup}>
                    {/* Priority Badge */}
                    <View
                      style={[
                        styles.priorityBadge,
                        item.priority === 'High'
                          ? styles.priorityHigh
                          : item.priority === 'Medium'
                          ? styles.priorityMedium
                          : styles.priorityLow,
                      ]}
                    >
                      <Text
                        style={[
                          styles.priorityText,
                          item.priority === 'High'
                            ? styles.priorityTextHigh
                            : item.priority === 'Medium'
                            ? styles.priorityTextMedium
                            : styles.priorityTextLow,
                        ]}
                      >
                        {item.priority}
                      </Text>
                    </View>

                    {/* Category Tag */}
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>{item.category}</Text>
                    </View>
                  </View>
                </View>

                <Text style={[styles.itemTitle, item.completed && styles.itemTitleCompleted]}>
                  {item.title}
                </Text>

                <View style={styles.citationRow}>
                  <Text style={styles.durationText}>
                    <Ionicons name="hourglass-outline" size={11} color={COLORS.textMuted} /> {item.durationMinutes} mins
                  </Text>
                  {item.sourceCitation && (
                    <Text style={styles.citationText} numberOfLines={1}>
                      • Ref: {item.sourceCitation}
                    </Text>
                  )}
                </View>
              </View>

              {/* Delete Button */}
              <TouchableOpacity
                onPress={() => handleDeleteItem(item.id, item.title)}
                style={styles.deleteAction}
              >
                <Ionicons name="trash-outline" size={15} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Task Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeading}>Add Schedule Block or Task</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Deep Work: AI Model Architecture"
                placeholderTextColor={COLORS.textMuted}
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <View style={styles.inlineInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Time</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="09:00 AM"
                    placeholderTextColor={COLORS.textMuted}
                    value={newTime}
                    onChangeText={setNewTime}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Duration (mins)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="45"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                    value={newDuration}
                    onChangeText={setNewDuration}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Priority</Text>
              <View style={styles.chipSelector}>
                {(['High', 'Medium', 'Low'] as PriorityLevel[]).map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.selectorChip, newPriority === p && styles.selectorChipActive]}
                    onPress={() => setNewPriority(p)}
                  >
                    <Text
                      style={[
                        styles.selectorChipText,
                        newPriority === p && styles.selectorChipTextActive,
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.chipSelector}>
                {(['Deep Work', 'Study', 'Meeting', 'Routine', 'Agentic Action'] as TaskCategory[]).map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.selectorChip, newCategory === c && styles.selectorChipActive]}
                    onPress={() => setNewCategory(c)}
                  >
                    <Text
                      style={[
                        styles.selectorChipText,
                        newCategory === c && styles.selectorChipTextActive,
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Type Switch: Actionable Task vs Block */}
              <TouchableOpacity
                style={styles.actionableToggle}
                onPress={() => setIsActionable(!isActionable)}
              >
                <Ionicons
                  name={isActionable ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={COLORS.cyan}
                />
                <Text style={styles.actionableToggleText}>
                  Actionable Task with Completion Checkbox
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveSubmitBtn} onPress={handleAddNewItem}>
                <LinearGradient colors={GRADIENTS.floatingButton} style={styles.saveSubmitGradient}>
                  <Text style={styles.saveSubmitText}>Save to Timetable</Text>
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
  statBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  statInfo: {
    flex: 1,
  },
  statTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  statSubtitle: {
    color: COLORS.cyan,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  addBtn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  addGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  addBtnText: {
    color: '#070A12',
    fontWeight: '800',
    fontSize: 12,
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    marginHorizontal: 16,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.cyan,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginVertical: 6,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  filterChipActive: {
    borderColor: COLORS.cyan,
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
  },
  filterText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  filterTextActive: {
    color: COLORS.cyan,
  },
  listScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyDescription: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  quickAddAction: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },
  quickAddText: {
    color: COLORS.cyan,
    fontSize: 13,
    fontWeight: '700',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  itemCardCompleted: {
    opacity: 0.6,
    borderColor: 'rgba(51, 65, 85, 0.4)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.cyan,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxCompleted: {
    backgroundColor: COLORS.cyan,
  },
  blockIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeBadge: {
    color: COLORS.cyan,
    fontSize: 12,
    fontWeight: '800',
  },
  badgeGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityHigh: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  priorityMedium: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
  },
  priorityLow: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '800',
  },
  priorityTextHigh: {
    color: '#EF4444',
  },
  priorityTextMedium: {
    color: COLORS.cyan,
  },
  priorityTextLow: {
    color: '#10B981',
  },
  categoryBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  categoryText: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: '600',
  },
  itemTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  itemTitleCompleted: {
    textDecorationLine: 'line-through',
    color: COLORS.textMuted,
  },
  citationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  citationText: {
    color: COLORS.cyanMuted,
    fontSize: 10,
    fontStyle: 'italic',
    flex: 1,
  },
  deleteAction: {
    padding: 6,
    marginLeft: 6,
  },
  // Add Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
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
    marginBottom: 16,
  },
  modalHeading: {
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
  inlineInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  chipSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  selectorChip: {
    backgroundColor: '#070A12',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  selectorChipActive: {
    borderColor: COLORS.cyan,
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
  },
  selectorChipText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  selectorChipTextActive: {
    color: COLORS.cyan,
  },
  actionableToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    paddingVertical: 6,
  },
  actionableToggleText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  saveSubmitBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 20,
  },
  saveSubmitGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  saveSubmitText: {
    color: '#070A12',
    fontSize: 14,
    fontWeight: '800',
  },
});

