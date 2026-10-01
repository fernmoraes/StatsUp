import React, { useEffect, useRef, useState } from 'react';
import { Keyboard } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/state/AppContext';
import { Screen, Button } from '../src/components/ui';
import {
  AuthHeader, Field, PasswordField, Checkbox, FormError, FormNotice, SwitchLink,
} from '../src/components/authForm';
import { getLastEmail, isValidEmail } from '../src/services/auth';

export default function Login() {
  const router = useRouter();
  const { notice } = useLocalSearchParams();
  const { signIn } = useApp();
  const passwordRef = useRef(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  // Preenche o e-mail da última conta usada neste aparelho.
  useEffect(() => {
    getLastEmail().then((e) => e && setEmail((cur) => cur || e));
  }, []);

  const submit = async () => {
    Keyboard.dismiss();
    const next = {};
    if (!isValidEmail(email)) next.email = 'Digite um e-mail válido.';
    if (!password) next.password = 'Digite sua senha.';
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await signIn({ email, password, remember });
      router.replace('/'); // o gate decide: perguntas iniciais ou app
    } catch (e) {
      setFormError(e.message || 'Não foi possível entrar. Tente de novo.');
      setLoading(false);
    }
  };

  return (
    <Screen>
      <AuthHeader title="Entrar" subtitle="Bem-vindo de volta. Seu radar está te esperando." />

      {notice === 'confirm' && !formError ? (
        <FormNotice message="Conta criada. Abra o link que enviamos para o seu e-mail para confirmar e depois entre aqui." />
      ) : null}
      <FormError message={formError} />

      <Field
        label="E-mail"
        error={errors.email}
        value={email}
        onChangeText={(t) => { setEmail(t); setErrors((p) => ({ ...p, email: undefined })); }}
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
        onChangeText={(t) => { setPassword(t); setErrors((p) => ({ ...p, password: undefined })); }}
        placeholder="Sua senha"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      <Checkbox
        checked={remember}
        onChange={setRemember}
        label="Salvar conta"
        hint="Continua conectado quando você abrir o app de novo."
      />

      <Button
        title={loading ? 'Entrando…' : 'Entrar'}
        icon={<Ionicons name="arrow-forward" size={18} color="#fff" />}
        onPress={submit}
        disabled={loading}
      />

      <SwitchLink question="Ainda não tem conta?" action="Criar conta" onPress={() => router.replace('/register')} />
    </Screen>
  );
}
