// Tela que bloqueia uma versão desativada: só deixa baixar a nova.
import React, { useState } from 'react';
import { View, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, BrandMark, Display, Body, Small, Button, Label } from './ui';
import { colors, radius, spacing, hexA } from '../theme';
import { currentVersionName } from '../services/appVersion';

export default function UpdateRequired({ info, onRetry }) {
  const [checking, setChecking] = useState(false);
  const retry = async () => {
    setChecking(true);
    await onRetry();
    setChecking(false);
  };

  return (
    <Screen contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <BrandMark size={28} boxed />
      <View style={styles.iconTile}>
        <Ionicons name="cloud-download-outline" size={30} color={colors.primaryBright} />
      </View>
      <Label>Versão desativada</Label>
      <Display style={{ fontSize: 44, lineHeight: 46, textTransform: 'uppercase', marginTop: spacing(0.5) }}>
        Atualize o StatsUp
      </Display>
      <Body style={{ color: colors.textDim, marginTop: spacing(1.25) }}>
        Esta versão ({currentVersionName()}) não é mais suportada. Baixe a versão
        {info && info.latestVersion ? ` ${info.latestVersion}` : ' mais nova'} para continuar. Seus treinos
        continuam salvos na sua conta.
      </Body>

      <Button
        title="Baixar atualização"
        icon={<Ionicons name="download-outline" size={18} color="#fff" />}
        onPress={() => info && info.downloadUrl && Linking.openURL(info.downloadUrl)}
        style={{ marginTop: spacing(3) }}
      />
      <Button
        title={checking ? 'Verificando…' : 'Já atualizei'}
        variant="ghost"
        onPress={retry}
        disabled={checking}
        style={{ marginTop: spacing(1) }}
      />
      <Small style={{ textAlign: 'center', marginTop: spacing(2), color: colors.textFaint }}>
        Depois de instalar o APK novo, abra o app de novo.
      </Small>
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconTile: {
    width: 60, height: 60, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: hexA(colors.primary, 0.14), marginTop: spacing(4), marginBottom: spacing(2),
  },
});
