import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

interface PreciseTimePickerProps {
  hour: number; // 1 - 12
  minute: number; // 0 - 59
  period: 'AM' | 'PM';
  onChange: (hour: number, minute: number, period: 'AM' | 'PM') => void;
}

export const PreciseTimePicker: React.FC<PreciseTimePickerProps> = ({
  hour,
  minute,
  period,
  onChange,
}) => {
  // Steppers
  const incrementHour = () => {
    const next = hour >= 12 ? 1 : hour + 1;
    onChange(next, minute, period);
  };

  const decrementHour = () => {
    const next = hour <= 1 ? 12 : hour - 1;
    onChange(next, minute, period);
  };

  const incrementMinute = (step = 1) => {
    let next = minute + step;
    if (next >= 60) next = next % 60;
    onChange(hour, next, period);
  };

  const decrementMinute = (step = 1) => {
    let next = minute - step;
    if (next < 0) next = 60 + next;
    onChange(hour, next, period);
  };

  // Quick interval presets (+5m, +15m, +30m, 9 AM, 2 PM, 6 PM)
  const applyRelativeMinutes = (offset: number) => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + offset);
    let h = now.getHours();
    const m = now.getMinutes();
    const p: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    onChange(h, m, p);
  };

  const setSpecificTime = (targetHour: number, targetMinute: number, targetPeriod: 'AM' | 'PM') => {
    onChange(targetHour, targetMinute, targetPeriod);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>PRECISE TIMING SCHEDULER</Text>

      {/* Main Digital Clock Display with Steppers */}
      <View style={styles.clockRow}>
        {/* Hour Column */}
        <View style={styles.timeDigitBlock}>
          <TouchableOpacity onPress={incrementHour} style={styles.arrowButton}>
            <Ionicons name="chevron-up" size={20} color={COLORS.cyan} />
          </TouchableOpacity>
          <View style={styles.digitBox}>
            <Text style={styles.digitText}>{hour.toString().padStart(2, '0')}</Text>
          </View>
          <TouchableOpacity onPress={decrementHour} style={styles.arrowButton}>
            <Ionicons name="chevron-down" size={20} color={COLORS.cyan} />
          </TouchableOpacity>
          <Text style={styles.unitLabel}>HOUR</Text>
        </View>

        <Text style={styles.colonText}>:</Text>

        {/* Minute Column */}
        <View style={styles.timeDigitBlock}>
          <TouchableOpacity onPress={() => incrementMinute(1)} style={styles.arrowButton}>
            <Ionicons name="chevron-up" size={20} color={COLORS.cyan} />
          </TouchableOpacity>
          <View style={styles.digitBox}>
            <Text style={styles.digitText}>{minute.toString().padStart(2, '0')}</Text>
          </View>
          <TouchableOpacity onPress={() => decrementMinute(1)} style={styles.arrowButton}>
            <Ionicons name="chevron-down" size={20} color={COLORS.cyan} />
          </TouchableOpacity>
          <Text style={styles.unitLabel}>MINUTE</Text>
        </View>

        {/* AM / PM Segmented Control */}
        <View style={styles.periodBlock}>
          <TouchableOpacity
            style={[styles.periodBtn, period === 'AM' && styles.periodBtnActive]}
            onPress={() => onChange(hour, minute, 'AM')}
          >
            <Text style={[styles.periodText, period === 'AM' && styles.periodTextActive]}>AM</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodBtn, period === 'PM' && styles.periodBtnActive]}
            onPress={() => onChange(hour, minute, 'PM')}
          >
            <Text style={[styles.periodText, period === 'PM' && styles.periodTextActive]}>PM</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Fine Steppers (+/- 1 min, +/- 5 min) */}
      <View style={styles.fineSteppersRow}>
        <TouchableOpacity style={styles.fineChip} onPress={() => decrementMinute(5)}>
          <Text style={styles.fineChipText}>-5m</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.fineChip} onPress={() => decrementMinute(1)}>
          <Text style={styles.fineChipText}>-1m</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.fineChip} onPress={() => incrementMinute(1)}>
          <Text style={styles.fineChipText}>+1m</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.fineChip} onPress={() => incrementMinute(5)}>
          <Text style={styles.fineChipText}>+5m</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Interval Chips */}
      <View style={styles.quickIntervalRow}>
        <TouchableOpacity style={styles.intervalChip} onPress={() => applyRelativeMinutes(5)}>
          <Text style={styles.intervalChipText}>In 5 mins</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.intervalChip} onPress={() => applyRelativeMinutes(15)}>
          <Text style={styles.intervalChipText}>In 15 mins</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.intervalChip} onPress={() => applyRelativeMinutes(30)}>
          <Text style={styles.intervalChipText}>In 30 mins</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.intervalChip} onPress={() => setSpecificTime(9, 0, 'AM')}>
          <Text style={styles.intervalChipText}>09:00 AM</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.intervalChip} onPress={() => setSpecificTime(2, 30, 'PM')}>
          <Text style={styles.intervalChipText}>02:30 PM</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
    padding: 16,
    marginVertical: 10,
  },
  label: {
    color: COLORS.cyan,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  clockRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  timeDigitBlock: {
    alignItems: 'center',
  },
  arrowButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  digitBox: {
    backgroundColor: '#070A12',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.4)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 64,
    alignItems: 'center',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  digitText: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  colonText: {
    color: COLORS.cyan,
    fontSize: 26,
    fontWeight: '900',
    paddingBottom: 22,
  },
  unitLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.8,
  },
  periodBlock: {
    backgroundColor: '#070A12',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
    padding: 3,
    marginLeft: 6,
    marginBottom: 18,
    gap: 4,
  },
  periodBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  periodBtnActive: {
    backgroundColor: COLORS.cyan,
  },
  periodText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  periodTextActive: {
    color: '#070A12',
  },
  fineSteppersRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 14,
  },
  fineChip: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.2)',
  },
  fineChipText: {
    color: COLORS.cyan,
    fontSize: 11,
    fontWeight: '700',
  },
  quickIntervalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    justifyContent: 'center',
  },
  intervalChip: {
    backgroundColor: '#0D1527',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  intervalChipText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
});

