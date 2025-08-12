// components/home/FlashSaleBanner.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface FlashSaleBannerProps {
  countdown: number;
  title?: string;
}

function formatCountdown(time: number): string[] {
  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  const seconds = time % 60;
  return [hours, minutes, seconds].map(unit => unit.toString().padStart(2, '0'));
}

export const FlashSaleBanner: React.FC<FlashSaleBannerProps> = ({
  countdown,
  title = "🔥 Flash Sale Ends In:",
}) => {
  return (
    <View style={styles.flashBanner}>
      <Text style={styles.flashTitle}>{title}</Text>
      <View style={styles.timeBoxes}>
        {formatCountdown(countdown).map((unit, i) => (
          <View key={i} style={styles.timeBox}>
            <Text style={styles.timeText}>{unit}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  flashBanner: {
    backgroundColor: '#FF4444',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 40,
  },
  flashTitle: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  timeBoxes: {
    flexDirection: 'row',
  },
  timeBox: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 20,
    alignItems: 'center',
    marginLeft: 4,
  },
  timeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});