import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '../services/api';
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
  const [mobileNumber, setMobileNumber] = useState('');
  const [primaryInterest, setPrimaryInterest] = useState('');
  const [role, setRole] = useState<'learner' | 'employer' | 'trainer'>('learner');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [step, setStep] = useState(1);
  const [agreed, setAgreed] = useState(true);
  const [category, setCategory] = useState('Farmer');
  const [province, setProvince] = useState('');
  const [provincePickerVisible, setProvincePickerVisible] = useState(false);

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
      });
      await setStorageItem('agrilearn_token', result.token);
      await setStorageItem('agrilearn_role', result.user.role);
      await setStorageItem('agrilearn_name', result.user.name);
      await setStorageItem('agrilearn_user_id', result.user.id);
      router.replace(result.user.role === 'admin'
        ? '/admin'
        : result.user.role === 'trainer'
          ? '/manage-courses'
          : '/home');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (step === 2) {
      return (
        <ScrollView className="flex-1 bg-agrilearn-light" contentContainerClassName="pb-6">
          <View className="flex-row items-center gap-3 px-5 pt-4">
            <Pressable onPress={() => setStep(1)} className="h-11 w-11 items-center justify-center rounded-[14px] border border-[#DDE4DC] bg-white"><Text className="text-xl text-[#103D2B]">‹</Text></Pressable>
            <View className="flex-1"><Text className="text-lg font-extrabold text-[#103D2B]">How do you work in agriculture?</Text><Text className="mt-1 text-xs text-[#717A74]">This helps us personalise your learning.</Text></View>
          </View>
          <View className="gap-3 px-5 pt-6">
            {[
              ['Farmer', 'I manage or work my own farm', '♧'],
              ['Agricultural worker', 'I work in the agriculture sector', '▢'],
              ['Student', 'I am studying agriculture', '▥'],
              ['Agricultural SMME', 'I run a small agricultural business', '▧'],
              ['Content creator', 'I create agricultural learning modules', '✎'],
            ].map(([title, description, icon]) => (
              <Pressable
                key={title}
                onPress={() => {
                  setCategory(title);
                  setRole(title === 'Content creator'
                    ? 'trainer'
                    : title === 'Agricultural SMME' ? 'employer' : 'learner');
                  setStep(3);
                }}
                className={`min-h-[72px] flex-row items-center rounded-2xl border px-4 py-3 ${
                  category === title ? 'border-agrilearn-green bg-[#E8F0E7]' : 'border-[#DDE4DC] bg-white'
                }`}
              >
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-[#F4F7F3]">
                  <Text className="text-xl text-agrilearn-green">{icon}</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-extrabold text-[#252B27]">{title}</Text>
                  <Text className="mt-1 text-[11px] text-[#717A74]">{description}</Text>
                </View>
                <View className={`h-4 w-4 items-center justify-center rounded-full border ${category === title ? 'border-agrilearn-green' : 'border-[#CCD2CC]'}`}>
                  {category === title ? <View className="h-2 w-2 rounded-full bg-agrilearn-green" /> : null}
                </View>
              </Pressable>
            ))}
          </View>
          <Text className="mt-6 px-5 text-center text-[10px] leading-4 text-[#717A74]">ⓘ You can change this later in your profile.</Text>
        </ScrollView>
      );
  }

  if (step === 3) {
      return (
        <ScrollView className="flex-1 bg-agrilearn-light" contentContainerClassName="px-5 pb-10">
          <View className="flex-row items-center gap-3 pt-4">
            <Pressable onPress={() => setStep(2)} className="h-11 w-11 items-center justify-center rounded-[14px] border border-[#DDE4DC] bg-white"><Text className="text-xl text-[#103D2B]">‹</Text></Pressable>
            <View><Text className="text-xl font-extrabold text-[#103D2B]">Tell us about yourself</Text><Text className="mt-1 text-xs text-[#717A74]">Just the essentials to get you started.</Text></View>
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
            <TextInput value={primaryInterest} onChangeText={setPrimaryInterest} placeholder="Primary interest" className="rounded-xl border border-[#DDE4DC] bg-white px-4 py-4 text-base" />
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
        <Text className="text-[11px] text-[#717A74]">Step 1 of 3</Text>
      </View>
      <Text className="text-[10px] font-extrabold tracking-[1.3px] text-agrilearn-green">CREATE YOUR ACCOUNT</Text>
      <Text className="mt-2 text-[29px] font-extrabold leading-[34px] text-[#103D2B]">Start your learning journey</Text>
      <Text className="mb-7 mt-2 leading-6 text-[#717A74]">Free access to practical agricultural knowledge.</Text>
      <View className="gap-4">
        <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email address" className="rounded-xl border border-[#DDE4DC] bg-white px-4 py-4 text-base" />
        <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 8 characters" className="rounded-xl border border-[#DDE4DC] bg-white px-4 py-4 text-base" />
        <Pressable onPress={() => setAgreed(!agreed)} className="flex-row items-center gap-2">
          <View className={`h-4 w-4 items-center justify-center rounded-sm border ${agreed ? 'border-agrilearn-green bg-agrilearn-green' : 'border-[#CBD2CB]'}`}><Text className="text-[11px] text-white">{agreed ? '✓' : ''}</Text></View>
          <Text className="flex-1 text-xs text-[#717A74]">I agree to the Terms of Use and Privacy Policy.</Text>
        </Pressable>
        <Pressable disabled={!agreed || !email.trim() || password.length < 8} onPress={() => setStep(2)} className={`mt-3 min-h-12 items-center justify-center rounded-[14px] bg-agrilearn-green ${!agreed || !email.trim() || password.length < 8 ? 'opacity-50' : ''}`}>
            <Text className="font-bold text-white">Continue  →</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
