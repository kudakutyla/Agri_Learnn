import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../services/api';
import { setStorageItem } from '../services/storage';

export default function LoginScreen() {
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function submit() {
    if (!email.trim() || !password) {
      setErrorMessage('Enter your email address and password.');
      return;
    }
    setErrorMessage('');
    setBusy(true);
    try {
      const result = await api.login({ email: email.trim().toLowerCase(), password });
      await setStorageItem('agrilearn_token', result.token);
      await setStorageItem('agrilearn_role', result.user.role);
      await setStorageItem('agrilearn_name', result.user.name);
      await setStorageItem('agrilearn_user_id', result.user.id);
      await setStorageItem('agrilearn_language', result.user.language || 'English');
      router.replace(result.user.role === 'admin'
        ? '/admin'
        : result.user.role === 'trainer'
          ? '/manage-courses'
          : result.user.role === 'employer'
            ? '/smme'
            : '/home');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-agrilearn-light" contentContainerClassName="px-6 pb-10 pt-6">
      <Pressable onPress={() => router.back()} className="mb-8 h-11 w-11 items-center justify-center rounded-xl border border-[#DDE4DC] bg-white">
        <Text className="text-xl text-[#103D2B]">‹</Text>
      </Pressable>
      <Text className="text-[30px] font-extrabold text-[#103D2B]">Welcome back</Text>
      <Text className="mb-8 mt-2 leading-6 text-[#717A74]">Continue your learning journey.</Text>
      {reason === 'session-expired' ? (
        <Text accessibilityRole="alert" className="mb-4 rounded-xl bg-[#EAF1E8] px-4 py-3 text-sm leading-5 text-[#14543E]">
          Your previous session is no longer valid. Sign in again to continue.
        </Text>
      ) : null}
      {reason === 'authentication-required' ? (
        <Text accessibilityRole="alert" className="mb-4 rounded-xl bg-[#EAF1E8] px-4 py-3 text-sm leading-5 text-[#14543E]">
          Please sign in to access this page.
        </Text>
      ) : null}
      <View className="gap-4">
        <TextInput value={email} onChangeText={(value) => { setEmail(value); setErrorMessage(''); }} autoCapitalize="none" keyboardType="email-address" placeholder="Email address" className="rounded-xl border border-[#DDE4DC] bg-white px-4 py-4 text-base" />
        <View className="flex-row items-center rounded-xl border border-[#DDE4DC] bg-white pr-4">
          <TextInput
            value={password}
            onChangeText={(value) => { setPassword(value); setErrorMessage(''); }}
            autoCapitalize="none"
            secureTextEntry={!passwordVisible}
            placeholder="Password"
            className="min-w-0 flex-1 px-4 py-4 text-base"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
            onPress={() => setPasswordVisible(!passwordVisible)}
            hitSlop={8}
          >
            <Text className="font-bold text-agrilearn-green">{passwordVisible ? 'Hide' : 'Show'}</Text>
          </Pressable>
        </View>
        {errorMessage ? <Text accessibilityRole="alert" className="text-sm text-red-700">{errorMessage}</Text> : null}
        <Pressable disabled={busy} onPress={submit} className="mt-3 min-h-12 items-center justify-center rounded-[14px] bg-agrilearn-green">
          <Text className="font-bold text-white">{busy ? 'Signing in…' : 'Sign in'}</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/forgot-password')} className="self-end">
          <Text className="font-bold text-agrilearn-green">Forgot password?</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/register')}><Text className="mt-2 text-center font-bold text-agrilearn-green">New to AgriLearn? Create an account</Text></Pressable>
      </View>
    </ScrollView>
  );
}
