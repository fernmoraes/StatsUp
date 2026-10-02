import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Linking } from 'react-native';
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
import { DialogProvider, useDialog } from '../src/components/dialog';
import UpdateRequired from '../src/components/UpdateRequired';
import { checkAppVersion } from '../src/services/appVersion';
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
        <DialogProvider>
          <RootContent fontsReady={fontsReady} />
        </DialogProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}

// O app monta por baixo enquanto a abertura animada roda por cima. A abertura
// só sai quando as fontes e os dados salvos (perfil + treinos) carregaram.
function RootContent({ fontsReady }) {
  const { ready } = useApp();
  const { confirm } = useDialog();
  const [showSplash, setShowSplash] = useState(true);
  // Versão: null enquanto confere; depois { status, info } (ver services/appVersion).
  const [version, setVersion] = useState(null);
  const offeredUpdate = useRef(false);

  const runVersionCheck = useCallback(async () => {
    setVersion(await checkAppVersion());
  }, []);
  useEffect(() => {
    runVersionCheck();
  }, [runVersionCheck]);

  // O splash nativo some assim que a abertura (idêntica a ele) desenhou.
  const hideNativeSplash = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  const onSplashDone = useCallback(() => setShowSplash(false), []);

  // Versão nova (sem ser obrigatória): oferece uma vez, depois da abertura.
  useEffect(() => {
    if (showSplash || offeredUpdate.current || !version || version.status !== 'update-available') return;
    offeredUpdate.current = true;
    const { info } = version;
    confirm({
      title: 'Nova versão',
      message: `O StatsUp ${info.latestVersion || ''} já está disponível. Baixe para ter as novidades e correções.`,
      icon: 'cloud-download-outline',
      confirmText: 'Baixar',
      confirmIcon: 'download-outline',
      cancelText: 'Depois',
    }).then((ok) => {
      if (ok && info.downloadUrl) Linking.openURL(info.downloadUrl);
    });
  }, [showSplash, version, confirm]);

  const blocked = version && version.status === 'outdated';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Versão desativada: só a tela de atualização, sem acesso ao app. */}
      {fontsReady && blocked && <UpdateRequired info={version.info} onRetry={runVersionCheck} />}
      {fontsReady && !blocked && (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'fade',
          }}
        />
      )}
      {showSplash && (
        <AnimatedSplash ready={fontsReady && ready && !!version} onLayout={hideNativeSplash} onDone={onSplashDone} />
      )}
    </View>
  );
}
