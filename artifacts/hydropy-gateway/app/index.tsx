import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useGateway } from '@/context/GatewayContext';
import { useColors } from '@/hooks/useColors';

export default function IndexScreen() {
  const colors = useColors();
  const { config } = useGateway();
  const router = useRouter();

  useEffect(() => {
    // Give context time to load from AsyncStorage before redirecting
    const timer = setTimeout(() => {
      if (config) {
        router.replace('/gateway');
      } else {
        router.replace('/setup');
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [config, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.logo, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
        HYDROPY_
      </Text>
      <Text style={[styles.sub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
        GATEWAY NODE
      </Text>
      <ActivityIndicator
        color={colors.primary}
        size="small"
        style={styles.spinner}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logo: {
    fontSize: 28,
    letterSpacing: 4,
  },
  sub: {
    fontSize: 11,
    letterSpacing: 6,
  },
  spinner: {
    marginTop: 32,
  },
});
