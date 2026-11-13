import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '../services/api';
import { COURSE_CATEGORY_FILTERS } from '../services/courseCategories';
import { COURSE_LANGUAGES } from '../services/courseLanguages';
import { setStorageItem } from '../services/storage';

const SOUTH_AFRICAN_PROVINCES = [
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

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [mobileNumber, setMobileNumber] = useState('');
  const [primaryInterest, setPrimaryInterest] = useState('');
  const [language, setLanguage] = useState<string>('English');
  const [role, setRole] = useState<'learner' | 'employer' | 'trainer'>('learner');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [step, setStep] = useState(1);
  const [agreed, setAgreed] = useState(true);
  const [category, setCategory] = useState('');
  const [province, setProvince] = useState('');
  const [provincePickerVisible, setProvincePickerVisible] = useState(false);
  const [interestPickerVisible, setInterestPickerVisible] = useState(false);
  const [languagePickerVisible, setLanguagePickerVisible] = useState(false);

  function continueToProfile() {
    if (!category) {
      setErrorMessage('Select how you work in agriculture.');
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 120) {
      setErrorMessage('Enter a valid email address.');
      return;
    }
    if (password.length < 8 || password.length > 72) {
      setErrorMessage('Choose a password between 8 and 72 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('The passwords do not match.');
      return;
    }
    setErrorMessage('');
    setStep(2);
  }

  async function submit() {
    const normalizedEmail = email.trim().toLowerCase();
    if (name.trim().length < 2 || name.trim().length > 80) {
      setErrorMessage('Enter a name between 2 and 80 characters.');
      return;
    }
    if (normalizedEmail.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setErrorMessage('Enter a valid email address.');
      return;
    }
    if (password.length < 8 || password.length > 72) {
      setErrorMessage('Choose a password between 8 and 72 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('The passwords do not match.');
      return;
    }
    setErrorMessage('');
    setBusy(true);
    try {
      const result = await api.register({
        name: name.trim(),
        email: normalizedEmail,
        password,
        role,
        mobileNumber: mobileNumber.trim(),
        province,
        category,
        primaryInterest: primaryInterest.trim(),
        language,
      });
      await setStorageItem('agrilearn_token', result.token);
      await setStorageItem('agrilearn_role', result.user.role);
      await setStorageItem('agrilearn_name', result.user.name);
      await setStorageItem('agrilearn_user_id', result.user.id);
      await setStorageItem('agrilearn_language', result.user.language || language);
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

  if (step === 2) {
      return (
        <ScrollView className="flex-1 bg-agrilearn-light" contentContainerClassName="px-5 pb-10">
          <View className="flex-row items-center gap-3 pt-4">
            <Pressable onPress={() => setStep(1)} className="h-11 w-11 items-center justify-center rounded-[14px] border border-[#DDE4DC] bg-white"><Text className="text-xl text-[#103D2B]">‹</Text></Pressable>
            <View className="flex-1"><Text className="text-xl font-extrabold text-[#103D2B]">Tell us about yourself</Text><Text className="mt-1 text-xs text-[#717A74]">Just the essentials to get you started.</Text></View>
            <Text className="text-[11px] text-[#717A74]">Step 2 of 2</Text>
          </View>
          <View className="mt-7 gap-4">
            <TextInput value={name} onChangeText={(value) => { setName(value); setErrorMessage(''); }} placeholder="Full name" className="rounded-xl border border-[#DDE4DC] bg-white px-4 py-4 text-base" />
            <TextInput value={mobileNumber} onChangeText={setMobileNumber} placeholder="Mobile number" keyboardType="phone-pad" className="rounded-xl border border-[#DDE4DC] bg-white px-4 py-4 text-base" />
            <Pressable
              onPress={() => setProvincePickerVisible(true)}
              className="flex-row items-center justify-between rounded-xl border border-[#DDE4DC] bg-white px-4 py-4"
            >
              <Text className={`text-base ${province ? 'text-[#252B27]' : 'text-[#8A918D]'}`}>
                {province || 'Province'}
              </Text>
              <Text className="text-[#717A74]">⌄</Text>
            </Pressable>
            {role === 'learner' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Preferred language: ${language}`}
                onPress={() => setLanguagePickerVisible(true)}
                className="flex-row items-center justify-between rounded-xl border border-[#DDE4DC] bg-white px-4 py-4"
              >
                <View>
                  <Text className="text-xs text-[#717A74]">Preferred language</Text>
                  <Text className="mt-1 text-base text-[#252B27]">{language}</Text>
                </View>
                <Text className="text-[#717A74]">⌄</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Primary interest: ${primaryInterest || 'not selected'}`}
              onPress={() => setInterestPickerVisible(true)}
              className="flex-row items-center justify-between rounded-xl border border-[#DDE4DC] bg-white px-4 py-4"
            >
              <Text className={`text-base ${primaryInterest ? 'text-[#252B27]' : 'text-[#8A918D]'}`}>
                {primaryInterest || 'Primary interest'}
              </Text>
              <Text className="text-[#717A74]">⌄</Text>
            </Pressable>
            {errorMessage ? <Text accessibilityRole="alert" className="text-sm text-red-700">{errorMessage}</Text> : null}
            <Pressable disabled={busy || !province} onPress={submit} className={`mt-2 min-h-12 items-center justify-center rounded-[14px] bg-agrilearn-green ${busy || !province ? 'opacity-50' : ''}`}><Text className="font-bold text-white">{busy ? 'Creating account…' : 'Create account  →'}</Text></Pressable>
          </View>
          <Modal
            visible={provincePickerVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setProvincePickerVisible(false)}
          >
            <Pressable
              className="flex-1 items-center justify-center bg-black/40 px-5"
              onPress={() => setProvincePickerVisible(false)}
            >
              <Pressable className="w-full rounded-2xl bg-white p-3">
                <Text className="px-3 pb-3 pt-2 text-lg font-extrabold text-[#103D2B]">Select province</Text>
                {SOUTH_AFRICAN_PROVINCES.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => {
                      setProvince(option);
                      setProvincePickerVisible(false);
                    }}
                    className={`rounded-xl px-3 py-3.5 ${province === option ? 'bg-[#E8F0E7]' : 'bg-white'}`}
                  >
                    <Text className={`text-base ${province === option ? 'font-bold text-agrilearn-green' : 'text-[#252B27]'}`}>
                      {option}
                    </Text>
                  </Pressable>
                ))}
              </Pressable>
            </Pressable>
          </Modal>
          <Modal
            visible={languagePickerVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setLanguagePickerVisible(false)}
          >
            <Pressable
              className="flex-1 items-center justify-center bg-black/40 px-5"
              onPress={() => setLanguagePickerVisible(false)}
            >
              <View className="max-h-[80%] w-full rounded-2xl bg-white p-3">
                <Text className="px-3 pb-3 pt-2 text-lg font-extrabold text-[#103D2B]">Select preferred language</Text>
                <ScrollView>
                  {COURSE_LANGUAGES.map((option) => (
                    <Pressable
                      key={option}
                      accessibilityRole="button"
                      accessibilityState={{ selected: language === option }}
                      onPress={() => {
                        setLanguage(option);
                        setLanguagePickerVisible(false);
                      }}
                      className={`rounded-xl px-3 py-3.5 ${language === option ? 'bg-[#E8F0E7]' : 'bg-white'}`}
                    >
                      <Text className={`text-base ${language === option ? 'font-bold text-agrilearn-green' : 'text-[#252B27]'}`}>
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </Pressable>
          </Modal>
          <Modal
            visible={interestPickerVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setInterestPickerVisible(false)}
          >
            <Pressable
              className="flex-1 items-center justify-center bg-black/40 px-5"
              onPress={() => setInterestPickerVisible(false)}
            >
              <View className="max-h-[80%] w-full rounded-2xl bg-white p-3">
                <Text className="px-3 pb-3 pt-2 text-lg font-extrabold text-[#103D2B]">Select primary interest</Text>
                <ScrollView>
                  {COURSE_CATEGORY_FILTERS.map(({ label }) => (
                    <Pressable
                      key={label}
                      accessibilityRole="button"
                      onPress={() => {
                        setPrimaryInterest(label);
                        setInterestPickerVisible(false);
                      }}
                      className={`rounded-xl px-3 py-3.5 ${primaryInterest === label ? 'bg-[#E8F0E7]' : 'bg-white'}`}
                    >
                      <Text className={`text-base ${primaryInterest === label ? 'font-bold text-agrilearn-green' : 'text-[#252B27]'}`}>
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </Pressable>
          </Modal>
        </ScrollView>
      );
  }

  return (
    <ScrollView className="flex-1 bg-agrilearn-light" contentContainerClassName="px-6 pb-10 pt-6">
      <View className="mb-8 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="h-[34px] w-[34px] items-center justify-center rounded-[12px] bg-agrilearn-green"><Text className="text-lg text-white">◒</Text></View>
          <Text className="text-lg font-extrabold text-[#103D2B]">AgriLearn</Text>
        </View>
        <Text className="text-[11px] text-[#717A74]">Step 1 of 2</Text>
      </View>
      <Text className="text-[10px] font-extrabold tracking-[1.3px] text-agrilearn-green">CREATE YOUR ACCOUNT</Text>
      <Text className="mt-2 text-[29px] font-extrabold leading-[34px] text-[#103D2B]">Start your learning journey</Text>
      <Text className="mb-7 mt-2 leading-6 text-[#717A74]">Free access to practical agricultural knowledge.</Text>
      <View className="gap-4">
        <TextInput
          value={email}
          onChangeText={(value) => { setEmail(value); setErrorMessage(''); }}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email address"
          accessibilityLabel="Email address"
          className="rounded-xl border border-[#DDE4DC] bg-white px-4 py-4 text-base"
        />
        <View className="flex-row items-center rounded-xl border border-[#DDE4DC] bg-white pr-4">
          <TextInput
            value={password}
            onChangeText={(value) => { setPassword(value); setErrorMessage(''); }}
            autoCapitalize="none"
            secureTextEntry={!passwordVisible}
            placeholder="At least 8 characters"
            accessibilityLabel="Password"
            className="min-w-0 flex-1 px-4 py-4 text-base"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
            accessibilityState={{ selected: passwordVisible }}
            onPress={() => setPasswordVisible((visible) => !visible)}
            hitSlop={8}
          >
            <Text className="font-bold text-agrilearn-green">{passwordVisible ? 'Hide' : 'Show'}</Text>
          </Pressable>
        </View>
        <View className="flex-row items-center rounded-xl border border-[#DDE4DC] bg-white pr-4">
          <TextInput
            value={confirmPassword}
            onChangeText={(value) => { setConfirmPassword(value); setErrorMessage(''); }}
            autoCapitalize="none"
            secureTextEntry={!confirmPasswordVisible}
            placeholder="Re-enter password"
            accessibilityLabel="Re-enter password to confirm"
            className="min-w-0 flex-1 px-4 py-4 text-base"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={confirmPasswordVisible ? 'Hide password confirmation' : 'Show password confirmation'}
            accessibilityState={{ selected: confirmPasswordVisible }}
            onPress={() => setConfirmPasswordVisible((visible) => !visible)}
            hitSlop={8}
          >
            <Text className="font-bold text-agrilearn-green">{confirmPasswordVisible ? 'Hide' : 'Show'}</Text>
          </Pressable>
        </View>
        {confirmPassword.length > 0 && password !== confirmPassword ? (
          <Text accessibilityRole="alert" className="-mt-2 text-xs text-[#9A382C]">The passwords do not match.</Text>
        ) : null}
        <View className="gap-3">
          <View>
            <Text className="text-base font-extrabold text-[#103D2B]">How do you work in agriculture?</Text>
            <Text className="mt-1 text-xs text-[#717A74]">This helps us personalise your learning.</Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {[
              ['Farmer', 'I manage or work my own farm', '♧'],
              ['Agricultural worker', 'I work in the agriculture sector', '▢'],
              ['Student', 'I am studying agriculture', '▥'],
              ['Agricultural SMME', 'I run a small agricultural business', '▧'],
              ['Content creator', 'I create agricultural learning modules', '✎'],
            ].map(([title, description, icon]) => (
              <Pressable
                key={title}
                accessibilityRole="button"
                accessibilityState={{ selected: category === title }}
                onPress={() => {
                  setCategory(title);
                  setErrorMessage('');
                  setRole(title === 'Content creator'
                    ? 'trainer'
                    : title === 'Agricultural SMME' ? 'employer' : 'learner');
                }}
                className={`min-h-[104px] w-[31%] rounded-xl border p-2 ${
                  category === title ? 'border-agrilearn-green bg-[#E8F0E7]' : 'border-[#DDE4DC] bg-white'
                }`}
              >
                <View className="mb-1.5 flex-row items-center justify-between">
                  <View className="h-7 w-7 items-center justify-center rounded-lg bg-[#F4F7F3]">
                    <Text className="text-base text-agrilearn-green">{icon}</Text>
                  </View>
                  <View className={`h-4 w-4 items-center justify-center rounded-full border ${category === title ? 'border-agrilearn-green' : 'border-[#CCD2CC]'}`}>
                    {category === title ? <View className="h-2 w-2 rounded-full bg-agrilearn-green" /> : null}
                  </View>
                </View>
                <Text className="text-xs font-extrabold text-[#252B27]">{title}</Text>
                <Text className="mt-0.5 text-[9px] leading-3 text-[#717A74]">{description}</Text>
              </Pressable>
            ))}
          </View>
          <Text className="text-center text-[10px] leading-4 text-[#717A74]">ⓘ You can change this later in your profile.</Text>
        </View>
        {errorMessage ? <Text accessibilityRole="alert" className="-mt-2 text-xs text-[#9A382C]">{errorMessage}</Text> : null}
        <Pressable onPress={() => setAgreed(!agreed)} className="flex-row items-center gap-2">
          <View className={`h-4 w-4 items-center justify-center rounded-sm border ${agreed ? 'border-agrilearn-green bg-agrilearn-green' : 'border-[#CBD2CB]'}`}><Text className="text-[11px] text-white">{agreed ? '✓' : ''}</Text></View>
          <Text className="flex-1 text-xs text-[#717A74]">I agree to the Terms of Use and Privacy Policy.</Text>
        </Pressable>
        <Pressable disabled={!agreed || !category || !email.trim() || password.length < 8 || !confirmPassword || password !== confirmPassword} onPress={continueToProfile} className={`mt-3 min-h-12 items-center justify-center rounded-[14px] bg-agrilearn-green ${!agreed || !category || !email.trim() || password.length < 8 || !confirmPassword || password !== confirmPassword ? 'opacity-50' : ''}`}>
            <Text className="font-bold text-white">Continue  →</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
