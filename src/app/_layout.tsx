import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { COLORS } from '../constants/theme';
import { SkylineHeader } from '../components/SkylineHeader';
import { PersonalKnowledgeHubModal } from '../components/PersonalKnowledgeHubModal';
import { SupabaseConfigModal } from '../components/SupabaseConfigModal';
import { ModalEvents } from '../services/modalEvents';
import { SupabaseService } from '../services/supabase';
import { SchedulerService } from '../services/scheduler';
import { UpdatesService } from '../services/updates';

export default function RootLayout() {
  const [showKnowledgeHub, setShowKnowledgeHub] = useState(false);
  const [showSupabaseConfig, setShowSupabaseConfig] = useState(false);

  useEffect(() => {
    // Initialize services & check for OTA updates
    SupabaseService.init();
    SchedulerService.start();
    UpdatesService.autoCheckOnLaunch();

    // Subscribe to modal trigger events (e.g. from elevated center button or buttons)
    const unsubHub = ModalEvents.subscribe('knowledge_hub', () => {
      setShowKnowledgeHub(true);
    });

    const unsubSupabase = ModalEvents.subscribe('supabase_config', () => {
      setShowSupabaseConfig(true);
    });

    return () => {
      unsubHub();
      unsubSupabase();
      SchedulerService.stop();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar style="light" />

        {/* Top Skyline Header with AI Badge, Real-time Cloud Sync & Person Icon */}
        <SkylineHeader
          onOpenKnowledgeHub={() => setShowKnowledgeHub(true)}
          onOpenSupabaseConfig={() => setShowSupabaseConfig(true)}
        />

        {/* Tab & Stack Navigation Host */}
        <View style={styles.contentContainer}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: COLORS.background },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </View>

        {/* Global Personal Assistant & Knowledge Hub Modal */}
        <PersonalKnowledgeHubModal
          visible={showKnowledgeHub}
          onClose={() => setShowKnowledgeHub(false)}
        />

        {/* Global Supabase & AI Settings Modal */}
        <SupabaseConfigModal
          visible={showSupabaseConfig}
          onClose={() => setShowSupabaseConfig(false)}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    width: '100%',
    height: '100%',
  },
});
