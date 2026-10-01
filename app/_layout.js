import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
} from '@expo-google-fonts/barlow';
import {
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
  BarlowCondensed_800ExtraBold,
  BarlowCondensed_900Black,
} from '@expo-google-fonts/barlow-condensed';
import { AppProvider, useApp } from '../src/state/AppContext';
import AnimatedSplash from '../src/components/AnimatedSplash';
import { colors } from '../src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold,
    BarlowCondensed_900Black,
  });

  const fontsReady = loaded || !!error;

  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="light" />
        {/* Android: esconde a barra de navegação do sistema. Deslizar de baixo
            mostra ela por cima do app e ela some sozinha depois de alguns segundos. */}
        <NavigationBar hidden style="light" />
        <RootContent fontsReady={fontsReady} />
      </AppProvider>
    </SafeAreaProvider>
  );
}

// O app monta por baixo enquanto a abertura animada roda por cima. A abertura
// só sai quando as fontes e os dados salvos (perfil + treinos) carregaram.
function RootContent({ fontsReady }) {
  const { ready } = useApp();
  const [showSplash, setShowSplash] = useState(true);
  // O splash nativo some assim que a abertura (idêntica a ele) desenhou.
  const hideNativeSplash = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  const onSplashDone = useCallback(() => setShowSplash(false), []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {fontsReady && (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'fade',
          }}
        />
      )}
      {showSplash && (
        <AnimatedSplash ready={fontsReady && ready} onLayout={hideNativeSplash} onDone={onSplashDone} />
      )}
    </View>
  );
}
