import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/theme';
import { StorageService } from '../services/storage';
import { SupabaseService } from '../services/supabase';
import { UpdatesService } from '../services/updates';

interface SupabaseConfigModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({ visible, onClose }) => {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  const [loading, setLoading] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');

  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  const loadSettings = async () => {
    const s = await StorageService.getSettings();
    setSupabaseUrl(s.supabaseUrl || '');
    setSupabaseAnonKey(s.supabaseAnonKey || '');
    setGeminiApiKey(s.geminiApiKey || '');
    setGeminiModel(s.geminiModel || 'gemini-2.5-flash');
    setSyncStatusMsg('');
  };

  const handleSaveAndTest = async () => {
    setLoading(true);
    setSyncStatusMsg('Verifying configuration...');
    try {
      const current = await StorageService.getSettings();
      const updated = {
        ...current,
        supabaseUrl: supabaseUrl.trim(),
        supabaseAnonKey: supabaseAnonKey.trim(),
        geminiApiKey: geminiApiKey.trim(),
        geminiModel: geminiModel.trim(),
      };
      await StorageService.saveSettings(updated);

      if (supabaseUrl && supabaseAnonKey) {
        const ok = await SupabaseService.reconfigure(supabaseUrl.trim(), supabaseAnonKey.trim());
        if (ok) {
          setSyncStatusMsg('Connected to Supabase successfully!');
        } else {
          setSyncStatusMsg('Saved, but Supabase connection ping had an issue.');
        }
      } else {
        setSyncStatusMsg('Settings saved. Supabase set to offline/local mode.');
      }
    } catch (e: any) {
      setSyncStatusMsg(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerSync = async () => {
    setLoading(true);
    setSyncStatusMsg('Initiating bi-directional cloud sync...');
    try {
      const res = await SupabaseService.triggerFullSync();
      setSyncStatusMsg(res.message);
    } catch (e: any) {
      setSyncStatusMsg(`Sync error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleGroup}>
              <Ionicons name="cloud" size={22} color={COLORS.cyan} />
              <Text style={styles.modalTitle}>Cloud & AI Engine Settings</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
            <Text style={styles.sectionNotice}>
              Sky operates with full offline-first resilience. Connect your Supabase project for instant cloud sync across devices and your Google Gemini key for intelligent timetable generation.
            </Text>

            {/* Supabase URL */}
            <Text style={styles.fieldLabel}>Supabase Project URL</Text>
            <TextInput
              style={styles.input}
              placeholder="https://xyzcompany.supabase.co"
              placeholderTextColor={COLORS.textMuted}
              value={supabaseUrl}
              onChangeText={setSupabaseUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Supabase Anon Key */}
            <Text style={styles.fieldLabel}>Supabase Anon / Public Key</Text>
            <TextInput
              style={styles.input}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
              placeholderTextColor={COLORS.textMuted}
              value={supabaseAnonKey}
              onChangeText={setSupabaseAnonKey}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Gemini API Key */}
            <Text style={styles.fieldLabel}>Google Gemini API Key</Text>
            <TextInput
              style={styles.input}
              placeholder="AIzaSy..."
              placeholderTextColor={COLORS.textMuted}
              value={geminiApiKey}
              onChangeText={setGeminiApiKey}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Gemini Model Selector */}
            <Text style={styles.fieldLabel}>Gemini Model</Text>
            <View style={styles.modelRow}>
              {['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.modelChip, geminiModel === m && styles.modelChipActive]}
                  onPress={() => setGeminiModel(m)}
                >
                  <Text style={[styles.modelChipText, geminiModel === m && styles.modelChipTextActive]}>
                    {m.replace('gemini-', '')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {syncStatusMsg ? (
              <View style={styles.statusBox}>
                <Text style={styles.statusBoxText}>{syncStatusMsg}</Text>
              </View>
            ) : null}

            {/* Action Buttons */}
            <View style={styles.buttonStack}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleSaveAndTest}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#00F0FF', '#0284C7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.btnGradient}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#070A12" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={18} color="#070A12" />
                      <Text style={styles.btnTextPrimary}>Save & Connect</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleTriggerSync}
                disabled={loading || !supabaseUrl}
              >
                <Ionicons name="sync" size={18} color={COLORS.cyan} />
                <Text style={styles.btnTextSecondary}>Trigger Cloud Sync Now</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
    maxHeight: Platform.OS === 'web' ? '85%' : '85%',
    width: '100%',
    maxWidth: 620,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.2)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 20,
  },
  sectionNotice: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  fieldLabel: {
    color: COLORS.cyan,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.textPrimary,
    fontSize: 14,
    marginBottom: 16,
  },
  modelRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  modelChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: '#0F172A',
    alignItems: 'center',
  },
  modelChipActive: {
    borderColor: COLORS.cyan,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
  },
  modelChipText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  modelChipTextActive: {
    color: COLORS.cyan,
  },
  statusBox: {
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  statusBoxText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    textAlign: 'center',
  },
  buttonStack: {
    gap: 12,
    marginTop: 8,
  },
  primaryBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  btnTextPrimary: {
    color: '#070A12',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cyan,
    gap: 8,
    backgroundColor: 'rgba(0, 240, 255, 0.06)',
  },
  btnTextSecondary: {
    color: COLORS.cyan,
    fontSize: 14,
    fontWeight: '700',
  },
});

