import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/theme';
import { SkyLogo } from '../../components/SkyLogo';
import { ModalEvents } from '../../services/modalEvents';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const bottomPadding = Math.max(insets.bottom, isWeb ? 10 : 8);
  const barHeight = (isWeb ? 66 : 60) + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            height: barHeight,
            paddingBottom: bottomPadding,
            left: 0,
            right: 0,
            width: '100%',
            bottom: 0,
          },
        ],
        tabBarActiveTintColor: COLORS.cyan,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      {/* Tab 1: Schedule */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconFocused]}>
              <Ionicons
                name={focused ? 'calendar' : 'calendar-outline'}
                size={22}
                color={focused ? COLORS.cyan : COLORS.textMuted}
              />
            </View>
          ),
        }}
      />

      {/* Tab 2: Automated */}
      <Tabs.Screen
        name="automated"
        options={{
          title: 'Automated',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconFocused]}>
              <Ionicons
                name={focused ? 'flash' : 'flash-outline'}
                size={22}
                color={focused ? COLORS.cyan : COLORS.textMuted}
              />
            </View>
          ),
        }}
      />

      {/* Center Floating Elevated Action Button: Personal Knowledge Hub */}
      <Tabs.Screen
        name="hub-action"
        options={{
          title: '',
          tabBarButton: () => (
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.floatingCenterContainer}
              onPress={() => ModalEvents.open('knowledge_hub')}
            >
              <LinearGradient
                colors={['#00F0FF', '#0284C7', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.floatingCenterButton}
              >
                <SkyLogo size={32} showBadge={false} />
              </LinearGradient>
              <Text style={styles.floatingCenterLabel}>KNOWLEDGE</Text>
            </TouchableOpacity>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            ModalEvents.open('knowledge_hub');
          },
        }}
      />

      {/* Tab 3: Replies */}
      <Tabs.Screen
        name="replies"
        options={{
          title: 'Replies',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconFocused]}>
              <Ionicons
                name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
                size={22}
                color={focused ? COLORS.cyan : COLORS.textMuted}
              />
            </View>
          ),
        }}
      />

      {/* Tab 4: Sky AI */}
      <Tabs.Screen
        name="ai"
        options={{
          title: 'Sky AI',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconFocused]}>
              <Ionicons
                name={focused ? 'sparkles' : 'sparkles-outline'}
                size={22}
                color={focused ? COLORS.cyan : COLORS.textMuted}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.backgroundCard,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 240, 255, 0.25)',
    height: Platform.OS === 'ios' ? 88 : 72,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 12,
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFocused: {
    transform: [{ scale: 1.05 }],
  },
  floatingCenterContainer: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
    width: 68,
  },
  floatingCenterButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#070A12',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 10,
  },
  floatingCenterLabel: {
    color: COLORS.cyan,
    fontSize: 8,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: 0.6,
  },
});
