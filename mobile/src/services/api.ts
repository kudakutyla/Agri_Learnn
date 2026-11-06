import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { deleteStorageItem, getStorageItem } from './storage';

const configuredUrl = process.env.EXPO_PUBLIC_API_URL;
const host = Constants.expoConfig?.hostUri?.split(':')[0];
export const API_URL = configuredUrl ?? (
  Platform.OS === 'web' ? 'http://localhost:4000' : (host ? `http://${host}:4000` : 'http://localhost:4000')
);

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getStorageItem('agrilearn_token');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({ error: 'The server returned an invalid response' }));
  if (response.status === 401 && !path.startsWith('/api/auth/')) {
    await Promise.all([
      deleteStorageItem('agrilearn_token'),
      deleteStorageItem('agrilearn_role'),
      deleteStorageItem('agrilearn_name'),
      deleteStorageItem('agrilearn_user_id'),
    ]);
    router.replace({
      pathname: '/login',
      params: { reason: token ? 'session-expired' : 'authentication-required' },
    });
    throw new Error(token ? 'Your session expired. Please sign in again.' : 'Sign in to access this page.');
  }
  if (!response.ok) throw new Error(body.error ?? 'Something went wrong');
  return body as T;
}

export const api = {
  register: (data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    mobileNumber?: string;
    province?: string;
    category?: string;
    primaryInterest?: string;
  }) =>
    request<{ user: Profile; token: string }>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request<{ user: Profile; token: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  profile: {
    get: () => request<{ user: Profile }>('/api/me'),
    update: (data: ProfileUpdate) =>
      request<{ user: Profile }>('/api/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },
  admin: {
    overview: () => request<AdminOverview>('/api/admin/overview'),
    reports: () => request<AdminReports>('/api/admin/reports'),
    users: () => request<{ users: Profile[] }>('/api/admin/users'),
    approvals: () => request<{ courses: AdminApprovalCourse[] }>('/api/admin/approvals'),
    reviewCourse: (courseId: string, data: { status: 'approved' | 'rejected'; note?: string }) =>
      request<{ course: AdminApprovalCourse; review: CourseReview }>(`/api/admin/approvals/${courseId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  trainer: {
    courses: {
      list: () => request<{ courses: Course[] }>('/api/trainer/courses'),
    },
  },
  courses: {
    list: () => request<{ courses: Course[] }>('/api/courses'),
    listPublished: () => request<{ courses: Course[] }>('/api/courses?published=true'),
    create: (data: Omit<Course, 'id' | 'ownerId' | 'createdAt'>) =>
      request<{ course: Course }>('/api/courses', { method: 'POST', body: JSON.stringify(data) }),
    uploadLessonFile: async (courseId: string, kind: 'video' | 'pdf', file: LocalUploadFile) => {
      const formData = new FormData();
      if (Platform.OS === 'web') {
        let content = file.file;
        if (!content) {
          const response = await fetch(file.uri);
          if (!response.ok) throw new Error('Could not read the selected file.');
          content = await response.blob();
        }
        formData.append('file', content, file.name);
      } else {
        formData.append('file', {
          uri: file.uri,
          name: file.name,
          type: file.mimeType ?? (kind === 'pdf' ? 'application/pdf' : 'video/mp4'),
        } as unknown as Blob);
      }
      return request<{ file: CourseFile }>(`/api/courses/${courseId}/uploads`, {
        method: 'POST',
        headers: { 'X-Upload-Kind': kind },
        body: formData,
      });
    },
    update: (id: string, data: Partial<Omit<Course, 'id' | 'ownerId' | 'createdAt'>>) =>
      request<{ course: Course }>(`/api/courses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    assessment: {
      get: (courseId: string) =>
        request<{ assessment: CourseAssessment | null }>(`/api/courses/${courseId}/assessments`),
      getForLearner: (courseId: string) =>
        request<{ course: { id: string; title: string; category: string }; assessment: LearnerAssessment }>(
          `/api/courses/${courseId}/learner-assessment`,
        ),
      save: (courseId: string, data: Omit<CourseAssessment, 'id' | 'courseId' | 'ownerId' | 'createdAt'>) =>
        request<{ assessment: CourseAssessment }>(`/api/courses/${courseId}/assessments`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
    },
    lessons: {
      enrol: (courseId: string) =>
        request<{ progress: CourseProgress; enrolled: boolean }>(`/api/courses/${courseId}/enrol`, { method: 'POST' }),
      complete: (courseId: string, lessonIndex: number) =>
        request<{ progress: CourseProgress; completed: boolean }>(
          `/api/courses/${courseId}/lessons/${lessonIndex}/complete`,
          { method: 'POST' },
        ),
    },
    remove: (id: string) => request<void>(`/api/courses/${id}`, { method: 'DELETE' }),
  },
  assessments: {
    submit: (assessmentId: string, answers: number[]) =>
      request<{ attempt: AssessmentAttempt; certificate: Certificate | null }>(
        `/api/assessments/${assessmentId}/attempts`,
        { method: 'POST', body: JSON.stringify({ answers }) },
      ),
  },
  jobs: {
    list: () => request<{ jobs: Job[] }>('/api/jobs'),
  },
  applications: {
    list: () => request<{ applications: Application[] }>('/api/applications'),
    submit: (jobId: string) =>
      request<{ application: Application }>(`/api/jobs/${jobId}/applications`, { method: 'POST' }),
  },
  certificates: {
    list: () => request<{ certificates: Certificate[] }>('/api/certificates'),
  },
};

export type Profile = {
  id: string;
  name: string;
  email: string;
  role: string;
  mobileNumber: string;
  province: string;
  category: string;
  primaryInterest: string;
  createdAt: string;
};

export type ProfileUpdate = Omit<Profile, 'id' | 'role' | 'createdAt'> & {
  currentPassword?: string;
  newPassword?: string;
};

export type AdminOverview = {
  metrics: {
    registeredLearners: number;
    publishedModules: number;
    certificatesIssued: number;
    registeredSMMEs: number;
    pendingApprovals: number;
  };
  learnerGrowth: { month: string; learners: number }[];
  recentActivity: {
    type: 'approval' | 'learner' | 'vacancy';
    title: string;
    createdAt: string;
  }[];
};

export type AdminReports = {
  generatedAt: string;
  activeLearners: number;
  activeLearnerWindowDays: number;
  learningPerformance: { day: string; activeLearners: number }[];
  certificatesIssued: number;
  averageCompletionRate: number | null;
  completionRateEnrollmentCount: number;
  activeOpportunities: number;
};

export type CourseReview = {
  id: string;
  courseId: string;
  reviewerId: string;
  status: 'approved' | 'rejected';
  note: string;
  createdAt: string;
  reviewerName?: string;
};

export type AdminApprovalCourse = Course & {
  ownerName: string;
  updatedAt?: string;
  reviews: CourseReview[];
};

export type Certificate = {
  id: string;
  userId?: string;
  courseId?: string;
  courseTitle?: string;
  title?: string;
  category?: string;
  skills?: string[];
  credentialId?: string;
  issuedAt?: string;
  issueDate?: string;
  points?: number;
};

export type Job = {
  id: string;
  title: string;
  location: string;
  description: string;
  requiredSkills?: string[];
  type: 'Full-time' | 'Part-time' | 'Contract' | 'Project';
  status: 'open' | 'closed';
  ownerId: string;
  createdAt: string;
};

export type Application = {
  id: string;
  jobId: string;
  userId: string;
  status: 'submitted' | 'reviewing' | 'accepted' | 'declined';
  createdAt: string;
};

export type CourseFile = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
};

export type LocalUploadFile = {
  uri: string;
  name: string;
  mimeType?: string;
  file?: Blob;
};

export type Course = {
  id: string;
  ownerId: string;
  title: string;
  category: string;
  description: string;
  objectives?: string;
  skills?: string[];
  coverImage?: string;
  lessons?: CourseLesson[];
  files?: CourseFile[];
  assessment?: { assessmentId?: string; questionCount: number; passMark: number };
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  createdAt?: string;
  reviewNote?: string;
};

export type CourseLesson = {
  title: string;
  type: 'Video' | 'Reading';
  duration: string;
  file?: CourseFile;
};

export type CourseAssessmentQuestion = {
  prompt: string;
  options: string[];
  correctOption: number;
};

export type CourseAssessment = {
  id: string;
  courseId: string;
  ownerId: string;
  questions: CourseAssessmentQuestion[];
  passingScore: number;
  createdAt: string;
};

export type LearnerAssessment = {
  id: string;
  questions: { prompt: string; options: string[] }[];
  passingScore: number;
};

export type AssessmentAttempt = {
  id: string;
  assessmentId: string;
  userId: string;
  answers: number[];
  score: number;
  passed: boolean;
};

export type CourseProgress = {
  id: string;
  courseId: string;
  userId: string;
  completedLessons: number[];
};
