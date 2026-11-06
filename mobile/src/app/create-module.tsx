import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { api, CourseAssessmentQuestion, CourseLesson, LocalUploadFile } from '../services/api';
import { getStorageItem } from '../services/storage';

const categories = ['Crop Production', 'Soil Management', 'Climate-Smart Agriculture'];
const maxVideoBytes = 200 * 1024 * 1024;
const maxPdfBytes = 25 * 1024 * 1024;

function StepProgress({ step }: { step: number }) {
  return (
    <View className="flex-row gap-1 px-5 pt-4">
      {[1, 2, 3, 4].map((item) => (
        <View key={item} className={`h-[3px] flex-1 rounded-full ${item <= step ? 'bg-[#14543E]' : 'bg-[#DCE2DC]'}`} />
      ))}
    </View>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <Text className="mb-2 text-[11px] font-bold text-[#252B27]">{children}</Text>;
}

export default function CreateModuleScreen() {
  const { courseId: editCourseId } = useLocalSearchParams<{ courseId?: string }>();
  const [step, setStep] = useState(1);
  const [moduleId, setModuleId] = useState('');
  const [loadingCourse, setLoadingCourse] = useState(Boolean(editCourseId));
  const [errorMessage, setErrorMessage] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [courseStatus, setCourseStatus] = useState<'draft' | 'submitted' | 'approved' | 'rejected'>('draft');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [description, setDescription] = useState(
    'Learn practical, low-impact ways to identify, prevent and manage common crop pests.',
  );
  const [objectives, setObjectives] = useState(
    'Identify common crop pests\nChoose suitable prevention methods\nApply treatments safely',
  );
  const [skills, setSkills] = useState<string[]>([]);
  const [skillDraft, setSkillDraft] = useState('');
  const [coverUri, setCoverUri] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [questions, setQuestions] = useState<CourseAssessmentQuestion[]>([
    { prompt: '', options: ['', '', '', ''], correctOption: 0 },
  ]);
  const [passMark, setPassMark] = useState('70');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonType, setLessonType] = useState<CourseLesson['type']>('Video');
  const [lessonDuration, setLessonDuration] = useState('');
  const [lessonFile, setLessonFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [addingLesson, setAddingLesson] = useState(false);
  const [uploadingLesson, setUploadingLesson] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const requestedCourseId = Array.isArray(editCourseId) ? editCourseId[0] : editCourseId;
    if (!requestedCourseId) return;
    let active = true;
    async function loadCourse() {
      try {
        const [courses, userId] = await Promise.all([
          api.courses.list(),
          getStorageItem('agrilearn_user_id'),
        ]);
        const course = courses.courses.find((item) => item.id === requestedCourseId && item.ownerId === userId);
        if (!course) throw new Error('This course could not be found in your trainer account.');
        if (course.status === 'submitted' || course.status === 'approved') {
          throw new Error('This course cannot be edited while it is under review or published.');
        }
        const { assessment } = await api.courses.assessment.get(requestedCourseId);
        if (!active) return;
        setModuleId(course.id);
        setCourseStatus(course.status);
        setTitle(course.title);
        setCategory(course.category);
        setDescription(course.description);
        setObjectives(course.objectives ?? '');
        setSkills(course.skills ?? []);
        setCoverUri(course.coverImage ?? '');
        setCoverImage(course.coverImage ?? '');
        setLessons(course.lessons ?? []);
        if (assessment) {
          setQuestions(assessment.questions);
          setPassMark(String(assessment.passingScore));
        }
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Could not load this course.');
      } finally {
        if (active) setLoadingCourse(false);
      }
    }
    void loadCourse();
    return () => { active = false; };
  }, [editCourseId]);

  async function pickCoverImage() {
    setErrorMessage('');
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage('Allow photo access to add a module cover image.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.65,
        base64: true,
      });
      if (result.canceled) return;
      const image = result.assets[0];
      if (!image.base64) throw new Error('Please select another JPG or PNG image.');
      const mimeType = image.mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
      const encoded = `data:${mimeType};base64,${image.base64}`;
      if (encoded.length > 3_000_000) throw new Error('Choose a smaller image for the module cover.');
      setCoverUri(image.uri);
      setCoverImage(encoded);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not select the cover image.');
    }
  }

  async function saveModuleDetails() {
    if (title.trim().length < 3) {
      setErrorMessage('Enter a title with at least 3 characters.');
      return;
    }
    setErrorMessage('');
    setSaveMessage('');
    setBusy(true);
    try {
      const details = {
        title: title.trim(),
        category,
        description: description.trim(),
        objectives: objectives.trim(),
        skills,
        coverImage: coverImage || undefined,
        lessons: [],
        level: 'Beginner' as const,
        status: 'draft' as const,
      };
      const { course } = moduleId
        ? await api.courses.update(moduleId, {
          ...details,
          lessons,
          status: 'draft',
        })
        : await api.courses.create(details);
      setModuleId(course.id);
      setCourseStatus('draft');
      setStep(2);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save module.');
    } finally {
      setBusy(false);
    }
  }

  function addSkill() {
    const skill = skillDraft.trim();
    if (skill.length < 2 || skill.length > 80) {
      setErrorMessage('Enter a skill between 2 and 80 characters.');
      return;
    }
    if (skills.some((existingSkill) => existingSkill.toLocaleLowerCase() === skill.toLocaleLowerCase())) {
      setErrorMessage('This skill has already been added.');
      return;
    }
    if (skills.length >= 12) {
      setErrorMessage('Add up to 12 course skills.');
      return;
    }
    setErrorMessage('');
    setSkills((current) => [...current, skill]);
    setSkillDraft('');
  }

  async function pickLessonFile() {
    setErrorMessage('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: lessonType === 'Video'
          ? ['video/mp4', 'video/quicktime', 'video/x-m4v', 'video/webm']
          : 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      const maxBytes = lessonType === 'Video' ? maxVideoBytes : maxPdfBytes;
      if (file.size !== undefined && file.size > maxBytes) {
        setErrorMessage(lessonType === 'Video' ? 'Choose a video that is 200 MB or smaller.' : 'Choose PDF notes that are 25 MB or smaller.');
        return;
      }
      setLessonFile(file);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not select file.');
    }
  }

  async function addLesson() {
    if (lessonTitle.trim().length < 3 || !lessonDuration.trim()) {
      setErrorMessage('Add a lesson title with at least 3 characters and a duration.');
      return;
    }
    setErrorMessage('');
    setUploadingLesson(true);
    try {
      let file: CourseLesson['file'];
      if (lessonFile) {
        if (!moduleId) throw new Error('Save the module details before uploading lesson files.');
        const kind = lessonType === 'Video' ? 'video' : 'pdf';
        const result = await api.courses.uploadLessonFile(moduleId, kind, {
          uri: lessonFile.uri,
          name: lessonFile.name,
          mimeType: lessonFile.mimeType,
          file: lessonFile.file,
        } satisfies LocalUploadFile);
        file = result.file;
      }
      setLessons((current) => [...current, {
        title: lessonTitle.trim(),
        type: lessonType,
        duration: lessonDuration.trim(),
        ...(file ? { file } : {}),
      }]);
      setLessonTitle('');
      setLessonDuration('');
      setLessonFile(null);
      setAddingLesson(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not add lesson.');
    } finally {
      setUploadingLesson(false);
    }
  }

  async function saveDraftContent() {
    if (!moduleId) {
      setErrorMessage('Save the module details before saving its content.');
      return false;
    }
    if (lessons.length === 0) {
      setErrorMessage('Add at least one lesson before saving your module content.');
      return false;
    }
    const parsedPassMark = Number(passMark);
    if (!Number.isInteger(parsedPassMark) || parsedPassMark < 1 || parsedPassMark > 100) {
      setErrorMessage('Pass mark must be a whole number between 1 and 100.');
      return false;
    }
    if (questions.some((question) => question.prompt.trim().length < 5
      || question.options.length < 2
      || question.options.some((option) => !option.trim())
      || question.correctOption >= question.options.length)) {
      setErrorMessage('Complete every assessment question and all answer choices before saving.');
      return false;
    }
    setErrorMessage('');
    setSaveMessage('');
    setBusy(true);
    try {
      const { assessment } = await api.courses.assessment.save(moduleId, {
        questions: questions.map((question) => ({
          ...question,
          prompt: question.prompt.trim(),
          options: question.options.map((option) => option.trim()),
        })),
        passingScore: parsedPassMark,
      });
      await api.courses.update(moduleId, {
        lessons,
        assessment: {
          assessmentId: assessment.id,
          questionCount: questions.length,
          passMark: parsedPassMark,
        },
      });
      setCourseStatus('draft');
      setSaveMessage('Draft saved. Your lessons and assessment are ready to continue editing.');
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save module content.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveLessonsAndContinue() {
    if (await saveDraftContent()) setStep(3);
  }

  async function submitForApproval() {
    if (!moduleId) return;
    setErrorMessage('');
    setBusy(true);
    try {
      await api.courses.update(moduleId, { status: 'submitted' });
      setStep(4);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Submission failed.');
    } finally {
      setBusy(false);
    }
  }

  function goBack() {
    if (step === 1) {
      router.back();
      return;
    }
    setStep(step - 1);
  }

  function updateQuestion(index: number, update: (question: CourseAssessmentQuestion) => CourseAssessmentQuestion) {
    setQuestions((current) => current.map((question, itemIndex) => itemIndex === index ? update(question) : question));
  }

  const totalMinutes = lessons.reduce((total, lesson) => {
    const minutes = Number.parseInt(lesson.duration, 10);
    return total + (Number.isFinite(minutes) ? minutes : 0);
  }, 0);

  if (loadingCourse) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F7F7F2] px-6">
        <Text className="text-sm font-bold text-[#14543E]">Loading your draft…</Text>
      </View>
    );
  }

  if (step === 4) {
    return (
      <View className="flex-1 bg-[#F7F7F2] px-6 pt-16">
        <Pressable onPress={() => router.replace('/manage-courses')} className="mb-8 h-11 w-11 items-center justify-center rounded-xl border border-[#DDE4DC] bg-white">
          <Text className="text-xl text-[#103D2B]">‹</Text>
        </Pressable>
        <View className="items-center pt-10">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-[#F5EAD4]"><Text className="text-3xl text-[#806022]">◷</Text></View>
          <Text className="mt-6 rounded-full bg-[#F5EAD4] px-3 py-1 text-[10px] font-extrabold text-[#806022]">UNDER REVIEW</Text>
          <Text className="mt-5 text-center text-2xl font-extrabold text-[#103D2B]">Your module is with our review team</Text>
          <Text className="mt-3 text-center leading-6 text-[#717A74]">{title} was submitted. Reviews usually take 2–3 working days.</Text>
          <View className="mt-8 w-full rounded-2xl bg-white p-5">
            <Text className="font-bold text-[#252B27]">Submitted</Text>
            <Text className="mt-1 text-xs text-[#717A74]">Administrator review is in progress</Text>
          </View>
          <Pressable onPress={() => router.replace('/manage-courses')} className="mt-8 w-full items-center rounded-xl bg-[#14543E] py-4">
            <Text className="font-bold text-white">Return to my content</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F7F7F2]">
      <View className="flex-row items-center gap-3 px-5 pt-12">
        <Pressable onPress={goBack} className="h-10 w-10 items-center justify-center rounded-xl border border-[#DDE4DC] bg-white">
          <Text className="text-xl text-[#103D2B]">‹</Text>
        </Pressable>
        <View>
          <Text className="text-[17px] font-extrabold text-[#103D2B]">{step === 1 ? 'Create module' : step === 2 ? 'Build your module' : 'Module preview'}</Text>
          {step < 3 && <Text className="mt-1 text-[10px] text-[#717A74]">Step {step} of 4 · {step === 1 ? 'Module details' : 'Lessons & assessment'}</Text>}
        </View>
      </View>
      <StepProgress step={step} />
      {errorMessage ? (
        <Text accessibilityRole="alert" className="mx-5 mt-3 rounded-xl bg-[#FBE9E7] px-3 py-2.5 text-[10px] leading-4 text-[#9A382C]">
          {errorMessage}
        </Text>
      ) : null}
      {saveMessage ? (
        <Text accessibilityRole="status" className="mx-5 mt-3 rounded-xl bg-[#EAF1E8] px-3 py-2.5 text-[10px] leading-4 text-[#14543E]">
          {saveMessage}
        </Text>
      ) : null}

      {step === 1 && (
        <ScrollView className="flex-1" contentContainerClassName="gap-4 px-5 pb-8 pt-5">
          <View className="flex-row items-center justify-between">
            <Text className="rounded-full bg-[#E9ECE7] px-2.5 py-1 text-[8px] font-extrabold text-[#69736C]">
              {moduleId ? 'DRAFT SAVED' : 'NEW DRAFT'}
            </Text>
            {courseStatus === 'rejected' && <Text className="text-[9px] font-bold text-[#9A5147]">Changes requested</Text>}
          </View>
          <Pressable onPress={pickCoverImage} className="h-[84px] items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#A9C6AE] bg-[#EAF1E8]">
            {coverUri ? (
              <>
                <Image source={{ uri: coverUri }} className="absolute h-full w-full" resizeMode="cover" />
                <View className="absolute inset-0 bg-black/35" />
                <Text className="font-bold text-white">Change cover image</Text>
              </>
            ) : (
              <>
                <Text className="text-lg text-[#14543E]">↑</Text>
                <Text className="mt-0.5 text-[10px] font-bold text-[#14543E]">Add a cover image</Text>
                <Text className="mt-1 text-[7px] text-[#717A74]">JPG or PNG · Recommended 16:9</Text>
              </>
            )}
          </Pressable>
          <View>
            <FieldLabel>Module title</FieldLabel>
            <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Integrated Pest Management" className="h-[46px] rounded-xl border border-[#E1E5DF] bg-white px-3 text-[12px]" />
          </View>
          <View>
            <FieldLabel>Agricultural category</FieldLabel>
            <Pressable onPress={() => setCategoryPickerVisible(true)} className="h-[46px] flex-row items-center justify-between rounded-xl border border-[#E1E5DF] bg-white px-3">
              <Text className="text-[12px] text-[#252B27]">{category}</Text>
              <Text className="text-[#555E58]">⌄</Text>
            </Pressable>
          </View>
          <View>
            <FieldLabel>Short description</FieldLabel>
            <TextInput value={description} onChangeText={setDescription} multiline textAlignVertical="top" className="min-h-[76px] rounded-xl border border-[#E1E5DF] bg-white px-3 py-3 text-[11px] leading-4 text-[#252B27]" />
          </View>
          <View>
            <FieldLabel>Learning objectives</FieldLabel>
            <TextInput value={objectives} onChangeText={setObjectives} multiline textAlignVertical="top" className="min-h-[76px] rounded-xl border border-[#E1E5DF] bg-white px-3 py-3 text-[11px] leading-4 text-[#252B27]" />
          </View>
          <View>
            <FieldLabel>Skills learners will gain</FieldLabel>
            <Text className="mb-2 text-[9px] leading-4 text-[#717A74]">
              Add practical skills taught by this course. Learners earn them on their Skills Passport after passing the course assessment.
            </Text>
            <View className="flex-row gap-2">
              <TextInput
                accessibilityLabel="Skill learners will gain"
                value={skillDraft}
                onChangeText={setSkillDraft}
                onSubmitEditing={addSkill}
                returnKeyType="done"
                maxLength={80}
                placeholder="e.g. Crop scouting"
                className="h-11 flex-1 rounded-xl border border-[#E1E5DF] bg-white px-3 text-[11px]"
              />
              <Pressable accessibilityRole="button" onPress={addSkill} className="items-center justify-center rounded-xl bg-[#EAF1E8] px-4">
                <Text className="text-[10px] font-bold text-[#14543E]">Add</Text>
              </Pressable>
            </View>
            {skills.length > 0 ? (
              <View className="mt-2 flex-row flex-wrap gap-2">
                {skills.map((skill) => (
                  <View key={skill} className="flex-row items-center rounded-full bg-[#EAF1E8] pl-3 pr-1.5 py-1.5">
                    <Text className="text-[9px] font-bold text-[#14543E]">{skill}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${skill}`}
                      onPress={() => setSkills((current) => current.filter((item) => item !== skill))}
                      className="ml-1.5 h-5 w-5 items-center justify-center rounded-full"
                    >
                      <Text className="text-xs text-[#14543E]">×</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
          <Pressable disabled={busy} onPress={saveModuleDetails} className="mt-1 min-h-12 flex-row items-center justify-center rounded-xl bg-[#14543E]">
            <Text className="font-bold text-white">{busy ? 'Saving…' : 'Save & add lessons  →'}</Text>
          </Pressable>
        </ScrollView>
      )}

      {step === 2 && (
        <ScrollView className="flex-1" contentContainerClassName="gap-4 px-5 pb-8 pt-5">
          <View className="flex-row justify-between rounded-xl bg-white p-4">
            {[[String(lessons.length), 'Lessons'], [`${totalMinutes} min`, 'Learning time'], [String(questions.length), 'Questions']].map(([value, label]) => (
              <View key={label} className="items-center"><Text className="text-base font-extrabold text-[#14543E]">{value}</Text><Text className="mt-1 text-[9px] text-[#717A74]">{label}</Text></View>
            ))}
          </View>
          <Text className="text-base font-extrabold text-[#252B27]">Lessons</Text>
          {lessons.map((lesson, index) => (
            <View key={`${lesson.title}-${index}`} className="flex-row items-center gap-3 rounded-xl border border-[#E1E5DF] bg-white p-3">
              <Text className="h-7 w-7 rounded-full bg-[#EAF1E8] text-center text-xs font-bold leading-7 text-[#14543E]">{index + 1}</Text>
              <View className="flex-1">
                <Text className="text-xs font-bold text-[#252B27]">{lesson.title}</Text>
                <Text className="mt-1 text-[9px] text-[#717A74]">{lesson.type} · {lesson.duration}</Text>
                {lesson.file && <Text numberOfLines={1} className="mt-1 text-[9px] text-[#14543E]">{lesson.file.name}</Text>}
              </View>
              <Pressable onPress={() => setLessons((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Text className="px-2 text-base text-[#9A5147]">×</Text></Pressable>
            </View>
          ))}
          {addingLesson ? (
            <View className="gap-3 rounded-xl border border-[#E1E5DF] bg-white p-4">
              <TextInput value={lessonTitle} onChangeText={setLessonTitle} placeholder="Lesson title" className="rounded-lg border border-[#DDE4DC] px-3 py-3 text-xs" />
              <View className="flex-row gap-2">
                {(['Video', 'Reading'] as const).map((type) => (
                  <Pressable key={type} onPress={() => { setLessonType(type); setLessonFile(null); }} className={`flex-1 items-center rounded-lg border py-2 ${lessonType === type ? 'border-[#14543E] bg-[#EAF1E8]' : 'border-[#DDE4DC]'}`}>
                    <Text className="text-xs text-[#14543E]">{type}</Text>
                  </Pressable>
                ))}
                <TextInput value={lessonDuration} onChangeText={setLessonDuration} placeholder="e.g. 8 min" className="flex-1 rounded-lg border border-[#DDE4DC] px-2 text-xs" />
              </View>
              <Pressable disabled={uploadingLesson} onPress={pickLessonFile} className="items-center rounded-lg border border-dashed border-[#A9C6AE] bg-[#F7FAF6] px-3 py-3">
                <Text numberOfLines={1} className="text-xs font-bold text-[#14543E]">
                  {lessonFile?.name ?? (lessonType === 'Video' ? 'Attach video (MP4, MOV, M4V, WebM)' : 'Attach PDF notes')}
                </Text>
                <Text className="mt-1 text-[9px] text-[#717A74]">
                  {lessonFile ? 'Tap to choose a different file' : lessonType === 'Video' ? 'Up to 200 MB' : 'PDF · Up to 25 MB'}
                </Text>
              </Pressable>
              <Pressable disabled={uploadingLesson} onPress={addLesson} className={`items-center rounded-lg bg-[#14543E] py-3 ${uploadingLesson ? 'opacity-60' : ''}`}>
                <Text className="font-bold text-white">{uploadingLesson ? 'Uploading…' : 'Save lesson'}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setAddingLesson(true)} className="items-center rounded-xl border border-dashed border-[#A9C6AE] bg-white py-3">
              <Text className="text-xs font-bold text-[#14543E]">＋ Add lesson</Text>
            </Pressable>
          )}
          <Text className="mt-2 text-base font-extrabold text-[#252B27]">Final assessment</Text>
          <View className="flex-row items-center justify-between rounded-xl border border-[#E1E5DF] bg-white p-4">
            <View>
              <Text className="text-xs font-bold text-[#252B27]">Knowledge assessment</Text>
              <Text className="mt-1 text-[9px] text-[#717A74]">{questions.length} question{questions.length === 1 ? '' : 's'} · Passing score</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <TextInput
                accessibilityLabel="Assessment passing score"
                value={passMark}
                onChangeText={setPassMark}
                keyboardType="number-pad"
                className="h-10 w-14 rounded-lg border border-[#DDE4DC] bg-white px-2 text-center text-xs"
              />
              <Text className="text-xs font-bold text-[#59635C]">%</Text>
            </View>
          </View>
          {questions.map((question, questionIndex) => (
            <View key={`question-${questionIndex}`} className="gap-2 rounded-xl border border-[#E1E5DF] bg-white p-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-[11px] font-extrabold text-[#252B27]">Question {questionIndex + 1}</Text>
                {questions.length > 1 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove question ${questionIndex + 1}`}
                    onPress={() => setQuestions((current) => current.filter((_, index) => index !== questionIndex))}
                  >
                    <Text className="px-2 text-xs font-bold text-[#9A5147]">Remove</Text>
                  </Pressable>
                )}
              </View>
              <TextInput
                accessibilityLabel={`Question ${questionIndex + 1} prompt`}
                value={question.prompt}
                onChangeText={(prompt) => updateQuestion(questionIndex, (current) => ({ ...current, prompt }))}
                placeholder="Write the question"
                multiline
                className="min-h-10 rounded-lg border border-[#DDE4DC] px-3 py-2 text-xs"
              />
              <Text className="text-[9px] text-[#717A74]">Select the correct answer.</Text>
              {question.options.map((option, optionIndex) => (
                <View key={`option-${questionIndex}-${optionIndex}`} className="flex-row items-center gap-2">
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityLabel={`Mark choice ${optionIndex + 1} correct for question ${questionIndex + 1}`}
                    accessibilityState={{ checked: question.correctOption === optionIndex }}
                    onPress={() => updateQuestion(questionIndex, (current) => ({ ...current, correctOption: optionIndex }))}
                    className={`h-5 w-5 items-center justify-center rounded-full border ${question.correctOption === optionIndex ? 'border-[#14543E]' : 'border-[#AAB3AC]'}`}
                  >
                    {question.correctOption === optionIndex ? <View className="h-2.5 w-2.5 rounded-full bg-[#14543E]" /> : null}
                  </Pressable>
                  <TextInput
                    accessibilityLabel={`Choice ${optionIndex + 1} for question ${questionIndex + 1}`}
                    value={option}
                    onChangeText={(value) => updateQuestion(questionIndex, (current) => ({
                      ...current,
                      options: current.options.map((item, index) => index === optionIndex ? value : item),
                    }))}
                    placeholder={`Answer choice ${optionIndex + 1}`}
                    className="h-10 flex-1 rounded-lg border border-[#DDE4DC] px-3 text-xs"
                  />
                </View>
              ))}
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={() => setQuestions((current) => [...current, { prompt: '', options: ['', '', '', ''], correctOption: 0 }])}
            className="items-center rounded-xl border border-dashed border-[#A9C6AE] bg-white py-3"
          >
            <Text className="text-xs font-bold text-[#14543E]">＋ Add assessment question</Text>
          </Pressable>
          <Pressable disabled={busy} onPress={() => { void saveDraftContent(); }} className="min-h-11 items-center justify-center rounded-xl border border-[#14543E] bg-white">
            <Text className="font-bold text-[#14543E]">{busy ? 'Saving…' : 'Save draft'}</Text>
          </Pressable>
          <Pressable disabled={busy} onPress={saveLessonsAndContinue} className="mt-1 min-h-12 flex-row items-center justify-center rounded-xl bg-[#14543E]">
            <Text className="font-bold text-white">{busy ? 'Saving…' : 'Save & preview module  →'}</Text>
          </Pressable>
        </ScrollView>
      )}

      {step === 3 && (
        <ScrollView className="flex-1" contentContainerClassName="pb-8">
          <View className="mt-4 h-[150px] items-center justify-center overflow-hidden bg-[#DDE8DE]">
            {coverUri ? <Image source={{ uri: coverUri }} className="absolute h-full w-full" resizeMode="cover" /> : null}
            <Text className="text-2xl text-[#14543E]">▶</Text>
          </View>
          <View className="gap-4 px-5 pt-5">
            <Text className="self-start rounded-full bg-[#EAF1E8] px-3 py-1 text-[9px] font-extrabold text-[#14543E]">{category.toUpperCase()}</Text>
            <Text className="text-2xl font-extrabold text-[#103D2B]">{title}</Text>
            <Text className="text-sm leading-5 text-[#717A74]">{description}</Text>
            <View className="flex-row justify-between rounded-xl bg-white p-4">
              {[[`${totalMinutes} min`, 'Duration'], [`${lessons.length} lessons`, 'Content'], [`${questions.length} questions`, 'Assessment']].map(([value, label]) => (
                <View key={label} className="items-center"><Text className="text-xs font-bold text-[#252B27]">{value}</Text><Text className="mt-1 text-[9px] text-[#717A74]">{label}</Text></View>
              ))}
            </View>
            <Text className="text-base font-extrabold text-[#252B27]">Learning objectives</Text>
            {objectives.split('\n').filter(Boolean).map((objective) => (
              <Text key={objective} className="text-xs leading-5 text-[#414943]">✓  {objective}</Text>
            ))}
            {skills.length > 0 ? (
              <View>
                <Text className="text-base font-extrabold text-[#252B27]">Skills learners will gain</Text>
                <View className="mt-2 flex-row flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Text key={skill} className="rounded-full bg-[#EAF1E8] px-3 py-2 text-[9px] font-bold text-[#14543E]">{skill}</Text>
                  ))}
                </View>
              </View>
            ) : null}
            <View className="rounded-xl bg-[#EAF1E8] p-4">
              <Text className="text-xs font-extrabold text-[#14543E]">Ready for review?</Text>
              <Text className="mt-1 text-[10px] leading-4 text-[#59635C]">An administrator will review your lessons and assessment before learners can access this module.</Text>
            </View>
            <Pressable disabled={busy} onPress={submitForApproval} className="min-h-12 flex-row items-center justify-center rounded-xl bg-[#14543E]">
              <Text className="font-bold text-white">{busy ? 'Submitting…' : 'Submit for approval  ↑'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      <Modal visible={categoryPickerVisible} transparent animationType="fade" onRequestClose={() => setCategoryPickerVisible(false)}>
        <Pressable onPress={() => setCategoryPickerVisible(false)} className="flex-1 justify-center bg-black/40 px-5">
          <Pressable className="rounded-2xl bg-white p-4">
            <Text className="mb-3 text-base font-extrabold text-[#103D2B]">Agricultural category</Text>
            {categories.map((option) => (
              <Pressable key={option} onPress={() => { setCategory(option); setCategoryPickerVisible(false); }} className="rounded-lg px-3 py-3">
                <Text className={`text-sm ${category === option ? 'font-bold text-[#14543E]' : 'text-[#252B27]'}`}>{option}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
