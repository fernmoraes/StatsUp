import React from 'react';
import { View } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { useApp } from '../../src/state/AppContext';
import Tutorial from '../../src/components/Tutorial';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../src/theme';

// Ícone da aba + traço vermelho em cima quando ativa (indica a página atual).
function icon(name) {
  return ({ color, size, focused }) => (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          position: 'absolute',
          top: -10,
          width: 22,
          height: 3,
          borderRadius: 2,
          backgroundColor: focused ? colors.primary : 'transparent',
        }}
      />
      <Ionicons name={focused ? name : `${name}-outline`} color={color} size={size} />
    </View>
  );
}

export default function TabsLayout() {
  // Altura real da barra do sistema (gestos/3 botões). Antes era fixa e, com o
  // Android edge-to-edge, a barra do sistema ficava por cima das abas.
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 8);
  // Sem conta → login; conta sem perfil (ex.: dados apagados na nuvem) → perguntas.
  const { ready, user, profile, tutorialVisible, closeTutorial } = useApp();
  // Espera a sessão salva ser restaurada (abrir direto numa aba, recarregar…);
  // sem isso mandaria para o login mesmo com a conta salva.
  if (!ready) return null;
  if (!user) return <Redirect href="/login" />;
  if (!profile) return <Redirect href="/onboarding" />;
  return (
    <>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.bg2,
          borderTopColor: colors.glassBorder,
          borderTopWidth: 1,
          height: 60 + bottom,
          paddingTop: 8,
          paddingBottom: bottom,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          lineHeight: 15,
          fontFamily: fonts.cond,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Radar', tabBarIcon: icon('pulse') }} />
      <Tabs.Screen name="log" options={{ title: 'Treinar', tabBarIcon: icon('barbell') }} />
      <Tabs.Screen name="history" options={{ title: 'Histórico', tabBarIcon: icon('time') }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: icon('person') }} />
    </Tabs>
    {/* 1ª vez depois das perguntas iniciais (ou "Ver tutorial" no Perfil) */}
    <Tutorial visible={tutorialVisible} onDone={closeTutorial} />
    </>
  );
}
