import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '../services/api';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function submit() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setErrorMessage('Enter a valid email address.');
      return;
    }
    setErrorMessage('');
    setBusy(true);
    try {
      await api.requestPasswordReset({ email: normalizedEmail });
      setSubmitted(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-agrilearn-light" contentContainerClassName="px-6 pb-10 pt-16">
      <Pressable onPress={() => router.back()} className="mb-8 h-11 w-11 items-center justify-center rounded-xl border border-[#DDE4DC] bg-white">
        <Text className="text-xl text-[#103D2B]">‹</Text>
      </Pressable>
      <Text className="text-[30px] font-extrabold text-[#103D2B]">Forgot password?</Text>
      <Text className="mb-8 mt-2 leading-6 text-[#717A74]">
        Enter the email address linked to your account and we’ll send you a password reset link.
      </Text>
      {submitted ? (
        <View className="gap-5 rounded-2xl border border-[#DDE4DC] bg-white p-5">
          <Text accessibilityRole="alert" className="leading-6 text-[#14543E]">
            If an account exists for that email, a reset link has been sent. Check your inbox and follow the link to choose a new password.
          </Text>
          <Pressable onPress={() => router.replace('/login')} className="min-h-12 items-center justify-center rounded-[14px] bg-agrilearn-green">
            <Text className="font-bold text-white">Back to sign in</Text>
          </Pressable>
        </View>
      ) : (
        <View className="gap-4">
          <TextInput
            value={email}
            onChangeText={(value) => { setEmail(value); setErrorMessage(''); }}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="Email address"
            className="rounded-xl border border-[#DDE4DC] bg-white px-4 py-4 text-base"
          />
          {errorMessage ? <Text accessibilityRole="alert" className="text-sm text-red-700">{errorMessage}</Text> : null}
          <Pressable disabled={busy} onPress={submit} className="mt-3 min-h-12 items-center justify-center rounded-[14px] bg-agrilearn-green">
            <Text className="font-bold text-white">{busy ? 'Sending…' : 'Send reset link'}</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
