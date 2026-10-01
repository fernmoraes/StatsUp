import React from 'react';
import { Redirect } from 'expo-router';
import { useApp } from '../src/state/AppContext';
import { Loader } from '../src/components/ui';

// Gate de entrada: login → perguntas iniciais (1º acesso) → app.
export default function Index() {
  const { ready, user, profile } = useApp();
  if (!ready) return <Loader />;
  if (!user) return <Redirect href="/login" />;
  if (!profile) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
