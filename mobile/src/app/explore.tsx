import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ImageBackground, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { courses as sampleCourses } from '../data';
import { BottomNav } from '../components/BottomNav';
import { api, type Course } from '../services/api';

const categories = [
  { label: 'All topics', value: 'all' },
  { label: 'Crop Production', value: 'Crop farming' },
  { label: 'Livestock', value: 'Livestock' },
  { label: 'Soil Health', value: 'Soil health' },
  { label: 'Technology', value: 'Technology' },
];

const courseImages = [
  'https://images.unsplash.com/photo-1492496913980-501348b61469?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1529583647475-67602abaa6f2?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1506349103253-e648563ec8b9?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1492496913980-501348b61469?auto=format&fit=crop&w=500&q=80',
];

const sortOptions = ['Recommended', 'A–Z', 'Shortest first'] as const;
type SortOption = (typeof sortOptions)[number];

type ExploreCourse = {
  id: string;
  title: string;
  category: string;
  description: string;
  level: Course['level'];
  duration: string;
  lessons: number;
  objectives: string[];
  skills: string[];
  lessonTitles: string[];
  coverImage?: string;
};

function durationInMinutes(duration: string) {
  const hours = duration.match(/(\d+)\s*h/i);
  const minutes = duration.match(/(\d+)\s*m(?:in)?/i);
  return Number(hours?.[1] ?? 0) * 60 + Number(minutes?.[1] ?? 0);
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return [hours > 0 ? `${hours}h` : '', remainingMinutes > 0 ? `${remainingMinutes}m` : '']
    .filter(Boolean)
    .join(' ') || '0m';
}

function mapPublishedCourse(course: Course): ExploreCourse {
  const lessons = course.lessons ?? [];
  const objectives = (course.objectives ?? '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  return {
    id: course.id,
    title: course.title,
    category: course.category,
    description: course.description,
    level: course.level,
    duration: formatDuration(lessons.reduce((total, lesson) => total + durationInMinutes(lesson.duration), 0)),
    lessons: lessons.length,
    objectives,
    skills: course.skills ?? [],
    lessonTitles: lessons.map((lesson) => lesson.title),
    coverImage: course.coverImage,
  };
}

function mapSampleCourse(course: (typeof sampleCourses)[number]): ExploreCourse {
  const level: Course['level'] = course.level === 'Advanced' || course.level === 'Intermediate'
    ? course.level
    : 'Beginner';
  return {
    ...course,
    level,
    objectives: course.objectives,
    skills: course.skills,
    lessonTitles: course.lessonTitles,
  };
}

function matchesSearch(course: ExploreCourse, query: string) {
  return !query
    || `${course.title} ${course.category} ${course.level} ${course.description} ${course.skills.join(' ')}`
      .toLowerCase().includes(query);
}

export default function ExploreScreen() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState<SortOption>('Recommended');
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [publishedCourses, setPublishedCourses] = useState<ExploreCourse[]>([]);
  const [loadingPublishedCourses, setLoadingPublishedCourses] = useState(true);
  const [publishedCoursesError, setPublishedCoursesError] = useState('');

  async function fetchPublishedCourses() {
    try {
      const result = await api.courses.listPublished();
      setPublishedCourses(result.courses.map(mapPublishedCourse));
    } catch (loadError) {
      setPublishedCoursesError(loadError instanceof Error ? loadError.message : 'Could not load published courses.');
    } finally {
      setLoadingPublishedCourses(false);
    }
  }

  useEffect(() => {
    let active = true;
    api.courses.listPublished()
      .then((result) => {
        if (active) setPublishedCourses(result.courses.map(mapPublishedCourse));
      })
      .catch((loadError: unknown) => {
        if (active) {
          setPublishedCoursesError(loadError instanceof Error ? loadError.message : 'Could not load published courses.');
        }
      })
      .finally(() => {
        if (active) setLoadingPublishedCourses(false);
      });
    return () => { active = false; };
  }, []);

  function retryPublishedCourses() {
    setPublishedCoursesError('');
    setLoadingPublishedCourses(true);
    void fetchPublishedCourses();
  }

  const catalogue = useMemo(() => {
    const sampleIds = new Set(sampleCourses.map((course) => course.id));
    return [...sampleCourses.map(mapSampleCourse), ...publishedCourses.filter((course) => !sampleIds.has(course.id))];
  }, [publishedCourses]);

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matches = catalogue.filter((course) => {
      const matchesCategory = category === 'all' || course.category.toLowerCase() === category.toLowerCase()
        || (category === 'Crop farming' && course.category.toLowerCase() === 'crop production');
      return matchesCategory && matchesSearch(course, query);
    });

    if (sort === 'A–Z') return [...matches].sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'Shortest first') return [...matches].sort((a, b) => durationInMinutes(a.duration) - durationInMinutes(b.duration));
    return matches;
  }, [catalogue, category, search, sort]);

  const featuredCourse = catalogue[0];
  const popularCourses = filteredCourses.filter((course) => course.id !== featuredCourse.id);
  const showFeatured = (category === 'all' || category === featuredCourse.category)
    && matchesSearch(featuredCourse, search.trim().toLowerCase());

  return (
    <View className="flex-1 bg-agrilearn-light dark:bg-[#101814]">
      <ScrollView className="flex-1" contentContainerClassName="pb-6">
        <View className="px-5 pb-4 pt-5">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[22px] font-extrabold text-[#17261E] dark:text-[#F1F4F1]">Explore learning</Text>
              <Text className="mt-0.5 text-[11px] text-[#7B837D] dark:text-[#AAB6AD]">Practical skills for every stage</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sort courses"
              accessibilityState={{ expanded: showSortOptions }}
              onPress={() => setShowSortOptions((visible) => !visible)}
              className={`h-10 w-10 items-center justify-center rounded-[14px] border ${showSortOptions ? 'border-agrilearn-green bg-[#E8F0E7] dark:bg-[#254134]' : 'border-[#E0E5DF] bg-white dark:border-[#35443A] dark:bg-[#1D2922]'}`}
            >
              <View className="items-center gap-[2px]">
                <View className="h-[2px] w-4 rounded-full bg-agrilearn-green" />
                <View className="h-[2px] w-3 rounded-full bg-agrilearn-green" />
                <View className="h-[2px] w-1.5 rounded-full bg-agrilearn-green" />
              </View>
            </Pressable>
          </View>

          <View className="mt-5 h-11 flex-row items-center rounded-xl border border-[#E1E5DF] bg-white px-3 dark:border-[#35443A] dark:bg-[#1D2922]">
            <Text className="mr-2 text-base text-[#78817B]">⌕</Text>
            <TextInput
              accessibilityLabel="Search courses, skills or topics"
              value={search}
              onChangeText={setSearch}
              placeholder="Search courses, skills or topics..."
              placeholderTextColor="#A0A7A1"
              className="h-full flex-1 text-[12px] text-[#252B27] dark:text-[#F1F4F1]"
              returnKeyType="search"
            />
            {search.length > 0 && (
              <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch('')}>
                <Text className="px-1 text-lg text-[#78817B]">×</Text>
              </Pressable>
            )}
          </View>

          {showSortOptions && (
            <View className="mt-2 self-end rounded-xl border border-[#E1E5DF] bg-white p-2 shadow-sm dark:border-[#35443A] dark:bg-[#1D2922]">
              {sortOptions.map((option) => (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sort === option }}
                  onPress={() => {
                    setSort(option);
                    setShowSortOptions(false);
                  }}
                  className="min-w-36 rounded-lg px-3 py-2"
                >
                  <Text className={`text-xs ${sort === option ? 'font-bold text-agrilearn-green dark:text-[#8FC6A4]' : 'text-[#555F58] dark:text-[#C1CCC3]'}`}>{option}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-5 pb-1">
          {categories.map((item) => {
            const selected = category === item.value;
            return (
              <Pressable
                key={item.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setCategory(item.value)}
                className={`rounded-full border px-3.5 py-2 ${selected ? 'border-agrilearn-green bg-agrilearn-green' : 'border-[#E1E5DF] bg-white dark:border-[#35443A] dark:bg-[#1D2922]'}`}
              >
                <Text className={`text-[10px] ${selected ? 'font-bold text-white' : 'text-[#626C65] dark:text-[#C1CCC3]'}`}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View className="px-5 pt-4">
          {showFeatured && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View ${featuredCourse.title} course information`}
              onPress={() => router.push({ pathname: '/course', params: { id: featuredCourse.id } })}
            >
              <ImageBackground
                source={{ uri: featuredCourse.coverImage ?? courseImages[0] }}
                imageStyle={{ borderRadius: 18 }}
                className="h-[188px] overflow-hidden rounded-[18px] bg-[#24543D]"
                resizeMode="cover"
              >
                <View className="flex-1 justify-end bg-black/40 p-4">
                  <Text className="self-start rounded-full bg-[#F6E9C9] px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-wide text-[#72531D]">Featured course</Text>
                  <Text className="mt-2 text-[18px] font-extrabold leading-6 text-white">{featuredCourse.title}</Text>
                  <Text className="mt-1 text-[10px] text-white/85">Build practical skills for a changing climate</Text>
                  <Text className="mt-2 text-[9px] font-semibold text-white">{featuredCourse.lessons} lessons · {featuredCourse.duration}  →</Text>
                </View>
              </ImageBackground>
            </Pressable>
          )}

          <View className="mt-5 flex-row items-center justify-between">
            <Text className="text-[15px] font-extrabold text-[#202923] dark:text-[#F1F4F1]">Popular this month</Text>
            <Text className="text-[9px] text-[#7B837D] dark:text-[#AAB6AD]">{popularCourses.length} {popularCourses.length === 1 ? 'course' : 'courses'}</Text>
          </View>

          {loadingPublishedCourses && (
            <View className="items-center py-4">
              <ActivityIndicator color="#14543E" />
              <Text className="mt-2 text-[10px] text-[#7B837D] dark:text-[#AAB6AD]">Loading published courses…</Text>
            </View>
          )}
          {publishedCoursesError ? (
            <View accessibilityRole="alert" className="mt-3 rounded-xl border border-[#E8D2CD] bg-white p-3 dark:border-[#35443A] dark:bg-[#1D2922]">
              <Text className="text-[10px] text-[#9A5147]">{publishedCoursesError}</Text>
              <Pressable accessibilityRole="button" onPress={retryPublishedCourses}>
                <Text className="mt-2 text-[10px] font-bold text-[#14543E] dark:text-[#8FC6A4]">Try loading again</Text>
              </Pressable>
            </View>
          ) : null}

          {popularCourses.length === 0 ? (
            <Text className="py-10 text-center text-sm text-[#717A74] dark:text-[#AAB6AD]">
              {filteredCourses.length === 0 ? 'No courses match your search.' : 'No more courses in this topic yet.'}
            </Text>
          ) : (
            popularCourses.map((course) => {
              const imageIndex = catalogue.findIndex((item) => item.id === course.id);
              return (
                <Pressable
                  key={course.id}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${course.title} course information`}
                  onPress={() => router.push({ pathname: '/course', params: { id: course.id } })}
                  className="mt-3 h-[94px] flex-row overflow-hidden rounded-[15px] border border-[#E5E8E2] bg-white dark:border-[#35443A] dark:bg-[#1D2922]"
                >
                  <ImageBackground
                    source={{ uri: course.coverImage ?? courseImages[imageIndex % courseImages.length] }}
                    className="w-[92px] bg-[#DDEBDD]"
                    resizeMode="cover"
                  />
                  <View className="flex-1 justify-center px-3">
                    <Text className="text-[8px] font-bold uppercase tracking-[0.7px] text-agrilearn-green">{course.category}</Text>
                    <Text numberOfLines={1} className="mt-1 text-[12px] font-extrabold text-[#252B27] dark:text-[#F1F4F1]">{course.title}</Text>
                    <Text className="mt-1 text-[9px] text-[#818983] dark:text-[#AAB6AD]">◷  {course.duration} · {course.level}</Text>
                  </View>
                  <View className="items-center justify-center px-3">
                    <Text className="text-xl text-[#7DA789]">›</Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
      <BottomNav />
    </View>
  );
}
