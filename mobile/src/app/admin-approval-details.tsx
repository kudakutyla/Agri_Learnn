import { createElement, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { File, Paths } from 'expo-file-system';
import { VideoView, useVideoPlayer } from 'expo-video';
import { AdminBottomNav } from '../components/AdminBottomNav';
import { API_URL, api, type AdminApprovalCourse, type CourseAssessment, type CourseFile } from '../services/api';
import { getStorageItem } from '../services/storage';

type ApprovalTab = 'Pending' | 'Reviewed' | 'Returned';

function isApprovalTab(value?: string): value is ApprovalTab {
  return value === 'Pending' || value === 'Reviewed' || value === 'Returned';
}

export default function AdminApprovalDetailsScreen() {
  const { courseId, returnTab } = useLocalSearchParams<{ courseId?: string; returnTab?: string }>();
  const [course, setCourse] = useState<AdminApprovalCourse | null>(null);
  const [assessment, setAssessment] = useState<CourseAssessment | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [assessmentError, setAssessmentError] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [openingFileId, setOpeningFileId] = useState<string | null>(null);
  const [fileError, setFileError] = useState('');
  const [pdfPreview, setPdfPreview] = useState<{ uri: string; name: string } | null>(null);

  useEffect(() => {
    return () => {
      if (pdfPreview?.uri) URL.revokeObjectURL(pdfPreview.uri);
    };
  }, [pdfPreview]);

  useEffect(() => {
    let active = true;

    async function loadDetails() {
      if (!courseId) {
        setError('Course information is missing.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      setAssessmentError('');
      try {
        const token = await getStorageItem('agrilearn_token');
        if (!token) throw new Error('Sign in with an administrator account to view course uploads.');
        const result = await api.admin.approvals();
        const selectedCourse = result.courses.find((item) => item.id === courseId);
        if (!selectedCourse) throw new Error('This course could not be found in the approval records.');
        if (!active) return;
        setAdminToken(token);
        setCourse(selectedCourse);

        setAssessmentLoading(true);
        try {
          const assessmentResult = await api.courses.assessment.get(courseId);
          if (active) setAssessment(assessmentResult.assessment);
        } catch (assessmentLoadError) {
          if (active) {
            setAssessmentError(
              assessmentLoadError instanceof Error
                ? assessmentLoadError.message
                : 'Could not load assessment questions.',
            );
          }
        } finally {
          if (active) setAssessmentLoading(false);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load course information.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadDetails();
    return () => { active = false; };
  }, [courseId]);

  async function openPdf(file: CourseFile) {
    if (!courseId || !adminToken || openingFileId) return;
    setOpeningFileId(file.id);
    setFileError('');
    try {
      const uri = `${API_URL}/api/courses/${encodeURIComponent(courseId)}/files/${encodeURIComponent(file.id)}`;
      const headers = { Authorization: `Bearer ${adminToken}` };
      if (Platform.OS === 'web') {
        const response = await fetch(uri, { headers });
        if (!response.ok) throw new Error(`Could not load PDF (${response.status}).`);
        const blobUri = URL.createObjectURL(await response.blob());
        setPdfPreview({ uri: blobUri, name: file.name });
      } else {
        const localFile = await File.downloadFileAsync(
          uri,
          new File(Paths.cache, `${file.id.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`),
          { headers, idempotent: true },
        );
        await File.preview(localFile, { mimeType: 'application/pdf', title: file.name });
      }
    } catch (openError) {
      setFileError(openError instanceof Error ? openError.message : 'Could not open this PDF.');
    } finally {
      setOpeningFileId(null);
    }
  }

  function closePdfPreview() {
    setPdfPreview(null);
  }

  async function submitReview(status: 'approved' | 'rejected') {
    if (!course) return;
    const note = reviewNote.trim();
    if (status === 'rejected' && note.length < 5) {
      setError('Add at least 5 characters of feedback before returning this course.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await api.admin.reviewCourse(course.id, { status, note });
      router.replace({
        pathname: '/admin-approvals',
        params: { tab: status === 'approved' ? 'Reviewed' : 'Returned' },
      });
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Could not submit the course review.');
    } finally {
      setSubmitting(false);
    }
  }

  const backToApprovals = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace({
      pathname: '/admin-approvals',
      params: { tab: isApprovalTab(returnTab) ? returnTab : 'Pending' },
    });
  };

  const uploadedFiles = course
    ? [...(course.files ?? []), ...(course.lessons ?? []).flatMap((lesson) => lesson.file ? [lesson.file] : [])]
      .reduce<{ file: CourseFile; lessonTitle?: string }[]>((entries, file) => {
        const existing = entries.find((entry) => entry.file.id === file.id);
        if (!existing) entries.push({ file });
        return entries;
      }, [])
      .map((entry) => ({
        ...entry,
        lessonTitle: course.lessons?.find((lesson) => lesson.file?.id === entry.file.id)?.title,
      }))
    : [];

  return (
    <View className="flex-1 bg-[#F7F7F2]">
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-6 pt-10" keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" onPress={backToApprovals} className="mb-5 self-start rounded-lg px-2 py-2">
          <Text className="text-[11px] font-bold text-[#14543E]">‹  Back to approvals</Text>
        </Pressable>

        {loading ? (
          <View className="rounded-2xl bg-white p-5">
            <Text className="text-sm text-[#717A74]">Loading course information…</Text>
          </View>
        ) : error && !course ? (
          <View className="rounded-2xl border border-[#F0D1C8] bg-white p-5">
            <Text className="text-lg font-extrabold text-[#252B27]">Course unavailable</Text>
            <Text accessibilityRole="alert" className="mt-2 text-sm leading-5 text-[#9A382C]">{error}</Text>
          </View>
        ) : course ? (
          <>
            <View className="mb-4 rounded-2xl border border-[#E0E5DF] bg-white p-5">
              <Text className="text-[10px] font-bold tracking-wider text-[#477E62]">COURSE REVIEW</Text>
              <Text className="mt-2 text-[22px] font-extrabold leading-7 text-[#252B27]">{course.title}</Text>
              <Text className="mt-2 text-xs leading-5 text-[#78817B]">
                By {course.ownerName} · {course.category}
              </Text>
              <View className="mt-3 self-start rounded-full bg-[#F3E9D1] px-3 py-1">
                <Text className="text-[9px] font-bold text-[#86662C]">
                  {course.status === 'submitted' ? 'PENDING REVIEW'
                    : course.status === 'approved' ? 'APPROVED' : 'RETURNED'}
                </Text>
              </View>
            </View>

            {error ? (
              <Text accessibilityRole="alert" className="mb-4 rounded-xl bg-[#FBE9E7] px-4 py-3 text-xs leading-5 text-[#9A382C]">
                {error}
              </Text>
            ) : null}

            {pdfPreview && Platform.OS === 'web' ? (
              <View className="mb-4 overflow-hidden rounded-2xl border border-[#E0E5DF] bg-white">
                <View className="flex-row items-center justify-between border-b border-[#E0E5DF] px-4 py-3">
                  <Text numberOfLines={1} className="flex-1 pr-3 text-sm font-bold text-[#252B27]">{pdfPreview.name}</Text>
                  <Pressable accessibilityRole="button" onPress={closePdfPreview} className="rounded-lg bg-[#EAF1E8] px-3 py-2">
                    <Text className="text-xs font-bold text-[#14543E]">Close PDF</Text>
                  </Pressable>
                </View>
                {createElement('iframe', {
                  title: `PDF preview: ${pdfPreview.name}`,
                  src: pdfPreview.uri,
                  style: { width: '100%', height: 620, border: 0 },
                })}
              </View>
            ) : null}

            <DetailSection title="Description">
              <Text className="text-sm leading-6 text-[#4D5851]">{course.description || 'No description provided.'}</Text>
            </DetailSection>

            {course.objectives ? (
              <DetailSection title="Learning objectives">
                <Text className="text-sm leading-6 text-[#4D5851]">{course.objectives}</Text>
              </DetailSection>
            ) : null}

            <DetailSection title="Skills learners gain">
              <Text className="text-sm leading-6 text-[#4D5851]">
                {course.skills?.length ? course.skills.join(' · ') : 'No skills specified.'}
              </Text>
            </DetailSection>

            <DetailSection title={`Lessons (${course.lessons?.length ?? 0})`}>
              {course.lessons?.length ? course.lessons.map((lesson, index) => (
                <Text key={`${lesson.title}-${index}`} className="mb-2 text-sm leading-6 text-[#4D5851]">
                  {index + 1}. {lesson.title} · {lesson.type} · {lesson.duration}
                </Text>
              )) : <Text className="text-sm text-[#78817B]">No lessons added.</Text>}
            </DetailSection>

            <DetailSection title={`Uploaded materials (${uploadedFiles.length})`}>
              {uploadedFiles.length ? uploadedFiles.map(({ file, lessonTitle }) => {
                const isVideo = file.mimeType.startsWith('video/');
                const isPdf = file.mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                return (
                  <View key={file.id} className="mb-4 rounded-xl border border-[#E7EBE5] bg-[#FAFBF8] p-3">
                    <Text className="text-sm font-bold text-[#34483A]">{file.name}</Text>
                    <Text className="mt-1 text-xs text-[#78817B]">
                      {lessonTitle ? `Lesson: ${lessonTitle} · ` : ''}{file.mimeType} · {(file.size / (1024 * 1024)).toFixed(1)} MB
                    </Text>
                    {isVideo && adminToken ? (
                      <UploadedVideo
                        key={file.id}
                        uri={`${API_URL}/api/courses/${encodeURIComponent(course.id)}/files/${encodeURIComponent(file.id)}`}
                        token={adminToken}
                        title={lessonTitle ?? file.name}
                      />
                    ) : isPdf ? (
                      <Pressable
                        accessibilityRole="button"
                        disabled={openingFileId === file.id}
                        onPress={() => { void openPdf(file); }}
                        className="mt-3 min-h-11 items-center justify-center rounded-xl bg-[#14543E] px-4"
                      >
                        <Text className="text-xs font-bold text-white">
                          {openingFileId === file.id ? 'Opening PDF…' : 'Read PDF'}
                        </Text>
                      </Pressable>
                    ) : (
                      <Text className="mt-2 text-xs text-[#78817B]">Preview is not available for this file type.</Text>
                    )}
                  </View>
                );
              }) : <Text className="text-sm text-[#78817B]">No uploaded lesson files.</Text>}
              {fileError ? (
                <Text accessibilityRole="alert" className="text-sm leading-5 text-[#9A382C]">{fileError}</Text>
              ) : null}
            </DetailSection>

            <DetailSection title="Assessment">
              {assessmentLoading ? (
                <Text className="text-sm text-[#78817B]">Loading assessment questions…</Text>
              ) : assessmentError ? (
                <Text accessibilityRole="alert" className="text-sm leading-6 text-[#9A382C]">{assessmentError}</Text>
              ) : assessment ? (
                <>
                  <Text className="mb-3 text-xs text-[#78817B]">Pass mark: {assessment.passingScore}%</Text>
                  {assessment.questions.map((question, index) => (
                    <View key={`${question.prompt}-${index}`} className="mb-3 rounded-xl bg-white p-4">
                      <Text className="text-sm font-semibold leading-5 text-[#34483A]">{index + 1}. {question.prompt}</Text>
                      {question.options.map((option, optionIndex) => (
                        <Text
                          key={`${option}-${optionIndex}`}
                          className={`mt-2 text-xs leading-5 ${optionIndex === question.correctOption ? 'font-bold text-[#39785C]' : 'text-[#69736C]'}`}
                        >
                          {optionIndex === question.correctOption ? '✓ ' : '· '}{option}
                        </Text>
                      ))}
                    </View>
                  ))}
                </>
              ) : (
                <Text className="text-sm text-[#78817B]">No assessment questions are available.</Text>
              )}
            </DetailSection>

            {course.status === 'rejected' && course.reviewNote ? (
              <DetailSection title="Return feedback">
                <Text className="text-sm leading-6 text-[#4D5851]">{course.reviewNote}</Text>
              </DetailSection>
            ) : null}

            {course.reviews.length ? (
              <DetailSection title="Review history">
                {course.reviews.map((review) => (
                  <View key={review.id} className="mb-3 rounded-xl bg-white p-4">
                    <Text className="text-sm font-bold text-[#34483A]">
                      {review.status === 'approved' ? 'Approved' : 'Returned'} by {review.reviewerName ?? 'Administrator'}
                    </Text>
                    <Text className="mt-1 text-xs text-[#78817B]">{new Date(review.createdAt).toLocaleString()}</Text>
                    {review.note ? <Text className="mt-2 text-sm leading-5 text-[#4D5851]">{review.note}</Text> : null}
                  </View>
                ))}
              </DetailSection>
            ) : null}

            {course.status === 'submitted' ? (
              <View className="mb-5 rounded-2xl border border-[#E0E5DF] bg-white p-4">
                <Text className="mb-2 text-sm font-bold text-[#34483A]">Feedback for trainer (required to return)</Text>
                <TextInput
                  accessibilityLabel="Feedback for trainer"
                  value={reviewNote}
                  onChangeText={setReviewNote}
                  placeholder="Explain what needs revision..."
                  placeholderTextColor="#A0A7A1"
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                  className="min-h-24 rounded-xl border border-[#DDE3DD] bg-[#FAFBF8] px-3 py-2 text-sm leading-5 text-[#252B27]"
                />
                <View className="mt-3 flex-row gap-2">
                  <Pressable
                    accessibilityRole="button"
                    disabled={submitting}
                    onPress={() => { void submitReview('rejected'); }}
                    className="h-12 flex-1 items-center justify-center rounded-xl border border-[#D6A39A] bg-white"
                  >
                    <Text className="text-xs font-bold text-[#994D43]">{submitting ? 'Saving…' : 'Return for edits'}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={submitting}
                    onPress={() => { void submitReview('approved'); }}
                    className="h-12 flex-1 items-center justify-center rounded-xl bg-[#14543E]"
                  >
                    <Text className="text-xs font-bold text-white">{submitting ? 'Saving…' : 'Approve course'}</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <AdminBottomNav active="Approvals" />
    </View>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-4 rounded-2xl border border-[#E0E5DF] bg-white p-4">
      <Text className="mb-2 text-base font-extrabold text-[#252B27]">{title}</Text>
      {children}
    </View>
  );
}

function UploadedVideo({ uri, token, title }: { uri: string; token: string; title: string }) {
  const [playableUri, setPlayableUri] = useState<string | null>(Platform.OS === 'web' ? null : uri);
  const [error, setError] = useState('');
  const source = useMemo(
    () => Platform.OS === 'web'
      ? playableUri
      : { uri, headers: { Authorization: `Bearer ${token}` } },
    [playableUri, token, uri],
  );
  const player = useVideoPlayer(source);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let active = true;
    let objectUrl: string | null = null;

    void fetch(uri, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Could not load video (${response.status}).`);
        objectUrl = URL.createObjectURL(await response.blob());
        if (active) setPlayableUri(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load this video.');
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [token, uri]);

  return (
    <View className="mt-3 overflow-hidden rounded-xl bg-[#17261E]">
      {playableUri || Platform.OS !== 'web' ? (
        <VideoView
          player={player}
          nativeControls
          contentFit="contain"
          accessibilityLabel={title}
          style={{ width: '100%', aspectRatio: 16 / 9 }}
        />
      ) : (
        <View className="h-48 items-center justify-center">
          {error ? (
            <Text accessibilityRole="alert" className="px-4 text-center text-xs text-white">{error}</Text>
          ) : (
            <>
              <ActivityIndicator color="#FFFFFF" />
              <Text className="mt-2 text-xs text-white">Loading video…</Text>
            </>
          )}
        </View>
      )}
    </View>
  );
}
