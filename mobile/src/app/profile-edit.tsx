import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api, ProfileUpdate } from '../services/api';
import { COURSE_CATEGORY_FILTERS } from '../services/courseCategories';
import { COURSE_LANGUAGES } from '../services/courseLanguages';
import { setStorageItem } from '../services/storage';

const provinces = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape',
];

const categories = [
  'Farmer',
  'Agricultural worker',
  'Student',
  'Agricultural SMME',
  'Content creator',
];

export default function ProfileEditScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [province, setProvince] = useState('');
  const [category, setCategory] = useState('');
  const [primaryInterest, setPrimaryInterest] = useState('');
  const [language, setLanguage] = useState('English');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [picker, setPicker] = useState<'province' | 'category' | 'primaryInterest' | 'language' | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;
    api.profile.get().then(({ user }) => {
      if (!active) return;
      setName(user.name);
      setEmail(user.email);
      setMobileNumber(user.mobileNumber);
      setProvince(user.province);
      setCategory(user.category);
      setPrimaryInterest(user.primaryInterest);
      setLanguage(user.language);
    }).catch((error: unknown) => {
      if (active) setErrorMessage(error instanceof Error ? error.message : 'Could not load your profile.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function saveProfile() {
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (trimmedName.length < 2 || trimmedName.length > 80) {
      setErrorMessage('Enter a name between 2 and 80 characters.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 120) {
      setErrorMessage('Enter a valid email address.');
      return;
    }
    if (newPassword && newPassword.length < 8) {
      setErrorMessage('Your new password must be at least 8 characters.');
      return;
    }
    if (Boolean(currentPassword) !== Boolean(newPassword)) {
      setErrorMessage('Enter both your current and new password to change your password.');
      return;
    }

    const profile: ProfileUpdate = {
      name: trimmedName,
      email: normalizedEmail,
      mobileNumber: mobileNumber.trim(),
      province,
      category,
      primaryInterest: primaryInterest.trim(),
      language,
      ...(currentPassword && newPassword ? { currentPassword, newPassword } : {}),
    };
    setSaving(true);
    setErrorMessage('');
    try {
      const result = await api.profile.update(profile);
      await setStorageItem('agrilearn_name', result.user.name);
      await setStorageItem('agrilearn_language', result.user.language);
      if (returnTo === 'admin-settings') router.replace('/admin-settings');
      else router.back();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  }

  const pickerOptions = picker === 'province'
    ? provinces
    : picker === 'category'
      ? categories
      : picker === 'primaryInterest'
        ? COURSE_CATEGORY_FILTERS.map(({ label }) => label)
        : COURSE_LANGUAGES;

  return (
    <View className="flex-1 bg-[#F7F7F2] dark:bg-[#101814]">
      <View className="flex-row items-center gap-3 px-5 pb-4 pt-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-[14px] border border-[#DDE4DC] bg-white"
        >
          <Text className="text-xl text-[#103D2B] dark:text-[#D8E5DB]">‹</Text>
        </Pressable>
        <Text className="text-[22px] font-extrabold text-[#103D2B] dark:text-[#F1F4F1]">Personal information</Text>
      </View>
      <ScrollView className="flex-1" contentContainerClassName="gap-4 px-5 pb-8 pt-4">
        <Text className="text-sm leading-5 text-[#717A74] dark:text-[#AAB6AD]">Edit the information you provided when creating your account.</Text>
        <View className="gap-2">
          <Text className="text-sm font-bold text-[#343D37] dark:text-[#E2EAE3]">Full name</Text>
          <TextInput
            accessibilityLabel="Full name"
            autoCapitalize="words"
            editable={!loading && !saving}
            maxLength={80}
            onChangeText={setName}
            placeholder="Full name"
            value={name}
            className="rounded-xl border border-[#DDE4DC] bg-white px-4 py-4 text-base text-[#252B27] dark:border-[#35443A] dark:bg-[#1D2922] dark:text-[#F1F4F1]"
          />
        </View>
        <View className="gap-2">
          <Text className="text-sm font-bold text-[#343D37] dark:text-[#E2EAE3]">Email address</Text>
          <TextInput
            accessibilityLabel="Email address"
            autoCapitalize="none"
            editable={!loading && !saving}
            keyboardType="email-address"
            maxLength={120}
            onChangeText={setEmail}
            placeholder="Email address"
            value={email}
            className="rounded-xl border border-[#DDE4DC] bg-white px-4 py-4 text-base text-[#252B27] dark:border-[#35443A] dark:bg-[#1D2922] dark:text-[#F1F4F1]"
          />
        </View>
        <View className="gap-2">
          <Text className="text-sm font-bold text-[#343D37] dark:text-[#E2EAE3]">Mobile number</Text>
          <TextInput
            accessibilityLabel="Mobile number"
            editable={!loading && !saving}
            keyboardType="phone-pad"
            maxLength={30}
            onChangeText={setMobileNumber}
            placeholder="Mobile number"
            value={mobileNumber}
            className="rounded-xl border border-[#DDE4DC] bg-white px-4 py-4 text-base text-[#252B27] dark:border-[#35443A] dark:bg-[#1D2922] dark:text-[#F1F4F1]"
          />
        </View>
        <View className="gap-2">
          <Text className="text-sm font-bold text-[#343D37] dark:text-[#E2EAE3]">Province</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Province: ${province || 'not selected'}`}
            disabled={loading || saving}
            onPress={() => setPicker('province')}
            className="min-h-14 flex-row items-center justify-between rounded-xl border border-[#DDE4DC] bg-white px-4 dark:border-[#35443A] dark:bg-[#1D2922]"
          >
            <Text className={`text-base ${province ? 'text-[#252B27] dark:text-[#F1F4F1]' : 'text-[#8A918D]'}`}>{province || 'Select province'}</Text>
            <Text className="text-[#717A74] dark:text-[#AAB6AD]">⌄</Text>
          </Pressable>
        </View>
        <View className="gap-2">
          <Text className="text-sm font-bold text-[#343D37] dark:text-[#E2EAE3]">Agriculture category</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Agriculture category: ${category || 'not selected'}`}
            disabled={loading || saving}
            onPress={() => setPicker('category')}
            className="min-h-14 flex-row items-center justify-between rounded-xl border border-[#DDE4DC] bg-white px-4 dark:border-[#35443A] dark:bg-[#1D2922]"
          >
            <Text className={`text-base ${category ? 'text-[#252B27] dark:text-[#F1F4F1]' : 'text-[#8A918D]'}`}>{category || 'Select category'}</Text>
            <Text className="text-[#717A74] dark:text-[#AAB6AD]">⌄</Text>
          </Pressable>
        </View>
        <View className="gap-2">
          <Text className="text-sm font-bold text-[#343D37] dark:text-[#E2EAE3]">Primary interest</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Primary interest: ${primaryInterest || 'not selected'}`}
            disabled={loading || saving}
            onPress={() => setPicker('primaryInterest')}
            className="min-h-14 flex-row items-center justify-between rounded-xl border border-[#DDE4DC] bg-white px-4 dark:border-[#35443A] dark:bg-[#1D2922]"
          >
            <Text className={`text-base ${primaryInterest ? 'text-[#252B27] dark:text-[#F1F4F1]' : 'text-[#8A918D]'}`}>
              {primaryInterest || 'Select primary interest'}
            </Text>
            <Text className="text-[#717A74] dark:text-[#AAB6AD]">⌄</Text>
          </Pressable>
        </View>
        <View className="gap-2">
          <Text className="text-sm font-bold text-[#343D37] dark:text-[#E2EAE3]">Preferred language</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Preferred language: ${language}`}
            disabled={loading || saving}
            onPress={() => setPicker('language')}
            className="min-h-14 flex-row items-center justify-between rounded-xl border border-[#DDE4DC] bg-white px-4 dark:border-[#35443A] dark:bg-[#1D2922]"
          >
            <Text className="text-base text-[#252B27] dark:text-[#F1F4F1]">{language}</Text>
            <Text className="text-[#717A74] dark:text-[#AAB6AD]">⌄</Text>
          </Pressable>
        </View>
        <View className="mt-2 gap-3 border-t border-[#DDE4DC] pt-4">
          <Text className="text-base font-extrabold text-[#17261E] dark:text-[#F1F4F1]">Change password</Text>
          <Text className="text-sm leading-5 text-[#717A74] dark:text-[#AAB6AD]">Leave both fields empty to keep your current password.</Text>
          <TextInput
            accessibilityLabel="Current password"
            autoCapitalize="none"
            editable={!loading && !saving}
            onChangeText={setCurrentPassword}
            placeholder="Current password"
            secureTextEntry
            value={currentPassword}
            className="rounded-xl border border-[#DDE4DC] bg-white px-4 py-4 text-base text-[#252B27] dark:border-[#35443A] dark:bg-[#1D2922] dark:text-[#F1F4F1]"
          />
          <TextInput
            accessibilityLabel="New password"
            autoCapitalize="none"
            editable={!loading && !saving}
            maxLength={72}
            onChangeText={setNewPassword}
            placeholder="New password (at least 8 characters)"
            secureTextEntry
            value={newPassword}
            className="rounded-xl border border-[#DDE4DC] bg-white px-4 py-4 text-base text-[#252B27] dark:border-[#35443A] dark:bg-[#1D2922] dark:text-[#F1F4F1]"
          />
        </View>
        {errorMessage ? <Text accessibilityRole="alert" className="text-sm text-red-700">{errorMessage}</Text> : null}
        <Pressable
          accessibilityRole="button"
          disabled={loading || saving}
          onPress={() => { void saveProfile(); }}
          className={`min-h-12 items-center justify-center rounded-[14px] bg-[#14543E] ${(loading || saving) ? 'opacity-50' : ''}`}
        >
          <Text className="font-bold text-white">{loading ? 'Loading…' : saving ? 'Saving…' : 'Save changes'}</Text>
        </Pressable>
      </ScrollView>
      <Modal
        visible={picker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPicker(null)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/40 px-5"
          onPress={() => setPicker(null)}
        >
          <View className="max-h-[80%] w-full rounded-2xl bg-white p-3 dark:bg-[#1D2922]">
            <Text className="px-3 pb-3 pt-2 text-lg font-extrabold text-[#103D2B] dark:text-[#F1F4F1]">
              {picker === 'province'
                ? 'Select province'
                : picker === 'category'
                  ? 'Select category'
                  : picker === 'language' ? 'Select preferred language' : 'Select primary interest'}
            </Text>
            <ScrollView>
              {pickerOptions.map((option) => (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  onPress={() => {
                    if (picker === 'province') setProvince(option);
                    else if (picker === 'category') setCategory(option);
                    else if (picker === 'language') setLanguage(option);
                    else setPrimaryInterest(option);
                    setPicker(null);
                  }}
                  className={`rounded-xl px-3 py-3.5 ${
                    (picker === 'province'
                      ? province
                      : picker === 'category'
                        ? category
                        : picker === 'language' ? language : primaryInterest) === option
                      ? 'bg-[#E8F0E7] dark:bg-[#34483A]'
                      : 'bg-white dark:bg-[#1D2922]'
                  }`}
                >
                  <Text className="text-base text-[#252B27] dark:text-[#F1F4F1]">{option}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
