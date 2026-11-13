import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { BottomNav } from '../components/BottomNav';
import { api, type Certificate } from '../services/api';
import { createCertificateHtml } from '../services/certificatePdf';
import { useUiText } from '../services/useUiText';

function formattedDate(value?: string) {
  if (!value) return 'Date not provided';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date not provided'
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function CertificateScreen() {
  const { t } = useUiText();
  const { certificateId } = useLocalSearchParams<{ certificateId?: string }>();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [learnerName, setLearnerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadCertificate() {
      try {
        if (!certificateId) throw new Error(t('Certificate information is missing.'));
        const [profileResult, certificateResult] = await Promise.all([
          api.profile.get(),
          api.certificates.list(),
        ]);
        const match = certificateResult.certificates.find((item) => item.id === certificateId);
        if (!match) throw new Error(t('This certificate could not be found.'));
        if (active) {
          setLearnerName(profileResult.user.name);
          setCertificate(match);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? t(loadError.message) : t('Could not load this certificate.'));
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCertificate();
    return () => { active = false; };
  }, [certificateId, t]);

  async function downloadCertificate() {
    if (!certificate || exporting) return;
    setExporting(true);
    setError('');
    try {
      const issuedDate = formattedDate(certificate.issuedAt ?? certificate.issueDate);
      const html = createCertificateHtml({ learnerName, certificate, issuedDate });
      const pdf = await Print.printToFileAsync({ html, width: 842, height: 595 });
      if (Platform.OS === 'web') return;

      if (!await Sharing.isAvailableAsync()) {
        throw new Error(t('Sharing is not available on this device.'));
      }
      await Sharing.shareAsync(pdf.uri, {
        mimeType: 'application/pdf',
        UTI: '.pdf',
        dialogTitle: t('Download certificate'),
      });
    } catch (exportError) {
      setError(exportError instanceof Error ? t(exportError.message) : t('Could not create the certificate PDF.'));
    } finally {
      setExporting(false);
    }
  }

  const title = certificate?.courseTitle ?? certificate?.title ?? t('Course certificate');
  const issuedDate = formattedDate(certificate?.issuedAt ?? certificate?.issueDate);

  return (
    <View className="flex-1 bg-[#F7F7F2] dark:bg-[#101814]">
      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-6 pt-8">
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          className="mb-4 self-start rounded-lg px-2 py-2"
        >
          <Text className="text-[11px] font-bold text-[#14543E]">‹  {t('Back to passport')}</Text>
        </Pressable>

        {loading ? (
          <View className="items-center rounded-2xl bg-white py-12 dark:bg-[#1D2922]">
            <ActivityIndicator color="#14543E" />
            <Text className="mt-3 text-xs text-[#717A74]">{t('Loading certificate…')}</Text>
          </View>
        ) : error && !certificate ? (
          <View className="rounded-2xl border border-[#E8D2CD] bg-white p-4 dark:bg-[#1D2922]">
            <Text className="text-sm font-extrabold text-[#252B27] dark:text-[#F1F4F1]">{t('Certificate unavailable')}</Text>
            <Text accessibilityRole="alert" className="mt-2 text-xs leading-5 text-[#9A5147]">{error}</Text>
          </View>
        ) : certificate ? (
          <>
            <View className="overflow-hidden rounded-2xl border-[5px] border-[#719B79] bg-[#F8F6EA] p-2">
              <View className="items-center border border-[#D5BD79] px-4 py-8">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-[#14543E]">
                  <Text className="text-lg font-extrabold text-white">A</Text>
                </View>
                <Text className="mt-2 text-[12px] font-extrabold tracking-[2px] text-[#14543E]">AGRILEARN</Text>
                <Text className="mt-7 text-center text-[11px] font-semibold tracking-[2px] text-[#99772E]">
                  {t('CERTIFICATE OF COMPLETION')}
                </Text>
                <Text className="mt-4 text-[10px] italic text-[#5E6F62]">{t('This certificate is awarded to')}</Text>
                <Text className="mt-2 border-b border-[#B89A50] px-3 pb-2 text-center text-[22px] font-semibold text-[#173D2C]">
                  {learnerName || t('AgriLearn Learner')}
                </Text>
                <Text className="mt-3 text-[10px] text-[#5E6F62]">{t('for successfully completing')}</Text>
                <Text className="mt-2 text-center text-[18px] font-extrabold text-[#14543E]">{title}</Text>
                {certificate.skills?.length ? (
                  <Text className="mt-3 text-center text-[9px] leading-4 text-[#52665A]">
                    {certificate.skills.join('  ·  ')}
                  </Text>
                ) : null}
                <View className="mt-8 w-full flex-row justify-around">
                  <View className="items-center border-t border-[#AEB8A8] px-3 pt-2">
                    <Text className="text-[9px] font-semibold text-[#34483A]">{issuedDate}</Text>
                    <Text className="mt-1 text-[7px] uppercase tracking-wider text-[#788579]">{t('Date issued')}</Text>
                  </View>
                  <View className="items-center border-t border-[#AEB8A8] px-3 pt-2">
                    <Text className="text-[9px] font-semibold text-[#34483A]">{certificate.credentialId ?? certificate.id}</Text>
                    <Text className="mt-1 text-[7px] uppercase tracking-wider text-[#788579]">{t('Credential ID')}</Text>
                  </View>
                </View>
                <Text className="mt-6 text-center text-[7px] leading-3 text-[#798176]">
                  {t('Issued by AgriLearn for course completion. This credential does not imply external accreditation.')}
                </Text>
              </View>
            </View>

            {error ? (
              <Text accessibilityRole="alert" className="mt-3 rounded-xl bg-[#FBE9E7] p-3 text-[10px] leading-4 text-[#9A382C]">
                {error}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: exporting }}
              disabled={exporting}
              onPress={() => { void downloadCertificate(); }}
              className={`mt-4 h-11 items-center justify-center rounded-xl bg-[#14543E] ${exporting ? 'opacity-70' : ''}`}
            >
              <Text className="text-[10px] font-extrabold text-white">
                {exporting ? t('Preparing certificate PDF…') : t('Download certificate PDF')}
              </Text>
            </Pressable>
            <Text className="mt-2 text-center text-[8px] leading-3 text-[#858C87]">
              {Platform.OS === 'web'
                ? t('Use your browser’s print dialog to save this certificate as a PDF.')
                : t('Create a PDF and save it or share it using your device’s options.')}
            </Text>
          </>
        ) : null}
      </ScrollView>
      <BottomNav />
    </View>
  );
}
