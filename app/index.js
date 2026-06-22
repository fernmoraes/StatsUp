import React from 'react';
import { Redirect } from 'expo-router';
import { useApp } from '../src/state/AppContext';
import { Loader } from '../src/components/ui';

// Gate de entrada: decide onboarding vs app principal.
export default function Index() {
  const { ready, profile } = useApp();
  if (!ready) return <Loader />;
  if (!profile) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
