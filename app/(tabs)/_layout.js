import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../src/theme';

function icon(name) {
  return ({ color, size, focused }) => (
    <Ionicons name={focused ? name : `${name}-outline`} color={color} size={size} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryBright,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.bg2,
          borderTopColor: colors.glassBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 66,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontFamily: fonts.semibold, marginTop: 2 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Radar', tabBarIcon: icon('pulse') }} />
      <Tabs.Screen name="log" options={{ title: 'Treinar', tabBarIcon: icon('barbell') }} />
      <Tabs.Screen name="history" options={{ title: 'Histórico', tabBarIcon: icon('time') }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: icon('person') }} />
    </Tabs>
  );
}
