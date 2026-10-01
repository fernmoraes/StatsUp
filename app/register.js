import React, { useRef, useState } from 'react';
import { Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/state/AppContext';
import { Screen, Button, Tiny } from '../src/components/ui';
import {
  AuthHeader, Field, PasswordField, FormError, SwitchLink,
} from '../src/components/authForm';
import { isValidEmail, MIN_PASSWORD } from '../src/storage/auth';
import { spacing } from '../src/theme';

export default function Register() {
  const router = useRouter();
  const { signUp } = useApp();
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const clear = (key) => setErrors((p) => ({ ...p, [key]: undefined }));

  const submit = async () => {
    Keyboard.dismiss();
    const next = {};
    if (!name.trim()) next.name = 'Como podemos te chamar?';
    if (!isValidEmail(email)) next.email = 'Digite um e-mail válido.';
    if (password.length < MIN_PASSWORD) next.password = `Use pelo menos ${MIN_PASSWORD} caracteres.`;
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const res = await signUp({ name, email, password });
      if (res.needsConfirmation) {
        // Projeto com "confirmar e-mail" ligado: entra depois de clicar no link.
        router.replace({ pathname: '/login', params: { notice: 'confirm' } });
        return;
      }
      router.replace('/'); // 1º acesso → perguntas iniciais
    } catch (e) {
      // Erro de um campo vai embaixo dele; o resto (rede, limite...) no topo.
      if (['name', 'email', 'password'].includes(e.code)) setErrors({ [e.code]: e.message });
      else setFormError(e.message || 'Não foi possível criar a conta. Tente de novo.');
      setLoading(false);
    }
  };

  return (
    <Screen>
      <AuthHeader title="Criar conta" subtitle="Leva 1 minuto. Depois disso montamos o seu radar de força." />

      <FormError message={formError} />

      <Field
        label="Nome"
        error={errors.name}
        value={name}
        onChangeText={(t) => { setName(t); clear('name'); }}
        placeholder="Seu nome"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <Field
        ref={emailRef}
        label="E-mail"
        error={errors.email}
        value={email}
        onChangeText={(t) => { setEmail(t); clear('email'); }}
        placeholder="voce@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <PasswordField
        ref={passwordRef}
        error={errors.password}
        value={password}
        onChangeText={(t) => { setPassword(t); clear('password'); }}
        placeholder={`Mínimo de ${MIN_PASSWORD} caracteres`}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      <Button
        title={loading ? 'Criando…' : 'Criar conta'}
        icon={<Ionicons name="arrow-forward" size={18} color="#fff" />}
        onPress={submit}
        disabled={loading}
        style={{ marginTop: spacing(1) }}
      />
      <Tiny style={{ textAlign: 'center', marginTop: spacing(1.5) }}>
        Seus treinos ficam salvos na sua conta e funcionam offline.
      </Tiny>

      <SwitchLink question="Já tem conta?" action="Entrar" onPress={() => router.replace('/login')} />
    </Screen>
  );
}
