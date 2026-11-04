import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { COLORS, GRADIENTS } from '../constants/theme';
import { KnowledgeItem, ScheduleItem } from '../types';
import { StorageService } from '../services/storage';
import { SupabaseService } from '../services/supabase';
import { GeminiService } from '../services/gemini';

interface PersonalKnowledgeHubModalProps {
  visible: boolean;
  onClose: () => void;
  onScheduleGenerated?: (newItems: ScheduleItem[]) => void;
}

export const PersonalKnowledgeHubModal: React.FC<PersonalKnowledgeHubModalProps> = ({
  visible,
  onClose,
  onScheduleGenerated,
}) => {
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [showRoutineModal, setShowRoutineModal] = useState(false);

  // Daily routine modal inputs
  const [routineTitle, setRoutineTitle] = useState('');
  const [routineDetails, setRoutineDetails] = useState('');

  useEffect(() => {
    if (visible) {
      loadKnowledge();
    }
  }, [visible]);

  const loadKnowledge = async () => {
    setLoading(true);
    const items = await StorageService.getKnowledge();
    setKnowledgeList(items);
    setLoading(false);
  };

  // 1. Photo/Image Picker
  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Please enable photo library access to upload schedule photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `Photo_Schedule_${Date.now()}.jpg`;
        
        const newItem: KnowledgeItem = {
          id: `know_img_${Date.now()}`,
          title: fileName,
          type: 'photo',
          content: `Visual document image captured: ${fileName}. Contains visual timetable or project milestone board.`,
          fileUri: asset.uri,
          fileName: fileName,
          fileSize: asset.fileSize ? `${Math.round(asset.fileSize / 1024)} KB` : undefined,
          createdAt: new Date().toISOString(),
        };

        const updated = await StorageService.saveKnowledgeItem(newItem);
        setKnowledgeList(updated);
        await SupabaseService.syncKnowledgeItem(newItem);
      }
    } catch (e: any) {
      Alert.alert('Image Error', e.message || 'Could not pick image');
    }
  };

  // 2. Document/PDF Picker
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const doc = result.assets[0];
        let fileContent = `Document: ${doc.name}. Syllabus / Project Specification / Itinerary.`;

        // If it's a text file, attempt to read actual content
        if (doc.mimeType === 'text/plain' && doc.uri) {
          try {
            const raw = await FileSystem.readAsStringAsync(doc.uri);
            if (raw) fileContent = raw;
          } catch {
            // Keep default descriptor
          }
        }

        const newItem: KnowledgeItem = {
          id: `know_doc_${Date.now()}`,
          title: doc.name,
          type: 'document',
          content: fileContent,
          fileUri: doc.uri,
          fileName: doc.name,
          fileSize: doc.size ? `${Math.round(doc.size / 1024)} KB` : undefined,
          createdAt: new Date().toISOString(),
        };

        const updated = await StorageService.saveKnowledgeItem(newItem);
        setKnowledgeList(updated);
        await SupabaseService.syncKnowledgeItem(newItem);
      }
    } catch (e: any) {
      Alert.alert('Document Error', e.message || 'Could not pick document');
    }
  };

  // 3. Save Daily Routine & Habit Note
  const handleSaveRoutine = async () => {
    if (!routineTitle.trim()) {
      Alert.alert('Title Required', 'Please enter a title for your routine or habit (e.g. "Morning Deep Work", "Study Schedule").');
      return;
    }

    const newItem: KnowledgeItem = {
      id: `know_routine_${Date.now()}`,
      title: routineTitle.trim(),
      type: 'routine',
      content: routineDetails.trim() || routineTitle.trim(),
      createdAt: new Date().toISOString(),
    };

    const updated = await StorageService.saveKnowledgeItem(newItem);
    setKnowledgeList(updated);
    await SupabaseService.syncKnowledgeItem(newItem);

    setRoutineTitle('');
    setRoutineDetails('');
    setShowRoutineModal(false);
  };

  // Delete Knowledge Item
  const handleDeleteItem = async (id: string, title: string) => {
    Alert.alert(
      'Remove File',
      `Are you sure you want to delete "${title}" from your personal knowledge base?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = await StorageService.deleteKnowledgeItem(id);
            setKnowledgeList(updated);
            await SupabaseService.deleteKnowledgeItem(id);
          },
        },
      ]
    );
  };

  // AI Plan Generation: Powered by Gemini
  const handleGenerateAIPlan = async () => {
    if (knowledgeList.length === 0) {
      Alert.alert(
        'Upload Knowledge First',
        'Please upload at least one photo, syllabus PDF, or daily routine habit note before generating your AI schedule plan.'
      );
      return;
    }

    setIsGeneratingPlan(true);
    try {
      const generated = await GeminiService.generateScheduleFromKnowledge(knowledgeList);
      
      const newScheduleItems: ScheduleItem[] = generated.items.map((item, index) => ({
        id: `sched_${Date.now()}_${index}`,
        time: item.time,
        timestamp: Date.now() + index * 3600000,
        title: item.title,
        durationMinutes: item.durationMinutes || 45,
        category: item.category || 'Deep Work',
        priority: item.priority || 'Medium',
        sourceCitation: item.sourceCitation,
        completed: false,
        isActionableTask: item.isActionableTask ?? true,
        notes: item.notes,
        createdAt: new Date().toISOString(),
      }));

      // Persist to local storage and sync to Supabase
      const fullList = await StorageService.addScheduleItems(newScheduleItems);
      await SupabaseService.syncSchedule(fullList);

      if (onScheduleGenerated) {
        onScheduleGenerated(newScheduleItems);
      }

      Alert.alert(
        'Schedule Generated by Sky AI',
        `Generated ${newScheduleItems.length} timetable blocks and priority tasks derived strictly from your uploaded files and habits.`,
        [
          {
            text: 'View Schedule',
            onPress: () => {
              onClose();
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('AI Plan Generation Error', e.message || 'Failed to synthesize schedule');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleGroup}>
              <View style={styles.iconCircle}>
                <Ionicons name="sparkles" size={18} color="#070A12" />
              </View>
              <View>
                <Text style={styles.modalTitle}>Personal Assistant & Knowledge Hub</Text>
                <Text style={styles.modalSubtitle}>Supabase Persistent Cloud Storage</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Upload Action Strip */}
          <View style={styles.uploadStrip}>
            <Text style={styles.uploadPrompt}>ADD GROUNDING KNOWLEDGE:</Text>
            <View style={styles.actionButtonsRow}>
              {/* Photo Upload */}
              <TouchableOpacity style={styles.uploadTile} onPress={handlePickImage}>
                <LinearGradient colors={['#1E293B', '#111827']} style={styles.tileGradient}>
                  <Ionicons name="image-outline" size={20} color={COLORS.cyan} />
                  <Text style={styles.tileText}>Photo / Spec</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Document / PDF Upload */}
              <TouchableOpacity style={styles.uploadTile} onPress={handlePickDocument}>
                <LinearGradient colors={['#1E293B', '#111827']} style={styles.tileGradient}>
                  <Ionicons name="document-text-outline" size={20} color={COLORS.skyBlue} />
                  <Text style={styles.tileText}>Document/PDF</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Routine & Habits */}
              <TouchableOpacity style={styles.uploadTile} onPress={() => setShowRoutineModal(true)}>
                <LinearGradient colors={['#1E293B', '#111827']} style={styles.tileGradient}>
                  <Ionicons name="alarm-outline" size={20} color={COLORS.purple} />
                  <Text style={styles.tileText}>Daily Routine</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Knowledge Items List */}
          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 20 }}>
            <View style={styles.listHeaderRow}>
              <Text style={styles.sectionHeader}>
                Stored Files & Routine Notes ({knowledgeList.length})
              </Text>
              <Text style={styles.cleanStateNote}>Clean slate by default</Text>
            </View>

            {loading ? (
              <ActivityIndicator size="small" color={COLORS.cyan} style={{ marginVertical: 30 }} />
            ) : knowledgeList.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="folder-open-outline" size={48} color={COLORS.textDisabled} />
                <Text style={styles.emptyTitle}>No Knowledge Uploaded</Text>
                <Text style={styles.emptySubtitle}>
                  Sky starts without any placeholder tasks so you begin with a clean slate. Upload your syllabus, project specs, photos, or daily routines to generate an intelligent timetable!
                </Text>
              </View>
            ) : (
              knowledgeList.map((item) => (
                <View key={item.id} style={styles.knowledgeCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.typeBadge}>
                      <Ionicons
                        name={
                          item.type === 'photo'
                            ? 'image'
                            : item.type === 'document'
                            ? 'document-text'
                            : 'alarm'
                        }
                        size={14}
                        color={COLORS.cyan}
                      />
                      <Text style={styles.typeBadgeText}>
                        {item.type.toUpperCase()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteItem(item.id, item.title)}
                      style={styles.deleteBtn}
                    >
                      <Ionicons name="trash-outline" size={16} color={COLORS.urgent} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardContent} numberOfLines={3}>
                    {item.content}
                  </Text>

                  {item.fileSize && (
                    <Text style={styles.fileSizeText}>Size: {item.fileSize}</Text>
                  )}
                </View>
              ))
            )}
          </ScrollView>

          {/* AI Plan Generation Action Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.generateBtn}
              onPress={handleGenerateAIPlan}
              disabled={isGeneratingPlan || knowledgeList.length === 0}
            >
              <LinearGradient
                colors={
                  knowledgeList.length === 0
                    ? ['#334155', '#1E293B']
                    : GRADIENTS.skyPrimary
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.generateBtnGradient}
              >
                {isGeneratingPlan ? (
                  <>
                    <ActivityIndicator size="small" color="#070A12" />
                    <Text style={styles.generateBtnText}>Synthesizing with Gemini 2.5 Flash...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={18} color={knowledgeList.length === 0 ? COLORS.textMuted : '#070A12'} />
                    <Text
                      style={[
                        styles.generateBtnText,
                        knowledgeList.length === 0 && { color: COLORS.textMuted },
                      ]}
                    >
                      Generate AI Timetable & Tasks
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      {/* Routine & Habits Entry Modal Form */}
      <Modal visible={showRoutineModal} transparent animationType="fade">
        <View style={styles.routineOverlay}>
          <View style={styles.routineCard}>
            <View style={styles.headerRow}>
              <Text style={styles.routineTitle}>Add Daily Routine / Habit Note</Text>
              <TouchableOpacity onPress={() => setShowRoutineModal(false)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Routine / Habit Title</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Morning Deep Work Block, Wake-up 6:30 AM"
              placeholderTextColor={COLORS.textMuted}
              value={routineTitle}
              onChangeText={setRoutineTitle}
            />

            <Text style={styles.inputLabel}>Specific Times & Details</Text>
            <TextInput
              style={[styles.textInput, { height: 90, textAlignVertical: 'top' }]}
              placeholder="e.g. 09:00 AM - 12:00 PM: Focus on software engineering. No phone notifications."
              placeholderTextColor={COLORS.textMuted}
              value={routineDetails}
              onChangeText={setRoutineDetails}
              multiline
            />

            <View style={styles.routineActionRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowRoutineModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveRoutineBtn}
                onPress={handleSaveRoutine}
              >
                <LinearGradient
                  colors={GRADIENTS.floatingButton}
                  style={styles.saveGradient}
                >
                  <Text style={styles.saveBtnText}>Save Routine</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 20 : 0,
  },
  modalCard: {
    backgroundColor: COLORS.backgroundCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: Platform.OS === 'web' ? 24 : 0,
    borderBottomRightRadius: Platform.OS === 'web' ? 24 : 0,
    height: Platform.OS === 'web' ? '84%' : '88%',
    width: '100%',
    maxWidth: 720,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.cyan,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: COLORS.cyan,
    fontSize: 11,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  uploadStrip: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  uploadPrompt: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  uploadTile: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tileGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    borderRadius: 12,
  },
  tileText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeader: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  cleanStateNote: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 10,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  knowledgeCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
  },
  typeBadgeText: {
    color: COLORS.cyan,
    fontSize: 10,
    fontWeight: '800',
  },
  deleteBtn: {
    padding: 4,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardContent: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  fileSizeText: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 6,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    backgroundColor: COLORS.backgroundCard,
  },
  generateBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  generateBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  generateBtnText: {
    color: '#070A12',
    fontSize: 15,
    fontWeight: '800',
  },
  // Routine Modal
  routineOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  routineCard: {
    width: '100%',
    backgroundColor: COLORS.backgroundCardElevated,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },
  routineTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  inputLabel: {
    color: COLORS.cyan,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    padding: 12,
    color: COLORS.textPrimary,
    fontSize: 13,
  },
  routineActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontWeight: '700',
    fontSize: 13,
  },
  saveRoutineBtn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  saveGradient: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  saveBtnText: {
    color: '#070A12',
    fontWeight: '800',
    fontSize: 13,
  },
});

