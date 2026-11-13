import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../services/api';
import { useUiText } from '../services/useUiText';

export default function ResetPasswordScreen() {
  const { t } = useUiText();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function submit() {
    if (!token || Array.isArray(token)) {
      setErrorMessage(t('This reset link is missing its token. Request a new link and try again.'));
      return;
    }
    if (password.length < 8 || password.length > 72) {
      setErrorMessage(t('Choose a password between 8 and 72 characters.'));
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage(t('The passwords do not match.'));
      return;
    }
    setErrorMessage('');
    setBusy(true);
    try {
      await api.resetPassword({ token, newPassword: password, confirmPassword });
      setSubmitted(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? t(error.message) : t('Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-agrilearn-light" contentContainerClassName="px-6 pb-10 pt-16">
      <Text className="text-[30px] font-extrabold text-[#103D2B]">{t('Reset password')}</Text>
      <Text className="mb-8 mt-2 leading-6 text-[#717A74]">{t('Choose a new password for your AgriLearn account.')}</Text>
      {submitted ? (
        <View className="gap-5 rounded-2xl border border-[#DDE4DC] bg-white p-5">
          <Text accessibilityRole="alert" className="leading-6 text-[#14543E]">{t('Your password has been reset. Sign in with your new password.')}</Text>
          <Pressable onPress={() => router.replace('/login')} className="min-h-12 items-center justify-center rounded-[14px] bg-agrilearn-green">
            <Text className="font-bold text-white">{t('Back to sign in')}</Text>
          </Pressable>
        </View>
      ) : (
        <View className="gap-4">
          <View className="flex-row items-center rounded-xl border border-[#DDE4DC] bg-white pr-4">
            <TextInput
              value={password}
              onChangeText={(value) => { setPassword(value); setErrorMessage(''); }}
              autoCapitalize="none"
              secureTextEntry={!passwordVisible}
              placeholder={t('New password')}
              className="min-w-0 flex-1 px-4 py-4 text-base"
            />
            <Pressable accessibilityRole="button" accessibilityLabel={passwordVisible ? `${t('Hide')} ${t('New password').toLowerCase()}` : `${t('Show')} ${t('New password').toLowerCase()}`} onPress={() => setPasswordVisible(!passwordVisible)} hitSlop={8}>
              <Text className="font-bold text-agrilearn-green">{passwordVisible ? t('Hide') : t('Show')}</Text>
            </Pressable>
          </View>
          <View className="flex-row items-center rounded-xl border border-[#DDE4DC] bg-white pr-4">
            <TextInput
              value={confirmPassword}
              onChangeText={(value) => { setConfirmPassword(value); setErrorMessage(''); }}
              autoCapitalize="none"
              secureTextEntry={!confirmPasswordVisible}
              placeholder={t('Confirm new password')}
              className="min-w-0 flex-1 px-4 py-4 text-base"
            />
            <Pressable accessibilityRole="button" accessibilityLabel={confirmPasswordVisible ? `${t('Hide')} ${t('Confirm new password').toLowerCase()}` : `${t('Show')} ${t('Confirm new password').toLowerCase()}`} onPress={() => setConfirmPasswordVisible(!confirmPasswordVisible)} hitSlop={8}>
              <Text className="font-bold text-agrilearn-green">{confirmPasswordVisible ? t('Hide') : t('Show')}</Text>
            </Pressable>
          </View>
          {errorMessage ? <Text accessibilityRole="alert" className="text-sm text-red-700">{errorMessage}</Text> : null}
          <Pressable disabled={busy} onPress={submit} className="mt-3 min-h-12 items-center justify-center rounded-[14px] bg-agrilearn-green">
            <Text className="font-bold text-white">{busy ? t('Resetting password…') : t('Reset password')}</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
