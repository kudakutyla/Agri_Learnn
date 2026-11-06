import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { BottomNav } from '../components/BottomNav';
import { api, Certificate } from '../services/api';
import { getCertificatePoints, getEarnedSkills } from '../services/passport';
import { getStorageItem } from '../services/storage';

const passportTabs = ['Skills', 'Credentials', 'History'] as const;
type PassportTab = (typeof passportTabs)[number];

function certificateTitle(certificate: Certificate) {
  return certificate.title ?? certificate.courseTitle ?? 'Course certificate';
}

function certificateDate(certificate: Certificate) {
  const date = certificate.issuedAt ?? certificate.issueDate;
  if (!date) return 'Date not provided';
  const parsedDate = new Date(date);
  return Number.isNaN(parsedDate.getTime())
    ? 'Date not provided'
    : parsedDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function PassportScreen() {
  const [name, setName] = useState('');
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [activeTab, setActiveTab] = useState<PassportTab>('Skills');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadPassport() {
      try {
        const [savedName, result] = await Promise.all([
          getStorageItem('agrilearn_name'),
          api.certificates.list(),
        ]);
        if (active) {
          setName(savedName ?? '');
          setCertificates(result.certificates);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPassport();
    return () => { active = false; };
  }, []);

  const earnedSkills = useMemo(() => getEarnedSkills(certificates), [certificates]);

  const points = getCertificatePoints(certificates);
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const sortedCertificates = [...certificates].sort((a, b) => {
    const dateA = new Date(a.issuedAt ?? a.issueDate ?? 0).getTime();
    const dateB = new Date(b.issuedAt ?? b.issueDate ?? 0).getTime();
    return (Number.isNaN(dateB) ? 0 : dateB) - (Number.isNaN(dateA) ? 0 : dateA);
  });

  async function sharePassport() {
    await Share.share({
      message: name ? `${name}'s AgriLearn Skills Passport` : 'My AgriLearn Skills Passport',
    });
  }

  return (
    <View className="flex-1 bg-[#F7F7F2] dark:bg-[#101814]">
      <ScrollView className="flex-1" contentContainerClassName="pb-6">
        <View className="overflow-hidden bg-[#0B5543] px-5 pb-5 pt-4">
          <View className="absolute -right-7 top-16 h-32 w-32 rounded-full border-[18px] border-white/5" />
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="h-8 w-8 items-center justify-center rounded-xl bg-white/15">
                <Text className="text-sm text-white">♧</Text>
              </View>
              <Text className="ml-2 text-sm font-extrabold text-white">AgriLearn</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share passport"
              onPress={() => { void sharePassport(); }}
              className="h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10"
            >
              <Text className="text-base text-white">↗</Text>
            </Pressable>
          </View>

          <View className="mt-5 flex-row items-center">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-[#D9B665]">
              <Text className="text-[10px] font-extrabold text-[#51421D]">{initials || 'AL'}</Text>
            </View>
            <View className="flex-1">
              <Text className="self-start rounded bg-[#F5EAD4] px-1.5 py-1 text-[7px] font-extrabold tracking-wide text-[#72531D]">
                DIGITAL SKILLS PASSPORT
              </Text>
              <Text className="mt-1 text-[14px] font-extrabold text-white">{name || 'AgriLearn learner'}</Text>
              <Text className="mt-0.5 text-[8px] text-white/70">Your learning achievements</Text>
            </View>
          </View>

          <View className="mt-4 flex-row rounded-xl bg-white/10 py-2.5">
            {[
              { value: String(earnedSkills.length), label: 'Skills' },
              { value: String(certificates.length), label: 'Certificates' },
              { value: String(points), label: 'Points' },
            ].map((stat, index) => (
              <View key={stat.label} className={`flex-1 items-center ${index > 0 ? 'border-l border-white/15' : ''}`}>
                <Text className="text-[14px] font-extrabold text-[#D9B665]">{stat.value}</Text>
                <Text className="mt-0.5 text-[7px] text-white/75">{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="px-4 pt-3">
          <View className="flex-row items-start rounded-xl bg-[#EAF1E8] p-3 dark:bg-[#253B2D]">
            <Text className="mr-2 text-sm text-[#14543E]">✓</Text>
            <View className="flex-1">
              <Text className="text-[9px] font-extrabold text-[#34483A] dark:text-[#E2EAE3]">AgriLearn account connected</Text>
              <Text className="mt-1 text-[8px] leading-3 text-[#717A74] dark:text-[#B5C0B7]">
                Credentials shown here are issued through AgriLearn. External accreditation is not implied.
              </Text>
            </View>
          </View>

          <View className="mt-3 flex-row rounded-xl bg-[#E8EBE6] p-1 dark:bg-[#25342B]">
            {passportTabs.map((tab) => {
              const selected = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setActiveTab(tab)}
                  className={`h-8 flex-1 items-center justify-center rounded-lg ${selected ? 'bg-white dark:bg-[#34483A]' : ''}`}
                >
                  <Text className={`text-[9px] ${selected ? 'font-extrabold text-[#14543E] dark:text-[#B7E2C2]' : 'font-medium text-[#687069] dark:text-[#AAB6AD]'}`}>
                    {tab}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {loading ? (
            <View className="items-center py-10">
              <ActivityIndicator color="#14543E" />
              <Text className="mt-2 text-[9px] text-[#717A74] dark:text-[#AAB6AD]">Loading your passport…</Text>
            </View>
          ) : error ? (
            <View accessibilityRole="alert" className="mt-4 rounded-xl border border-[#E8D2CD] bg-white p-4 dark:bg-[#1D2922]">
              <Text className="text-[10px] font-bold text-[#9A5147]">Could not load passport credentials</Text>
              <Text className="mt-1 text-[9px] leading-4 text-[#717A74] dark:text-[#AAB6AD]">{error}</Text>
            </View>
          ) : activeTab === 'Skills' ? (
            earnedSkills.length > 0 ? (
              earnedSkills.map((skill, index) => (
                <View key={skill.name} className="mt-2 flex-row items-center rounded-xl border border-[#E5E8E2] bg-white p-2.5 dark:border-[#35443A] dark:bg-[#1D2922]">
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#EAF1E8]">
                    <Text className="text-sm text-[#14543E]">{['♧', '↗', '♢', '✓'][index % 4]}</Text>
                  </View>
                  <View className="ml-2.5 flex-1">
                    <Text className="text-[10px] font-bold text-[#252B27] dark:text-[#F1F4F1]">{skill.name}</Text>
                    <Text className="mt-0.5 text-[8px] text-[#858C87] dark:text-[#AAB6AD]">
                      Earned from {skill.courses.join(', ')}
                    </Text>
                  </View>
                  <Text className="rounded-md bg-[#EAF1E8] px-2 py-1 text-[7px] font-bold text-[#477E62]">Earned</Text>
                </View>
              ))
            ) : (
              <EmptyPassportState
                title="Your skills will grow here"
                message="Earn a course credential to add verified skills to your passport."
              />
            )
          ) : activeTab === 'Credentials' ? (
            sortedCertificates.length > 0 ? (
              sortedCertificates.map((certificate) => (
                <View key={certificate.id} className="mt-2 flex-row items-center rounded-xl border border-[#E5E8E2] bg-white p-3 dark:border-[#35443A] dark:bg-[#1D2922]">
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#EAF1E8]">
                    <Text className="text-sm text-[#14543E]">▣</Text>
                  </View>
                  <View className="ml-2.5 flex-1">
                    <Text className="text-[10px] font-bold text-[#252B27] dark:text-[#F1F4F1]">{certificateTitle(certificate)}</Text>
                    <Text className="mt-1 text-[8px] text-[#858C87] dark:text-[#AAB6AD]">Issued {certificateDate(certificate)}</Text>
                    {certificate.credentialId ? (
                      <Text className="mt-0.5 text-[7px] text-[#858C87] dark:text-[#AAB6AD]">ID: {certificate.credentialId}</Text>
                    ) : null}
                  </View>
                </View>
              ))
            ) : (
              <EmptyPassportState
                title="No credentials yet"
                message="Certificates you earn will be saved here."
              />
            )
          ) : (
            sortedCertificates.length > 0 ? (
              sortedCertificates.map((certificate) => (
                <View key={certificate.id} className="mt-2 flex-row items-center rounded-xl border border-[#E5E8E2] bg-white p-3 dark:border-[#35443A] dark:bg-[#1D2922]">
                  <View className="mr-3 h-2 w-2 rounded-full bg-[#477E62]" />
                  <View className="flex-1">
                    <Text className="text-[10px] font-bold text-[#252B27] dark:text-[#F1F4F1]">Credential earned</Text>
                    <Text className="mt-0.5 text-[9px] text-[#717A74] dark:text-[#B5C0B7]">{certificateTitle(certificate)}</Text>
                    <Text className="mt-1 text-[8px] text-[#858C87] dark:text-[#AAB6AD]">{certificateDate(certificate)}</Text>
                  </View>
                </View>
              ))
            ) : (
              <EmptyPassportState
                title="No passport activity yet"
                message="Earned credentials will appear in your activity history."
              />
            )
          )}
        </View>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

function EmptyPassportState({ title, message }: { title: string; message: string }) {
  return (
    <View className="mt-3 items-center rounded-xl border border-[#E5E8E2] bg-white px-5 py-7 dark:border-[#35443A] dark:bg-[#1D2922]">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-[#EAF1E8]">
        <Text className="text-base text-[#477E62]">✓</Text>
      </View>
      <Text className="mt-2 text-[10px] font-extrabold text-[#252B27] dark:text-[#F1F4F1]">{title}</Text>
      <Text className="mt-1 text-center text-[8px] leading-3 text-[#858C87] dark:text-[#AAB6AD]">{message}</Text>
    </View>
  );
}
