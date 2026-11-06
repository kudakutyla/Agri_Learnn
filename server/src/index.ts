import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { z } from 'zod';
import { CourseFile, Role, User } from './types.js';
import { store } from './store.js';

export const app = express();
app.use(cors());
app.use(express.json({ limit: '4mb' }));

const port = Number(process.env.PORT ?? 4000);
const jwtSecret = process.env.JWT_SECRET ?? 'development-only-secret-change-me';
const uploadDirectory = resolve(process.env.UPLOADS_DIR ?? resolve(process.cwd(), 'data', 'uploads'));
const videoMimeTypes: Record<string, string> = {
  '.m4v': 'video/x-m4v',
  '.mov': 'video/quicktime',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};
const pdfMimeType = 'application/pdf';
const videoMaxBytes = 200 * 1024 * 1024;
const pdfMaxBytes = 25 * 1024 * 1024;

class UnsupportedFileError extends Error {}

const fileStorage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    mkdirSync(uploadDirectory, { recursive: true });
    callback(null, uploadDirectory);
  },
  filename: (_req, file, callback) => callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
});

function createFileUpload(kind: 'video' | 'pdf', maxBytes: number) {
  return multer({
    storage: fileStorage,
    limits: { fileSize: maxBytes },
    fileFilter: (_req, file, callback) => {
      const extension = extname(file.originalname).toLowerCase();
      const expectedMimeType = kind === 'pdf' ? pdfMimeType : videoMimeTypes[extension];
      const validMimeType = file.mimetype === expectedMimeType || file.mimetype === 'application/octet-stream';
      if (!expectedMimeType || !validMimeType) {
        callback(new UnsupportedFileError(kind === 'pdf'
          ? 'Choose a PDF notes file.'
          : 'Choose an MP4, MOV, M4V, or WebM video.'));
        return;
      }
      callback(null, true);
    },
  }).single('file');
}

const videoFileUpload = createFileUpload('video', videoMaxBytes);
const pdfFileUpload = createFileUpload('pdf', pdfMaxBytes);

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  password: z.string().min(8).max(72),
  role: z.enum(['learner', 'employer', 'trainer']).default('learner'),
  mobileNumber: z.string().trim().max(30).default(''),
  province: z.string().trim().max(80).default(''),
  category: z.string().trim().max(80).default(''),
  primaryInterest: z.string().trim().max(120).default(''),
});
const loginSchema = registerSchema.pick({ email: true, password: true });

function publicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    mobileNumber: user.mobileNumber ?? '',
    province: user.province ?? '',
    category: user.category ?? '',
    primaryInterest: user.primaryInterest ?? '',
    createdAt: user.createdAt,
  };
}

function signToken(user: User) {
  return jwt.sign({ sub: user.id, role: user.role }, jwtSecret, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  } as jwt.SignOptions);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const payload = jwt.verify(token, jwtSecret) as JwtPayload & { role: Role };
    const user = store.users.all().find((candidate) => candidate.id === payload.sub);
    if (!user) return res.status(401).json({ error: 'Session is invalid' });
    res.locals.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: 'Token is invalid or expired' });
  }
}

function requireRole(...allowed: Role[]) {
  return (_req: Request, res: Response, next: NextFunction) => {
    if (!allowed.includes(res.locals.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    return next();
  };
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'AgriLearn API' }));

app.post('/api/auth/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid registration details' });
  const email = parsed.data.email.toLowerCase();
  if (store.users.findByEmail(email)) return res.status(409).json({ error: 'An account with this email already exists' });
  const user = store.users.create({
    name: parsed.data.name,
    email,
    passwordHash: await bcrypt.hash(parsed.data.password, 12),
    role: parsed.data.role,
    mobileNumber: parsed.data.mobileNumber,
    province: parsed.data.province,
    category: parsed.data.category,
    primaryInterest: parsed.data.primaryInterest,
  });
  return res.status(201).json({ user: publicUser(user), token: signToken(user) });
});

app.post('/api/auth/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid login details' });
  const user = store.users.findByEmail(parsed.data.email.toLowerCase());
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return res.status(401).json({ error: 'Email or password is incorrect' });
  }
  return res.json({ user: publicUser(user), token: signToken(user) });
});

app.get('/api/me', requireAuth, (req, res) => res.json({ user: publicUser(res.locals.user as User) }));
const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  mobileNumber: z.string().trim().max(30),
  province: z.string().trim().max(80),
  category: z.string().trim().max(80),
  primaryInterest: z.string().trim().max(120),
  currentPassword: z.string().max(72).optional(),
  newPassword: z.string().min(8).max(72).optional(),
});
app.patch('/api/me', requireAuth, async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Check your profile details and try again.' });
  const currentUser = res.locals.user as User;
  const email = parsed.data.email.toLowerCase();
  const existingUser = store.users.findByEmail(email);
  if (existingUser && existingUser.id !== currentUser.id) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }
  if (parsed.data.newPassword) {
    if (!parsed.data.currentPassword || !(await bcrypt.compare(parsed.data.currentPassword, currentUser.passwordHash))) {
      return res.status(400).json({ error: 'Enter your current password to change it.' });
    }
  } else if (parsed.data.currentPassword) {
    return res.status(400).json({ error: 'Enter a new password as well.' });
  }
  const { currentPassword: _currentPassword, newPassword, ...profile } = parsed.data;
  const passwordHash = newPassword ? await bcrypt.hash(newPassword, 12) : undefined;
  const user = store.users.updateProfile(currentUser.id, {
    ...profile,
    email,
    ...(passwordHash ? { passwordHash } : {}),
  });
  if (!user) return res.status(404).json({ error: 'Account not found' });
  return res.json({ user: publicUser(user) });
});

app.get('/api/admin/users', requireAuth, requireRole('admin'), (_req, res) => {
  res.json({ users: store.users.all().map(publicUser) });
});

app.get('/api/admin/approvals', requireAuth, requireRole('admin'), (_req, res) => {
  const users = store.users.all();
  const userNames = new Map(users.map((user) => [user.id, user.name]));
  const reviews = store.list('courseReviews');
  const courses = store.list('courses')
    .filter((course) => course.status === 'submitted' || course.status === 'approved' || course.status === 'rejected')
    .sort((left, right) => String(right.updatedAt ?? right.createdAt ?? '').localeCompare(String(left.updatedAt ?? left.createdAt ?? '')))
    .map((course) => ({
      ...course,
      ownerName: userNames.get(String(course.ownerId)) ?? 'Unknown trainer',
      reviews: reviews
        .filter((review) => review.courseId === course.id)
        .map((review) => ({
          ...review,
          reviewerName: userNames.get(String(review.reviewerId)) ?? 'Administrator',
        })),
      reviewNote: [...reviews].reverse().find((review) =>
        review.courseId === course.id && review.status === 'rejected')?.note ?? '',
    }));
  return res.json({ courses });
});

app.get('/api/trainer/courses', requireAuth, requireRole('trainer'), (req, res) => {
  const reviews = store.list('courseReviews');
  const courses = store.list('courses')
    .filter((course) => course.ownerId === res.locals.user.id)
    .map((course) => ({
      ...course,
      reviewNote: [...reviews].reverse().find((review) =>
        review.courseId === course.id && review.status === 'rejected')?.note ?? '',
    }));
  return res.json({ courses });
});

const courseReviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  note: z.string().trim().max(500).default(''),
}).refine((review) => review.status !== 'rejected' || review.note.length >= 5, {
  message: 'Add at least 5 characters of feedback when returning a course.',
});
app.post('/api/admin/approvals/:courseId', requireAuth, requireRole('admin'), (req, res) => {
  const parsed = courseReviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid review details' });
  const courseId = String(req.params.courseId);
  const course = store.list('courses').find((item) => item.id === courseId);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (course.status !== 'submitted') return res.status(409).json({ error: 'Only submitted courses can be reviewed' });
  const result = store.reviewCourse(courseId, {
    reviewerId: res.locals.user.id,
    status: parsed.data.status,
    note: parsed.data.note,
  });
  if (!result) return res.status(409).json({ error: 'This course has already been reviewed' });
  const users = store.users.all();
  const courseReviews = store.list('courseReviews')
    .filter((review) => review.courseId === courseId)
    .map((review) => ({
      ...review,
      reviewerName: users.find((user) => user.id === review.reviewerId)?.name ?? 'Administrator',
    }));
  return res.json({
    course: {
      ...result.course,
      ownerName: users.find((user) => user.id === result.course.ownerId)?.name ?? 'Unknown trainer',
      reviews: courseReviews,
      reviewNote: parsed.data.status === 'rejected' ? parsed.data.note : '',
    },
    review: {
      ...result.review,
      reviewerName: res.locals.user.name,
    },
  });
});

app.get('/api/admin/overview', requireAuth, requireRole('admin'), (_req, res) => {
  const users = store.users.all();
  const courses = store.list('courses');
  const jobs = store.list('jobs');
  const certificates = store.list('certificates');
  const learnerUsers = users.filter((user) => user.role === 'learner');
  const monthStarts = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    date.setMonth(date.getMonth() - (5 - index));
    return date;
  });
  const learnerGrowth = monthStarts.map((start, index) => {
    const end = monthStarts[index + 1] ?? new Date(start.getFullYear(), start.getMonth() + 1, 1);
    return {
      month: start.toLocaleDateString('en', { month: 'short' }),
      learners: learnerUsers.filter((user) => {
        const createdAt = new Date(user.createdAt);
        return createdAt >= start && createdAt < end;
      }).length,
    };
  });
  const userNames = new Map(users.map((user) => [user.id, user.name]));
  const recentActivity = [
    ...courses
      .filter((course) => course.status === 'submitted')
      .map((course) => ({
        type: 'approval' as const,
        title: `New module submitted by ${userNames.get(String(course.ownerId)) ?? 'a trainer'}`,
        createdAt: String(course.createdAt ?? ''),
      })),
    ...learnerUsers.map((user) => ({
      type: 'learner' as const,
      title: `${user.name} registered as a learner`,
      createdAt: user.createdAt,
    })),
    ...jobs.map((job) => ({
      type: 'vacancy' as const,
      title: `${userNames.get(String(job.ownerId)) ?? 'An employer'} posted a vacancy`,
      createdAt: String(job.createdAt ?? ''),
    })),
  ]
    .filter((activity) => !Number.isNaN(Date.parse(activity.createdAt)))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 4);

  return res.json({
    metrics: {
      registeredLearners: learnerUsers.length,
      publishedModules: courses.filter((course) => course.status === 'approved').length,
      certificatesIssued: certificates.length,
      registeredSMMEs: users.filter((user) => user.role === 'employer').length,
      pendingApprovals: courses.filter((course) => course.status === 'submitted').length,
    },
    learnerGrowth,
    recentActivity,
  });
});

app.get('/api/admin/reports', requireAuth, requireRole('admin'), (_req, res) => {
  const learners = store.users.all().filter((user) => user.role === 'learner');
  const learnerIds = new Set(learners.map((user) => user.id));
  const courses = new Map(store.list('courses').map((course) => [String(course.id), course]));
  const progressRecords = store.list('progress');
  const attempts = store.list('attempts');
  const now = new Date();
  const activeSince = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const activeLearnerIds = new Set<string>();
  const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6));
  const dailyLearnerIds = Array.from({ length: 7 }, () => new Set<string>());
  const dailyDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setUTCDate(date.getUTCDate() + index);
    return date;
  });
  const activityEvents = [
    ...progressRecords.map((record) => ({
      userId: String(record.userId ?? ''),
      occurredAt: String(record.updatedAt ?? record.createdAt ?? ''),
    })),
    ...attempts.map((record) => ({
      userId: String(record.userId ?? ''),
      occurredAt: String(record.createdAt ?? ''),
    })),
  ];

  for (const event of activityEvents) {
    if (!learnerIds.has(event.userId)) continue;
    const occurredAt = new Date(event.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) continue;
    if (occurredAt >= activeSince && occurredAt <= now) activeLearnerIds.add(event.userId);
    const dayIndex = Math.floor((Date.UTC(occurredAt.getUTCFullYear(), occurredAt.getUTCMonth(), occurredAt.getUTCDate()) - weekStart.getTime()) / (24 * 60 * 60 * 1000));
    if (dayIndex >= 0 && dayIndex < dailyLearnerIds.length) dailyLearnerIds[dayIndex]?.add(event.userId);
  }

  const completionRates = progressRecords.flatMap((record) => {
    const course = courses.get(String(record.courseId ?? ''));
    const lessons = Array.isArray(course?.lessons) ? course.lessons : [];
    if (lessons.length === 0) return [];
    const completedLessons = Array.isArray(record.completedLessons)
      ? new Set(record.completedLessons.filter((index): index is number =>
        typeof index === 'number' && Number.isInteger(index) && index >= 0 && index < lessons.length))
      : new Set<number>();
    return [completedLessons.size / lessons.length];
  });
  const averageCompletionRate = completionRates.length
    ? Math.round(completionRates.reduce((sum, rate) => sum + rate, 0) / completionRates.length * 100)
    : null;

  return res.json({
    generatedAt: now.toISOString(),
    activeLearners: activeLearnerIds.size,
    activeLearnerWindowDays: 30,
    learningPerformance: dailyDates.map((date, index) => ({
      day: date.toLocaleDateString('en', { weekday: 'short', timeZone: 'UTC' }),
      activeLearners: dailyLearnerIds[index]?.size ?? 0,
    })),
    certificatesIssued: store.list('certificates').length,
    averageCompletionRate,
    completionRateEnrollmentCount: completionRates.length,
    activeOpportunities: store.list('jobs').filter((job) => job.status === 'open').length,
  });
});

const courseTitleSchema = z.string().trim().min(3).max(120);
const courseCategorySchema = z.string().trim().min(2).max(80);
const courseDescriptionSchema = z.string().trim().max(2000);
const courseImageSchema = z.string().max(3_000_000).regex(/^data:image\/(jpeg|png);base64,/);
const courseLessonSchema = z.object({
  title: z.string().trim().min(3).max(120),
  type: z.enum(['Video', 'Reading']),
  duration: z.string().trim().min(1).max(40),
  file: z.object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(180),
    mimeType: z.string().trim().min(1).max(80),
    size: z.number().int().positive(),
  }).optional(),
});
const courseLessonsSchema = z.array(courseLessonSchema).max(30);
const courseAssessmentSchema = z.object({
  assessmentId: z.string().uuid().optional(),
  questionCount: z.number().int().min(1).max(100),
  passMark: z.number().int().min(1).max(100),
});
const courseLevelSchema = z.enum(['Beginner', 'Intermediate', 'Advanced']);
const courseStatusSchema = z.enum(['draft', 'submitted', 'approved', 'rejected']);
const courseSkillsSchema = z.array(z.string().trim().min(2).max(80)).max(12)
  .refine((skills) => new Set(skills.map((skill) => skill.toLocaleLowerCase())).size === skills.length);
const courseSchema = z.object({
  title: courseTitleSchema,
  category: courseCategorySchema,
  description: courseDescriptionSchema.default(''),
  objectives: courseDescriptionSchema.default(''),
  skills: courseSkillsSchema.default([]),
  coverImage: courseImageSchema.optional(),
  lessons: courseLessonsSchema.default([]),
  assessment: courseAssessmentSchema.optional(),
  level: courseLevelSchema.default('Beginner'),
  status: courseStatusSchema.default('draft'),
});
const courseUpdateSchema = z.object({
  title: courseTitleSchema.optional(),
  category: courseCategorySchema.optional(),
  description: courseDescriptionSchema.optional(),
  objectives: courseDescriptionSchema.optional(),
  skills: courseSkillsSchema.optional(),
  coverImage: courseImageSchema.optional(),
  lessons: courseLessonsSchema.optional(),
  assessment: courseAssessmentSchema.optional(),
  level: courseLevelSchema.optional(),
  status: courseStatusSchema.optional(),
});
const jobSchema = z.object({
  title: z.string().trim().min(3).max(120),
  location: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(3000),
  requiredSkills: z.array(z.string().trim().min(2).max(80)).max(12).default([]),
  type: z.enum(['Full-time', 'Part-time', 'Contract', 'Project']).default('Full-time'),
  status: z.enum(['open', 'closed']).default('open'),
});
const categorySchema = z.object({ name: z.string().trim().min(2).max(80), slug: z.string().trim().regex(/^[a-z0-9-]+$/) });

app.get('/api/courses', (req, res) => {
  const courses = store.list('courses');
  if (req.query.published === 'true') {
    return res.json({ courses: courses.filter((course) => course.status === 'approved') });
  }
  return res.json({ courses });
});
app.post('/api/courses', requireAuth, requireRole('trainer', 'admin'), (req, res) => {
  const parsed = courseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid course details' });
  return res.status(201).json({ course: store.create('courses', { ...parsed.data, ownerId: res.locals.user.id }) });
});
app.post('/api/courses/:id/uploads', requireAuth, requireRole('trainer', 'admin'), (req, res, next) => {
  const courseId = String(req.params.id);
  const course = store.list('courses').find((item) => item.id === courseId);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (res.locals.user.role !== 'admin' && course.ownerId !== res.locals.user.id) {
    return res.status(403).json({ error: 'Cannot upload files to another trainer’s course' });
  }

  const kind = req.header('x-upload-kind');
  if (kind !== 'video' && kind !== 'pdf') return res.status(400).json({ error: 'Choose a video or PDF upload type' });
  const upload = kind === 'video' ? videoFileUpload : pdfFileUpload;
  return upload(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? kind === 'video' ? 'Video files must be 200 MB or smaller.' : 'PDF notes must be 25 MB or smaller.'
        : 'Choose a single file to upload.';
      return res.status(status).json({ error: message });
    }
    if (error instanceof UnsupportedFileError) return res.status(415).json({ error: error.message });
    if (error) return next(error);
    if (!req.file) return res.status(400).json({ error: 'Choose a file to upload' });

    const extension = extname(req.file.originalname).toLowerCase();
    const file: CourseFile = {
      id: req.file.filename.slice(0, -extension.length),
      name: req.file.originalname.split(/[\\/]/).pop()?.trim().slice(0, 180) || 'course-file',
      mimeType: kind === 'pdf' ? pdfMimeType : videoMimeTypes[extension],
      size: req.file.size,
    };
    const files = Array.isArray(course.files) ? course.files as CourseFile[] : [];
    store.update('courses', courseId, { files: [...files, file] });
    return res.status(201).json({ file });
  });
});
app.get('/api/courses/:id/files/:fileId', (req, res, next) => {
  const course = store.list('courses').find((item) => item.id === String(req.params.id));
  if (!course) return res.status(404).json({ error: 'Course not found' });
  res.locals.course = course;
  if (course.status === 'approved') return next();
  return requireAuth(req, res, next);
}, (req, res) => {
  const course = res.locals.course as Record<string, unknown>;
  if (res.locals.user && res.locals.user.role !== 'admin' && course.ownerId !== res.locals.user.id) {
    return res.status(403).json({ error: 'Cannot access another trainer’s course files' });
  }
  const lessons = Array.isArray(course.lessons) ? course.lessons as Array<{ file?: CourseFile }> : [];
  const files = Array.isArray(course.files) ? course.files as CourseFile[] : [];
  const file = files.find((item) => item.id === String(req.params.fileId));
  if (!file) return res.status(404).json({ error: 'Course file not found' });
  if (course.status === 'approved' && !lessons.some((lesson) => lesson.file?.id === file.id)) {
    return res.status(404).json({ error: 'Course file not found' });
  }
  const extension = Object.entries(videoMimeTypes).find(([, mimeType]) => mimeType === file.mimeType)?.[0]
    ?? (file.mimeType === pdfMimeType ? '.pdf' : undefined);
  if (!extension) return res.status(404).json({ error: 'Course file not found' });
  const filePath = resolve(uploadDirectory, `${file.id}${extension}`);
  if (!existsSync(filePath)) return res.status(404).json({ error: 'Course file is missing' });
  if (req.query.download === '1') return res.download(filePath, file.name);
  res.type(file.mimeType);
  return res.sendFile(filePath);
});
app.patch('/api/courses/:id', requireAuth, requireRole('trainer', 'admin'), (req, res) => {
  const courseId = String(req.params.id);
  const record = store.list('courses').find((item) => item.id === courseId) as Record<string, unknown> | undefined;
  if (!record) return res.status(404).json({ error: 'Course not found' });
  if (res.locals.user.role !== 'admin' && record.ownerId !== res.locals.user.id) return res.status(403).json({ error: 'Cannot edit another trainer’s course' });
  const parsed = courseUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid course details' });
  if (res.locals.user.role !== 'admin') {
    if (parsed.data.status === 'approved' || parsed.data.status === 'rejected') {
      return res.status(403).json({ error: 'Only an administrator can approve or reject course content' });
    }
    if (record.status === 'submitted' && Object.keys(parsed.data).some((key) => key !== 'status')) {
      return res.status(409).json({ error: 'Submitted content cannot be edited until it has been reviewed' });
    }
    if (parsed.data.status === 'submitted') {
      const lessonList = parsed.data.lessons ?? record.lessons;
      const assessmentInfo = parsed.data.assessment ?? record.assessment;
      const assessment = store.list('assessments').find((item) => item.courseId === courseId && item.ownerId === res.locals.user.id);
      const savedAssessmentInfo = assessmentInfo && typeof assessmentInfo === 'object'
        ? assessmentInfo as { assessmentId?: string; questionCount?: number; passMark?: number }
        : undefined;
      if (!Array.isArray(lessonList) || lessonList.length === 0
        || !savedAssessmentInfo || !assessment
        || assessment.id !== savedAssessmentInfo.assessmentId
        || !Array.isArray(assessment.questions)
        || assessment.questions.length === 0
        || assessment.questions.length !== savedAssessmentInfo.questionCount
        || assessment.passingScore !== savedAssessmentInfo.passMark) {
        return res.status(400).json({ error: 'Add at least one lesson and a saved assessment before submitting for review' });
      }
    }
  }
  const updated = store.update('courses', courseId, parsed.data);
  return res.json({ course: updated });
});

const assessmentSchema = z.object({
  questions: z.array(z.object({
    prompt: z.string().trim().min(5).max(500),
    options: z.array(z.string().trim().min(1).max(200)).min(2).max(6),
    correctOption: z.number().int().min(0),
  }).superRefine((question, context) => {
    if (question.correctOption >= question.options.length) {
      context.addIssue({ code: 'custom', message: 'Correct option must match one of the question choices', path: ['correctOption'] });
    }
    if (new Set(question.options.map((option) => option.toLowerCase())).size !== question.options.length) {
      context.addIssue({ code: 'custom', message: 'Question choices must be unique', path: ['options'] });
    }
  })).min(1).max(100),
  passingScore: z.number().int().min(1).max(100),
});

app.get('/api/courses/:id/assessments', requireAuth, requireRole('trainer', 'admin'), (req, res) => {
  const courseId = String(req.params.id);
  const course = store.list('courses').find((item) => item.id === courseId);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (res.locals.user.role !== 'admin' && course.ownerId !== res.locals.user.id) {
    return res.status(403).json({ error: 'Cannot access another trainer’s assessment' });
  }
  const assessment = store.list('assessments').find((item) => item.courseId === courseId && item.ownerId === course.ownerId) ?? null;
  return res.json({ assessment });
});

app.get('/api/courses/:id/learner-assessment', requireAuth, requireRole('learner', 'employer'), (req, res) => {
  const courseId = String(req.params.id);
  const course = store.list('courses').find((item) => item.id === courseId && item.status === 'approved');
  if (!course) return res.status(404).json({ error: 'Published course not found' });
  const lessons = Array.isArray(course.lessons) ? course.lessons : [];
  const progress = store.list('progress').find((item) =>
    item.courseId === courseId && item.userId === res.locals.user.id);
  const completedLessons = Array.isArray(progress?.completedLessons) ? progress.completedLessons : [];
  if (lessons.length === 0 || completedLessons.length !== lessons.length) {
    return res.status(409).json({ error: 'Complete all course lessons before starting the assessment' });
  }
  const assessment = store.list('assessments').find((item) => item.courseId === courseId && item.ownerId === course.ownerId);
  if (!assessment) return res.status(404).json({ error: 'This course does not have an assessment yet' });
  const questions = Array.isArray(assessment.questions)
    ? assessment.questions.map((question) => {
      const { correctOption: _correctOption, ...publicQuestion } = question as {
        correctOption: number;
        prompt: string;
        options: string[];
      };
      return publicQuestion;
    })
    : [];
  return res.json({
    course: { id: course.id, title: course.title, category: course.category },
    assessment: { id: assessment.id, questions, passingScore: assessment.passingScore },
  });
});

app.post('/api/courses/:id/enrol', requireAuth, requireRole('learner', 'employer'), (req, res) => {
  const courseId = String(req.params.id);
  const course = store.list('courses').find((item) => item.id === courseId && item.status === 'approved');
  if (!course) return res.status(404).json({ error: 'Published course not found' });

  const existing = store.list('progress').find((item) =>
    item.courseId === courseId && item.userId === res.locals.user.id);
  if (existing) {
    const progress = existing.enrolledAt
      ? existing
      : store.update('progress', String(existing.id), { enrolledAt: new Date().toISOString() });
    if (!progress) return res.status(500).json({ error: 'Course enrolment could not be saved' });
    return res.json({ progress, enrolled: false });
  }

  const progress = store.create('progress', {
    courseId,
    userId: res.locals.user.id,
    completedLessons: [],
    enrolledAt: new Date().toISOString(),
  });
  return res.status(201).json({ progress, enrolled: true });
});

app.post('/api/courses/:id/lessons/:lessonIndex/complete', requireAuth, requireRole('learner', 'employer'), (req, res) => {
  const courseId = String(req.params.id);
  const lessonIndex = Number(req.params.lessonIndex);
  const course = store.list('courses').find((item) => item.id === courseId && item.status === 'approved');
  if (!course) return res.status(404).json({ error: 'Published course not found' });
  const lessons = Array.isArray(course.lessons) ? course.lessons : [];
  if (!Number.isInteger(lessonIndex) || lessonIndex < 0 || lessonIndex >= lessons.length) {
    return res.status(400).json({ error: 'Lesson index is invalid' });
  }

  const existing = store.list('progress').find((item) =>
    item.courseId === courseId && item.userId === res.locals.user.id);
  const completedLessons = Array.isArray(existing?.completedLessons)
    ? existing.completedLessons.filter((index): index is number => Number.isInteger(index))
    : [];
  if (!completedLessons.includes(lessonIndex)) {
    if (lessonIndex !== completedLessons.length) {
      return res.status(409).json({ error: 'Complete lessons in order' });
    }
    completedLessons.push(lessonIndex);
  }
  const progress = existing
    ? store.update('progress', String(existing.id), { completedLessons })
    : store.create('progress', { courseId, userId: res.locals.user.id, completedLessons });
  if (!progress) return res.status(500).json({ error: 'Lesson progress could not be saved' });
  return res.json({
    progress,
    completed: completedLessons.length === lessons.length,
  });
});

app.put('/api/courses/:id/assessments', requireAuth, requireRole('trainer', 'admin'), (req, res) => {
  const courseId = String(req.params.id);
  const course = store.list('courses').find((item) => item.id === courseId);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (res.locals.user.role !== 'admin' && course.ownerId !== res.locals.user.id) {
    return res.status(403).json({ error: 'Cannot edit another trainer’s assessment' });
  }
  if (course.status === 'submitted' && res.locals.user.role !== 'admin') {
    return res.status(409).json({ error: 'Submitted content cannot be edited until it has been reviewed' });
  }
  const parsed = assessmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Assessment questions or passing score are invalid' });
  const existing = store.list('assessments').find((item) => item.courseId === courseId && item.ownerId === course.ownerId);
  const assessment = existing
    ? store.update('assessments', String(existing.id), parsed.data)
    : store.create('assessments', { ...parsed.data, courseId, ownerId: course.ownerId });
  if (!assessment) return res.status(500).json({ error: 'Assessment could not be saved' });
  return res.json({ assessment });
});
app.delete('/api/courses/:id', requireAuth, requireRole('trainer', 'admin'), (req, res) => {
  const courseId = String(req.params.id);
  const record = store.list('courses').find((item) => item.id === courseId) as Record<string, unknown> | undefined;
  if (!record) return res.status(404).json({ error: 'Course not found' });
  if (res.locals.user.role !== 'admin' && record.ownerId !== res.locals.user.id) return res.status(403).json({ error: 'Cannot delete another trainer’s course' });
  const lessons = Array.isArray(record.lessons) ? record.lessons as Array<{ file?: CourseFile }> : [];
  const files = Array.isArray(record.files) ? record.files as CourseFile[] : [];
  const courseFiles = new Map(files.map((file) => [file.id, file]));
  for (const lesson of lessons) {
    if (lesson.file) courseFiles.set(lesson.file.id, lesson.file);
  }
  for (const file of courseFiles.values()) {
    const extension = Object.entries(videoMimeTypes).find(([, mimeType]) => mimeType === file.mimeType)?.[0]
      ?? (file.mimeType === pdfMimeType ? '.pdf' : undefined);
    if (extension) {
      const filePath = resolve(uploadDirectory, `${file.id}${extension}`);
      if (existsSync(filePath)) unlinkSync(filePath);
    }
  }
  store.remove('courses', courseId);
  return res.status(204).send();
});

app.get('/api/jobs', (_req, res) => res.json({ jobs: store.list('jobs').filter((job) => job.status === 'open') }));
app.post('/api/jobs', requireAuth, requireRole('employer', 'admin'), (req, res) => {
  const parsed = jobSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid job details' });
  return res.status(201).json({ job: store.create('jobs', { ...parsed.data, ownerId: res.locals.user.id }) });
});

app.get('/api/categories', (_req, res) => res.json({ categories: store.list('categories') }));
app.post('/api/categories', requireAuth, requireRole('admin'), (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid category details' });
  if (store.list('categories').some((item) => item.slug === parsed.data.slug)) return res.status(409).json({ error: 'Category slug already exists' });
  return res.status(201).json({ category: store.create('categories', parsed.data) });
});

app.post('/api/jobs/:jobId/applications', requireAuth, requireRole('learner', 'employer'), (req, res) => {
  const job = store.list('jobs').find((item) => item.id === req.params.jobId);
  if (!job || job.status !== 'open') return res.status(404).json({ error: 'Opportunity not found or closed' });
  if (store.list('applications').some((item) => item.jobId === req.params.jobId && item.userId === res.locals.user.id)) {
    return res.status(409).json({ error: 'Application already submitted' });
  }
  const application = store.create('applications', { jobId: req.params.jobId, userId: res.locals.user.id, status: 'submitted' });
  return res.status(201).json({ application });
});
app.get('/api/applications', requireAuth, (req, res) => {
  const applications = store.list('applications');
  if (res.locals.user.role === 'learner') {
    return res.json({ applications: applications.filter((item) => item.userId === res.locals.user.id) });
  }
  if (res.locals.user.role === 'employer') {
    const ownedJobIds = new Set(
      store.list('jobs')
        .filter((job) => job.ownerId === res.locals.user.id)
        .map((job) => job.id),
    );
    return res.json({
      applications: applications.filter((item) =>
        item.userId === res.locals.user.id || ownedJobIds.has(String(item.jobId))),
    });
  }
  if (res.locals.user.role === 'admin') return res.json({ applications });
  return res.status(403).json({ error: 'Insufficient permissions' });
});

const invitationSchema = z.object({ learnerId: z.string().uuid(), opportunityId: z.string().uuid(), message: z.string().max(500).default('') });
app.post('/api/invitations', requireAuth, requireRole('employer'), (req, res) => {
  const parsed = invitationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid invitation details' });
  const learner = store.users.all().find((user) => user.id === parsed.data.learnerId && user.role === 'learner');
  if (!learner) return res.status(404).json({ error: 'Learner not found' });
  const duplicate = store.list('invitations').some((item) => item.learnerId === parsed.data.learnerId && item.opportunityId === parsed.data.opportunityId && item.status === 'pending');
  if (duplicate) return res.status(409).json({ error: 'An active invitation already exists' });
  return res.status(201).json({ invitation: store.create('invitations', { ...parsed.data, employerId: res.locals.user.id, status: 'pending' }) });
});
app.patch('/api/invitations/:id', requireAuth, requireRole('learner'), (req, res) => {
  const id = String(req.params.id);
  const invitation = store.list('invitations').find((item) => item.id === id);
  if (!invitation || invitation.learnerId !== res.locals.user.id) return res.status(404).json({ error: 'Invitation not found' });
  if (!['accepted', 'declined'].includes(String(req.body.status))) return res.status(400).json({ error: 'Status must be accepted or declined' });
  return res.json({ invitation: store.update('invitations', id, { status: req.body.status }) });
});

app.post('/api/assessments/:id/attempts', requireAuth, requireRole('learner', 'employer'), (req, res) => {
  const assessmentId = String(req.params.id);
  const assessment = store.list('assessments').find((item) => item.id === assessmentId);
  if (!assessment) return res.status(404).json({ error: 'Assessment not found' });
  const course = store.list('courses').find((item) =>
    item.id === assessment.courseId && item.ownerId === assessment.ownerId && item.status === 'approved');
  if (!course) return res.status(404).json({ error: 'Published course not found' });
  const questions = Array.isArray(assessment.questions) ? assessment.questions : [];
  const lessons = Array.isArray(course.lessons) ? course.lessons : [];
  const progress = store.list('progress').find((item) =>
    item.courseId === course.id && item.userId === res.locals.user.id);
  const completedLessons = Array.isArray(progress?.completedLessons) ? progress.completedLessons : [];
  if (lessons.length === 0 || completedLessons.length !== lessons.length) {
    return res.status(409).json({ error: 'Complete all course lessons before submitting the assessment' });
  }
  const parsedAnswers = z.object({
    answers: z.array(z.number().int().min(0).max(5)).max(100),
  }).safeParse(req.body);
  if (!parsedAnswers.success || parsedAnswers.data.answers.length !== questions.length
    || parsedAnswers.data.answers.some((answer, index) => {
      const question = questions[index] as { options?: unknown } | undefined;
      return !Array.isArray(question?.options) || answer >= question.options.length;
    })) {
    return res.status(400).json({ error: 'Answer every question using one of its listed choices' });
  }
  const answers = parsedAnswers.data.answers;
  let correct = 0;
  questions.forEach((question, index) => {
    if (question && typeof question === 'object') {
      const expected = 'correctOption' in question ? question.correctOption : 'answer' in question ? question.answer : undefined;
      if (answers[index] === expected) correct += 1;
    }
  });
  const score = questions.length ? Math.round((correct / questions.length) * 100) : 0;
  const passingScore = Number(assessment.passingScore ?? 70);
  const passed = score >= passingScore;
  const attempt = store.create('attempts', { assessmentId, userId: res.locals.user.id, answers, score, passed });
  let certificate: Record<string, unknown> | null = null;
  if (passed) {
    certificate = store.list('certificates').find((item) =>
      item.userId === res.locals.user.id && item.courseId === course.id) ?? null;
    if (!certificate) {
      const issuedAt = new Date().toISOString();
      certificate = store.create('certificates', {
        userId: res.locals.user.id,
        courseId: course.id,
        title: `${String(course.title)} Certificate`,
        courseTitle: course.title,
        category: course.category,
        skills: Array.isArray(course.skills)
          ? course.skills.filter((skill): skill is string => typeof skill === 'string')
          : [],
        credentialId: randomUUID(),
        issuedAt,
      });
    }
  }
  return res.status(201).json({ attempt, certificate });
});

app.get('/api/certificates', requireAuth, (req, res) => {
  const allCertificates = store.list('certificates');
  if (res.locals.user.role === 'learner' || res.locals.user.role === 'employer') {
    return res.json({ certificates: allCertificates.filter((item) => item.userId === res.locals.user.id) });
  }
  if (res.locals.user.role === 'trainer') {
    const ownedCourseIds = new Set(
      store.list('courses')
        .filter((course) => course.ownerId === res.locals.user.id)
        .map((course) => course.id),
    );
    return res.json({
      certificates: allCertificates.filter((item) => ownedCourseIds.has(String(item.courseId))),
    });
  }
  const certificates = allCertificates;
  return res.json({ certificates });
});

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => console.log(`AgriLearn API listening on http://localhost:${port}`));
}
