import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GRADIENTS } from '../constants/theme';

interface SkyLogoProps {
  size?: number;
  showBadge?: boolean;
}

export const SkyLogo: React.FC<SkyLogoProps> = ({ size = 44, showBadge = true }) => {
  const outerSize = size;
  const innerSize = size * 0.72;
  const coreSize = size * 0.44;

  return (
    <View style={[styles.container, { width: outerSize + (showBadge ? 24 : 0), height: outerSize }]}>
      <View style={[styles.logoWrapper, { width: outerSize, height: outerSize }]}>
        {/* Orbital Outer Halo */}
        <LinearGradient
          colors={['rgba(0, 240, 255, 0.4)', 'rgba(37, 99, 235, 0.1)', 'rgba(0, 240, 255, 0.4)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.orbitalRing, { width: outerSize, height: outerSize, borderRadius: outerSize / 2 }]}
        />

        {/* Diagonal Orbit Swoosh 1 */}
        <View 
          style={[
            styles.orbitSwoosh, 
            { 
              width: outerSize * 0.95, 
              height: outerSize * 0.38, 
              borderRadius: outerSize * 0.2,
              transform: [{ rotate: '-28deg' }]
            }
          ]} 
        />

        {/* Diagonal Orbit Swoosh 2 */}
        <View 
          style={[
            styles.orbitSwooshSecondary, 
            { 
              width: outerSize * 0.88, 
              height: outerSize * 0.32, 
              borderRadius: outerSize * 0.16,
              transform: [{ rotate: '36deg' }]
            }
          ]} 
        />

        {/* Intermediate Planet Atmosphere */}
        <LinearGradient
          colors={GRADIENTS.orbitalGlow}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[styles.atmosphere, { width: innerSize, height: innerSize, borderRadius: innerSize / 2 }]}
        >
          {/* Core Orb with Center Horizon Light */}
          <LinearGradient
            colors={['#E0F7FE', '#00C2FF', '#1D4ED8']}
            start={{ x: 0.2, y: 0.1 }}
            end={{ x: 0.8, y: 0.9 }}
            style={[styles.coreOrb, { width: coreSize, height: coreSize, borderRadius: coreSize / 2 }]}
          >
            <Ionicons name="sparkles" size={coreSize * 0.58} color="#FFFFFF" />
          </LinearGradient>
        </LinearGradient>
      </View>

      {/* Pulsing AI Badge */}
      {showBadge && (
        <LinearGradient
          colors={['#00F0FF', '#0284C7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiBadge}
        >
          <Text style={styles.aiBadgeText}>AI</Text>
        </LinearGradient>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  logoWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  orbitalRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.45)',
  },
  orbitSwoosh: {
    position: 'absolute',
    borderWidth: 1.8,
    borderColor: '#00F0FF',
    opacity: 0.8,
  },
  orbitSwooshSecondary: {
    position: 'absolute',
    borderWidth: 1.2,
    borderColor: '#818CF8',
    opacity: 0.6,
  },
  atmosphere: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
  coreOrb: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 3,
  },
  aiBadgeText: {
    color: '#070A12',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});

