import 'dotenv/config';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { z } from 'zod';
import { CourseFile, Role, User } from './types.js';
import { store } from './store.js';
import { isPasswordResetEmailConfigured, sendPasswordResetEmail } from './email.js';
import {
  abortMultipartUpload,
  beginMultipartUpload,
  completeMultipartUpload,
  createPartUploadUrl,
  createPlaybackUrl,
  createSingleUploadUrl,
  deleteVideoObject,
  getVideoUploadPolicy,
  InvalidVideoContentError,
  R2ConfigurationError,
  R2ObjectMissingError,
  verifyUploadedVideo,
} from './r2.js';

export const app = express();
app.use(cors());
app.use(express.json({ limit: '4mb' }));

const port = Number(process.env.PORT ?? 4000);
const jwtSecret = process.env.JWT_SECRET ?? 'development-only-secret-change-me';
const uploadDirectory = resolve(process.env.UPLOADS_DIR ?? resolve(process.cwd(), 'data', 'uploads'));
const videoMimeTypes: Record<string, string> = {
  '.mov': 'video/quicktime',
  '.mp4': 'video/mp4',
};
const pdfMimeType = 'application/pdf';
const pdfMaxBytes = 25 * 1024 * 1024;

class UnsupportedFileError extends Error {}

const fileStorage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    mkdirSync(uploadDirectory, { recursive: true });
    callback(null, uploadDirectory);
  },
  filename: (_req, file, callback) => callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
});

function createPdfUpload(maxBytes: number) {
  return multer({
    storage: fileStorage,
    limits: { fileSize: maxBytes },
    fileFilter: (_req, file, callback) => {
      const extension = extname(file.originalname).toLowerCase();
      const expectedMimeType = extension === '.pdf' ? pdfMimeType : undefined;
      const validMimeType = file.mimetype === expectedMimeType || file.mimetype === 'application/octet-stream';
      if (!expectedMimeType || !validMimeType) {
        callback(new UnsupportedFileError('Choose a PDF notes file.'));
        return;
      }
      callback(null, true);
    },
  }).single('file');
}

const pdfFileUpload = createPdfUpload(pdfMaxBytes);

const userLanguageSchema = z.enum([
  'Afrikaans',
  'English',
  'isiNdebele',
  'isiXhosa',
  'isiZulu',
  'Sepedi',
  'Sesotho',
  'Setswana',
  'siSwati',
  'Tshivenda',
  'Xitsonga',
  'Other',
]);
const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  password: z.string().min(8).max(72),
  role: z.enum(['learner', 'employer', 'trainer']).default('learner'),
  mobileNumber: z.string().trim().max(30).default(''),
  province: z.string().trim().max(80).default(''),
  category: z.string().trim().max(80).default(''),
  primaryInterest: z.string().trim().max(120).default(''),
  language: userLanguageSchema.default('English'),
});
const loginSchema = registerSchema.pick({ email: true, password: true });
const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(120),
});
const resetPasswordSchema = z.object({
  token: z.string().min(32).max(256),
  newPassword: z.string().min(8).max(72),
  confirmPassword: z.string().min(8).max(72),
}).refine((data) => data.newPassword === data.confirmPassword);

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
    language: user.language ?? 'English',
    createdAt: user.createdAt,
  };
}

function addNotification(userId: string, title: string, message: string) {
  return store.create('notifications', { userId, title, message });
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
    language: parsed.data.language,
  });
  addNotification(user.id, 'Welcome to AgriLearn', `Welcome, ${user.name}! Explore practical courses and grow your skills.`);
  return res.status(201).json({ user: publicUser(user), token: signToken(user) });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (!isPasswordResetEmailConfigured()) {
    return res.status(503).json({ error: 'Password recovery is temporarily unavailable. Please try again later.' });
  }

  const user = store.users.findByEmail(parsed.data.email.toLowerCase());
  if (!user) return res.json({ message: 'If an account exists for that email, a password reset link has been sent.' });

  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  for (const reset of store.list('passwordResets')) {
    if (reset.userId === user.id && typeof reset.id === 'string') {
      store.remove('passwordResets', reset.id);
    }
  }
  store.create('passwordResets', {
    userId: user.id,
    tokenHash,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });

  try {
    const resetUrl = new URL(process.env.PASSWORD_RESET_URL ?? 'agrilearn:///reset-password');
    resetUrl.searchParams.set('token', token);
    await sendPasswordResetEmail({ email: user.email, name: user.name, resetUrl: resetUrl.toString() });
  } catch (error) {
    console.error('Password reset email delivery failed:', error);
  }
  return res.json({ message: 'If an account exists for that email, a password reset link has been sent.' });
});

app.post('/api/auth/reset-password', async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter matching passwords with at least 8 characters.' });
  if (!/^[a-f0-9]{64}$/i.test(parsed.data.token)) {
    return res.status(400).json({ error: 'This password reset link is invalid or has expired. Request a new link and try again.' });
  }
  const tokenHash = createHash('sha256').update(parsed.data.token).digest('hex');
  if (!store.hasValidPasswordReset(tokenHash)) {
    return res.status(400).json({ error: 'This password reset link is invalid or has expired. Request a new link and try again.' });
  }
  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  if (!store.resetPassword(tokenHash, passwordHash)) {
    return res.status(400).json({ error: 'This password reset link is invalid or has expired. Request a new link and try again.' });
  }
  return res.json({ message: 'Your password has been reset. Sign in with your new password.' });
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
app.get('/api/me/notifications', requireAuth, (req, res) => {
  const userId = String(res.locals.user.id);
  const notifications = store.list('notifications')
    .filter((notification) => notification.userId === userId)
    .map((notification, index) => ({ notification, index }))
    .sort((a, b) =>
      String(b.notification.createdAt ?? '').localeCompare(String(a.notification.createdAt ?? ''))
      || b.index - a.index)
    .map(({ notification }) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      createdAt: notification.createdAt,
    }));
  return res.json({ notifications });
});
const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  mobileNumber: z.string().trim().max(30),
  province: z.string().trim().max(80),
  category: z.string().trim().max(80),
  primaryInterest: z.string().trim().max(120),
  language: userLanguageSchema.optional(),
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

app.get('/api/smme/plan', requireAuth, requireRole('employer'), (req, res) => {
  const plan = store.list('enterprisePlans').find((item) => item.ownerId === res.locals.user.id);
  return res.json({ plan: plan ?? null });
});
app.put('/api/smme/plan', requireAuth, requireRole('employer'), (req, res) => {
  const parsed = enterprisePlanUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Check the business profile, diagnostic, and progress details.' });

  const ownerId = res.locals.user.id as string;
  const existing = store.list('enterprisePlans').find((item) => item.ownerId === ownerId);
  const businessName = parsed.data.businessName ?? existing?.businessName;
  if (!businessName) return res.status(400).json({ error: 'Save your business name before continuing.' });
  if (parsed.data.mentorRequested === false && existing?.mentorRequested === true) {
    return res.status(400).json({ error: 'A mentor matching request cannot be withdrawn in the app.' });
  }

  const update: Record<string, unknown> = { ...parsed.data, ownerId };
  if (parsed.data.diagnostic) {
    const scores = Object.values(parsed.data.diagnostic);
    const maturityScore = Math.round(scores.reduce((total, score) => total + score, 0) / scores.length * 20);
    const history = Array.isArray(existing?.assessmentHistory) ? existing.assessmentHistory : [];
    update.assessmentHistory = [
      ...history,
      {
        submittedAt: new Date().toISOString(),
        maturityScore,
        diagnostic: parsed.data.diagnostic,
      },
    ];
  }

  const plan = existing
    ? store.update('enterprisePlans', String(existing.id), update)
    : store.create('enterprisePlans', update);
  if (!plan) return res.status(500).json({ error: 'Could not save the enterprise development plan.' });
  return res.json({ plan });
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
const courseLanguageSchema = z.string().trim().min(2).max(60);
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
    durationSeconds: z.number().finite().positive().max(24 * 60 * 60).optional(),
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
  language: courseLanguageSchema.default('English'),
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
  language: courseLanguageSchema.optional(),
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
const enterpriseDiagnosticSchema = z.object({
  registrationLegalForm: z.number().int().min(1).max(5),
  managementGovernance: z.number().int().min(1).max(5),
  financeRecordKeeping: z.number().int().min(1).max(5),
  marketReadiness: z.number().int().min(1).max(5),
  technologyAdoption: z.number().int().min(1).max(5),
  skillsProfile: z.number().int().min(1).max(5),
  regulatoryCompliance: z.number().int().min(1).max(5),
  productionCapability: z.number().int().min(1).max(5),
  logistics: z.number().int().min(1).max(5),
  fundingReadiness: z.number().int().min(1).max(5),
  digitalMaturity: z.number().int().min(1).max(5),
});
const enterprisePlanUpdateSchema = z.object({
  businessName: z.string().trim().min(2).max(120).optional(),
  legalForm: z.string().trim().max(100).optional(),
  province: z.string().trim().max(80).optional(),
  sector: z.string().trim().max(120).optional(),
  productsServices: z.string().trim().max(500).optional(),
  businessDescription: z.string().trim().max(1000).optional(),
  diagnostic: enterpriseDiagnosticSchema.optional(),
  fundingChecklist: z.array(z.enum([
    'registration',
    'financial-records',
    'business-plan',
    'cashflow-forecast',
  ])).max(4).optional(),
  mentorRequested: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0);
const categorySchema = z.object({ name: z.string().trim().min(2).max(80), slug: z.string().trim().regex(/^[a-z0-9-]+$/) });

const videoUploadSchema = z.object({
  lessonIndex: z.number().int().min(0).max(29),
  fileName: z.string().trim().min(1).max(500),
  mimeType: z.string().trim().min(1).max(100),
  fileSize: z.number().int().positive(),
  durationSeconds: z.number().finite().positive().max(24 * 60 * 60).optional(),
});
const multipartPartsSchema = z.object({
  parts: z.array(z.object({
    partNumber: z.number().int().min(1).max(10_000),
    etag: z.string().trim().min(1).max(200).regex(/^"?[A-Za-z0-9-]+"?$/),
  })).min(1).max(10_000),
});

function safeVideoFileName(value: string) {
  const baseName = value.split(/[\\/]/).pop()?.normalize('NFKC') ?? '';
  const cleaned = baseName
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[^A-Za-z0-9._ -]/g, '_')
    .replace(/^\.+/, '')
    .trim()
    .slice(0, 120);
  return cleaned || 'lesson-video';
}

function videoUploadError(res: Response, error: unknown, operation: string) {
  if (error instanceof R2ConfigurationError) {
    return res.status(503).json({ error: 'Cloud video storage is not configured. Contact the platform administrator.' });
  }
  const errorName = error instanceof Error ? error.name : 'UnknownError';
  console.error(`Cloud video storage ${operation} failed`, { errorName });
  return res.status(502).json({ error: 'Cloud video storage is temporarily unavailable. Please try again.' });
}

function videoCourseAccess(courseId: string, user: User) {
  const course = store.list('courses').find((item) => item.id === courseId);
  if (!course) return { error: 'Course not found' as const };
  if (user.role !== 'admin' && course.ownerId !== user.id) {
    return { error: 'Cannot manage videos for another trainer’s course' as const };
  }
  return { course };
}

function publicVideoRecord(video: Record<string, unknown>, course?: Record<string, unknown>) {
  const lessons = Array.isArray(course?.lessons) ? course.lessons as Array<Record<string, unknown>> : [];
  const lessonIndex = Number(video.lessonIndex);
  const lesson = lessons[lessonIndex];
  return {
    id: video.id,
    courseId: video.courseId,
    courseTitle: course?.title ?? 'Deleted course',
    lessonIndex,
    lessonTitle: typeof lesson?.title === 'string' ? lesson.title : `Lesson ${lessonIndex + 1}`,
    originalFileName: video.originalFileName,
    mimeType: video.mimeType,
    fileSize: video.fileSize,
    durationSeconds: video.durationSeconds,
    status: video.status,
    uploadedBy: video.uploadedBy,
    createdAt: video.createdAt,
    updatedAt: video.updatedAt,
  };
}

async function removeVideoRecord(video: Record<string, unknown>) {
  const storageKey = typeof video.storageKey === 'string' ? video.storageKey : undefined;
  const uploadId = typeof video.multipartUploadId === 'string' ? video.multipartUploadId : undefined;
  if (storageKey && video.status === 'pending' && uploadId) {
    await abortMultipartUpload({ key: storageKey, uploadId });
  } else if (storageKey && (
    video.status === 'uploaded'
    || video.status === 'delete_failed'
    || video.status === 'failed'
    || (video.status === 'pending' && video.uploadType === 'single')
  )) {
    await deleteVideoObject(storageKey);
  }
  const videoId = String(video.id ?? '');
  const course = store.list('courses').find((item) => item.id === video.courseId);
  if (course && Array.isArray(course.lessons)) {
    const lessons = course.lessons as Array<Record<string, unknown>>;
    const updatedLessons = lessons.map((lesson) => {
      const file = lesson.file;
      if (!file || typeof file !== 'object' || !('id' in file) || file.id !== videoId) return lesson;
      const { file: _removedFile, ...rest } = lesson;
      return rest;
    });
    if (updatedLessons.some((lesson, index) => lesson !== lessons[index])) {
      store.update('courses', String(course.id), { lessons: updatedLessons });
    }
  }
  store.remove('videos', videoId);
}

app.post('/api/courses/:id/videos/uploads', requireAuth, requireRole('trainer', 'admin'), async (req, res) => {
  const courseId = String(req.params.id);
  const access = videoCourseAccess(courseId, res.locals.user);
  if ('error' in access) return res.status(access.error === 'Course not found' ? 404 : 403).json({ error: access.error });
  const { course } = access;
  if (course.status === 'submitted' && res.locals.user.role !== 'admin') {
    return res.status(409).json({ error: 'Submitted content cannot be changed until it has been reviewed.' });
  }
  const parsed = videoUploadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid video upload details.' });
  let policy: ReturnType<typeof getVideoUploadPolicy>;
  try {
    policy = getVideoUploadPolicy();
  } catch (error) {
    return videoUploadError(res, error, 'upload configuration');
  }
  if (parsed.data.fileSize > policy.maxBytes) {
    return res.status(413).json({ error: `Video files must be ${Math.floor(policy.maxBytes / (1024 * 1024))} MB or smaller.` });
  }

  const originalFileName = safeVideoFileName(parsed.data.fileName);
  const extension = extname(originalFileName).toLowerCase();
  const mimeType = videoMimeTypes[extension];
  if (!mimeType || parsed.data.mimeType !== mimeType) {
    return res.status(415).json({ error: 'Choose a valid MP4 or MOV video file.' });
  }
  if (course.status === 'approved') {
    const lessons = Array.isArray(course.lessons) ? course.lessons as Array<Record<string, unknown>> : [];
    const lesson = lessons[parsed.data.lessonIndex];
    if (!lesson || lesson.type !== 'Video') {
      return res.status(400).json({ error: 'Select an existing video lesson to replace.' });
    }
  }

  const videoId = randomUUID();
  const storageKey = `videos/${courseId}/${videoId}${extension}`;
  let multipartUploadId: string | undefined;
  try {
    const multipart = parsed.data.fileSize >= policy.multipartThresholdBytes;
    let uploadUrl: string | undefined;
    if (multipart) {
      multipartUploadId = await beginMultipartUpload({ key: storageKey, mimeType });
    } else {
      uploadUrl = await createSingleUploadUrl({
        key: storageKey,
        mimeType,
      });
    }
    const video = store.createVideo(videoId, {
      courseId,
      lessonIndex: parsed.data.lessonIndex,
      originalFileName,
      storageKey,
      mimeType,
      fileSize: parsed.data.fileSize,
      durationSeconds: parsed.data.durationSeconds,
      status: 'pending',
      uploadedBy: res.locals.user.id,
      uploadType: multipart ? 'multipart' : 'single',
      multipartUploadId,
    });
    return res.status(201).json({
      video: publicVideoRecord(video, course),
      upload: multipart
        ? { type: 'multipart', partSizeBytes: policy.partSizeBytes, expiresInSeconds: 900 }
        : { type: 'single', url: uploadUrl, expiresInSeconds: 900 },
    });
  } catch (error) {
    if (multipartUploadId) {
      try {
        await abortMultipartUpload({ key: storageKey, uploadId: multipartUploadId });
      } catch {
        console.error('Could not abort an incomplete R2 multipart upload', { videoId });
      }
    }
    return videoUploadError(res, error, 'upload initialization');
  }
});

app.post('/api/videos/:id/parts/:partNumber/upload-url', requireAuth, requireRole('trainer', 'admin'), async (req, res) => {
  const video = store.list('videos').find((record) => record.id === String(req.params.id));
  if (!video) return res.status(404).json({ error: 'Video upload not found.' });
  const access = videoCourseAccess(String(video.courseId), res.locals.user);
  if ('error' in access) return res.status(access.error === 'Course not found' ? 404 : 403).json({ error: access.error });
  if (video.status !== 'pending' || video.uploadType !== 'multipart' || typeof video.multipartUploadId !== 'string') {
    return res.status(409).json({ error: 'This video upload is no longer active.' });
  }
  const partNumber = Number(req.params.partNumber);
  let policy: ReturnType<typeof getVideoUploadPolicy>;
  try {
    policy = getVideoUploadPolicy();
  } catch (error) {
    return videoUploadError(res, error, 'multipart configuration');
  }
  const expectedPartCount = Math.ceil(Number(video.fileSize) / policy.partSizeBytes);
  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > expectedPartCount || partNumber > 10_000) {
    return res.status(400).json({ error: 'Video part number is invalid.' });
  }
  try {
    const url = await createPartUploadUrl({
      key: String(video.storageKey),
      uploadId: video.multipartUploadId,
      partNumber,
    });
    return res.json({ url, expiresInSeconds: 900 });
  } catch (error) {
    return videoUploadError(res, error, 'multipart URL signing');
  }
});

app.post('/api/videos/:id/complete', requireAuth, requireRole('trainer', 'admin'), async (req, res) => {
  const video = store.list('videos').find((record) => record.id === String(req.params.id));
  if (!video) return res.status(404).json({ error: 'Video upload not found.' });
  const access = videoCourseAccess(String(video.courseId), res.locals.user);
  if ('error' in access) return res.status(access.error === 'Course not found' ? 404 : 403).json({ error: access.error });
  if (video.status !== 'pending') return res.status(409).json({ error: 'This video upload has already been completed or closed.' });

  let policy: ReturnType<typeof getVideoUploadPolicy>;
  try {
    policy = getVideoUploadPolicy();
  } catch (error) {
    return videoUploadError(res, error, 'completion configuration');
  }
  let parts: Array<{ partNumber: number; etag: string }> = [];
  if (video.uploadType === 'multipart') {
    const parsedParts = multipartPartsSchema.safeParse(req.body);
    const expectedPartCount = Math.ceil(Number(video.fileSize) / policy.partSizeBytes);
    if (!parsedParts.success || parsedParts.data.parts.length !== expectedPartCount) {
      return res.status(400).json({ error: 'Every video part must be uploaded before completing the upload.' });
    }
    const uniqueParts = new Set(parsedParts.data.parts.map((part) => part.partNumber));
    if (uniqueParts.size !== expectedPartCount
      || parsedParts.data.parts.some((part) => part.partNumber > expectedPartCount)) {
      return res.status(400).json({ error: 'Video upload parts are incomplete or duplicated.' });
    }
    parts = parsedParts.data.parts
      .map((part) => ({ partNumber: part.partNumber, etag: part.etag.replace(/^"|"$/g, '') }))
      .sort((a, b) => a.partNumber - b.partNumber);
  }

  try {
    if (video.uploadType === 'multipart') {
      await completeMultipartUpload({
        key: String(video.storageKey),
        uploadId: String(video.multipartUploadId),
        parts,
      });
    }
    await verifyUploadedVideo({
      key: String(video.storageKey),
      mimeType: String(video.mimeType),
      size: Number(video.fileSize),
    });
  } catch (error) {
    if (error instanceof R2ObjectMissingError) {
      store.update('videos', String(video.id), { status: 'failed' });
      return res.status(409).json({ error: 'The uploaded video is missing. Please upload it again.' });
    }
    if (error instanceof InvalidVideoContentError) {
      try {
        await deleteVideoObject(String(video.storageKey));
      } catch {
        console.error('Could not remove a rejected R2 video object', { videoId: video.id });
      }
      store.update('videos', String(video.id), { status: 'failed' });
      return res.status(415).json({ error: 'The uploaded file is not a supported MP4 or MOV video.' });
    }
    return videoUploadError(res, error, 'upload verification');
  }

  const readyVideo = store.update('videos', String(video.id), {
    status: 'uploaded',
    uploadedAt: new Date().toISOString(),
    multipartUploadId: undefined,
  });
  if (!readyVideo) return res.status(500).json({ error: 'Video metadata could not be saved.' });
  const file: CourseFile = {
    id: String(video.id),
    name: String(video.originalFileName),
    mimeType: String(video.mimeType),
    size: Number(video.fileSize),
  };
  if (typeof video.durationSeconds === 'number') file.durationSeconds = video.durationSeconds;

  const course = store.list('courses').find((record) => record.id === video.courseId);
  const lessons = Array.isArray(course?.lessons) ? course.lessons as Array<Record<string, unknown>> : [];
  const oldFile = lessons[Number(video.lessonIndex)]?.file;
  if (course && lessons[Number(video.lessonIndex)]) {
    const updatedLessons = lessons.map((lesson, index) => index === Number(video.lessonIndex)
      ? { ...lesson, file }
      : lesson);
    const updatedCourse = store.update('courses', String(course.id), { lessons: updatedLessons });
    if (!updatedCourse) return res.status(500).json({ error: 'Video was uploaded, but its lesson association could not be saved.' });

    if (oldFile && typeof oldFile === 'object' && 'id' in oldFile && typeof oldFile.id === 'string' && oldFile.id !== video.id) {
      const oldVideo = store.list('videos').find((record) => record.id === oldFile.id);
      if (oldVideo) {
        try {
          await deleteVideoObject(String(oldVideo.storageKey));
          store.remove('videos', String(oldVideo.id));
        } catch (error) {
          const errorName = error instanceof Error ? error.name : 'UnknownError';
          console.error('Could not remove the replaced R2 video', { videoId: oldVideo.id, errorName });
          store.update('videos', String(oldVideo.id), { status: 'delete_failed' });
        }
      }
    }
  }
  return res.json({ video: publicVideoRecord(readyVideo, course), file });
});

app.get('/api/trainer/videos', requireAuth, requireRole('trainer', 'admin'), (req, res) => {
  const ownedCourses = res.locals.user.role === 'admin'
    ? undefined
    : new Set(store.list('courses')
      .filter((course) => course.ownerId === res.locals.user.id)
      .map((course) => course.id));
  const videos = store.list('videos')
    .filter((video) => !ownedCourses || ownedCourses.has(String(video.courseId)))
    .map((video) => publicVideoRecord(video, store.list('courses').find((course) => course.id === video.courseId)));
  return res.json({ videos });
});

app.get('/api/admin/videos', requireAuth, requireRole('admin'), (_req, res) => {
  const courses = new Map(store.list('courses').map((course) => [course.id, course]));
  const videos = store.list('videos').map((video) =>
    publicVideoRecord(video, courses.get(String(video.courseId))));
  return res.json({ videos });
});

app.get('/api/videos/:id/playback-url', requireAuth, async (req, res) => {
  const video = store.list('videos').find((record) => record.id === String(req.params.id) && record.status === 'uploaded');
  if (!video) return res.status(404).json({ error: 'Video is not available.' });
  const course = store.list('courses').find((record) => record.id === video.courseId);
  if (!course) return res.status(404).json({ error: 'Course not found.' });

  const lessons = Array.isArray(course.lessons) ? course.lessons as Array<Record<string, unknown>> : [];
  const lessonIndex = lessons.findIndex((lesson) => {
    const file = lesson.file;
    return file && typeof file === 'object' && 'id' in file && file.id === video.id;
  });
  if (lessonIndex < 0) {
    return res.status(404).json({ error: 'Video is not attached to an available lesson.' });
  }
  const user = res.locals.user as User;
  const isManager = user.role === 'admin' || (user.role === 'trainer' && course.ownerId === user.id);
  if (!isManager) {
    if (user.role !== 'learner' && user.role !== 'employer') {
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }
    const enrolled = store.list('progress').some((record) =>
      record.courseId === course.id && record.userId === user.id);
    if (course.status !== 'approved' || !enrolled) {
      return res.status(403).json({ error: 'Enrol in this published course to watch its lessons.' });
    }
  }

  try {
    await verifyUploadedVideo({
      key: String(video.storageKey),
      mimeType: String(video.mimeType),
      size: Number(video.fileSize),
    });
    const url = await createPlaybackUrl(
      String(video.storageKey),
      req.query.download === '1' ? String(video.originalFileName) : undefined,
    );
    return res.json({ url, expiresInSeconds: 300 });
  } catch (error) {
    if (error instanceof R2ConfigurationError) {
      return res.status(503).json({ error: 'Cloud video storage is not configured. Contact the platform administrator.' });
    }
    if (error instanceof R2ObjectMissingError) {
      return res.status(404).json({ error: 'This video is no longer available.' });
    }
    return videoUploadError(res, error, 'playback URL creation');
  }
});

app.delete('/api/videos/:id', requireAuth, requireRole('trainer', 'admin'), async (req, res) => {
  const video = store.list('videos').find((record) => record.id === String(req.params.id));
  if (!video) return res.status(404).json({ error: 'Video not found.' });
  const access = videoCourseAccess(String(video.courseId), res.locals.user);
  if ('error' in access) return res.status(access.error === 'Course not found' ? 404 : 403).json({ error: access.error });
  try {
    await removeVideoRecord(video);
    return res.status(204).send();
  } catch (error) {
    return videoUploadError(res, error, 'video deletion');
  }
});

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
  if (kind === 'video') {
    return res.status(410).json({ error: 'Videos must use the secure Cloudflare R2 upload workflow.' });
  }
  if (kind !== 'pdf') return res.status(400).json({ error: 'Choose a PDF upload type' });
  const upload = pdfFileUpload;
  return upload(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'PDF notes must be 25 MB or smaller.'
        : 'Choose a single file to upload.';
      return res.status(status).json({ error: message });
    }
    if (error instanceof UnsupportedFileError) return res.status(415).json({ error: error.message });
    if (error) return next(error);
    if (!req.file) return res.status(400).json({ error: 'Choose a file to upload' });

    const extension = '.pdf';
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
  if (file.mimeType !== pdfMimeType) return res.status(404).json({ error: 'Course file not found' });
  const extension = '.pdf';
  const filePath = resolve(uploadDirectory, `${file.id}${extension}`);
  if (!existsSync(filePath)) return res.status(404).json({ error: 'Course file is missing' });
  if (req.query.download === '1') return res.download(filePath, file.name);
  res.type(file.mimeType);
  return res.sendFile(filePath);
});
app.patch('/api/courses/:id', requireAuth, requireRole('trainer', 'admin'), async (req, res) => {
  const courseId = String(req.params.id);
  const record = store.list('courses').find((item) => item.id === courseId) as Record<string, unknown> | undefined;
  if (!record) return res.status(404).json({ error: 'Course not found' });
  if (res.locals.user.role !== 'admin' && record.ownerId !== res.locals.user.id) return res.status(403).json({ error: 'Cannot edit another trainer’s course' });
  const parsed = courseUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid course details' });
  if (parsed.data.lessons) {
    const referencedVideoIds = new Set<string>();
    for (const [lessonIndex, lesson] of parsed.data.lessons.entries()) {
      if (!lesson.file || !lesson.file.mimeType.startsWith('video/')) continue;
      if (referencedVideoIds.has(lesson.file.id)) {
        return res.status(400).json({ error: 'A video cannot be attached to more than one lesson.' });
      }
      referencedVideoIds.add(lesson.file.id);
      const video = store.list('videos').find((item) =>
        item.id === lesson.file?.id
        && item.courseId === courseId
        && item.status === 'uploaded');
      if (!video || video.mimeType !== lesson.file.mimeType || video.fileSize !== lesson.file.size) {
        return res.status(400).json({ error: `Lesson ${lessonIndex + 1} must reference its verified Cloudflare video upload.` });
      }
    }
  }
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
  if (updated && parsed.data.lessons) {
    const lessons = parsed.data.lessons;
    const linkedVideoIds = new Set<string>();
    for (const [lessonIndex, lesson] of lessons.entries()) {
      if (!lesson.file || !lesson.file.mimeType.startsWith('video/')) continue;
      linkedVideoIds.add(lesson.file.id);
      store.update('videos', lesson.file.id, { lessonIndex });
    }
    for (const video of store.list('videos')) {
      if (video.courseId !== courseId || video.status !== 'uploaded' || linkedVideoIds.has(String(video.id))) continue;
      try {
        await deleteVideoObject(String(video.storageKey));
        store.remove('videos', String(video.id));
      } catch (error) {
        const errorName = error instanceof Error ? error.name : 'UnknownError';
        console.error('Could not remove an unlinked R2 video', { videoId: video.id, errorName });
        store.update('videos', String(video.id), { status: 'delete_failed' });
      }
    }
  }
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

function getTrainerAnalyticsScope(ownerId: string) {
  const courses = store.list('courses').filter((course) =>
    course.ownerId === ownerId && course.status === 'approved');
  const coursesById = new Map(courses.map((course) => [String(course.id), course]));
  const learningUserIds = new Set(
    store.users.all()
      .filter((user) => user.role === 'learner')
      .map((user) => user.id),
  );
  const assessmentCourseIds = new Map(
    store.list('assessments')
      .filter((assessment) => {
        const course = coursesById.get(String(assessment.courseId ?? ''));
        return course && assessment.ownerId === ownerId && assessment.ownerId === course.ownerId;
      })
      .map((assessment) => [String(assessment.id), String(assessment.courseId)] as const),
  );
  return { courses, coursesById, learningUserIds, assessmentCourseIds };
}

function getRecentActiveLearnersByCourse(
  coursesById: Map<string, Record<string, unknown>>,
  learningUserIds: Set<string>,
  assessmentCourseIds: Map<string, string>,
) {
  const activeSince = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const activeLearners = new Set<string>();
  const activeLearnersByCourse = new Map<string, Set<string>>();

  function recordActiveLearner(courseId: string, userId: string) {
    activeLearners.add(userId);
    const learners = activeLearnersByCourse.get(courseId) ?? new Set<string>();
    learners.add(userId);
    activeLearnersByCourse.set(courseId, learners);
  }

  for (const record of store.list('progress')) {
    const courseId = String(record.courseId ?? '');
    const userId = String(record.userId ?? '');
    if (!coursesById.has(courseId) || !learningUserIds.has(userId)) continue;
    const occurredAt = Date.parse(String(record.updatedAt ?? record.createdAt ?? ''));
    if (Number.isFinite(occurredAt) && occurredAt >= activeSince && occurredAt <= Date.now()) {
      recordActiveLearner(courseId, userId);
    }
  }

  for (const attempt of store.list('attempts')) {
    const courseId = assessmentCourseIds.get(String(attempt.assessmentId ?? ''));
    const userId = String(attempt.userId ?? '');
    const score = attempt.score;
    if (!courseId || !learningUserIds.has(userId) || typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 100) continue;
    const occurredAt = Date.parse(String(attempt.createdAt ?? ''));
    if (Number.isFinite(occurredAt) && occurredAt >= activeSince && occurredAt <= Date.now()) {
      recordActiveLearner(courseId, userId);
    }
  }

  return { activeLearners, activeLearnersByCourse };
}

app.get('/api/trainer/analytics', requireAuth, requireRole('trainer'), (req, res) => {
  const ownerId = String(res.locals.user.id);
  const { courses, coursesById, learningUserIds, assessmentCourseIds } = getTrainerAnalyticsScope(ownerId);
  const progressByCourse = new Map<string, Map<string, Record<string, unknown>>>();
  const attemptStatsByCourse = new Map<string, { count: number; scoreTotal: number; passed: number }>();
  const { activeLearners, activeLearnersByCourse } = getRecentActiveLearnersByCourse(
    coursesById,
    learningUserIds,
    assessmentCourseIds,
  );

  for (const record of store.list('progress')) {
    const courseId = String(record.courseId ?? '');
    const userId = String(record.userId ?? '');
    if (!coursesById.has(courseId) || !learningUserIds.has(userId)) continue;
    const courseProgress = progressByCourse.get(courseId) ?? new Map<string, Record<string, unknown>>();
    if (!courseProgress.has(userId)) courseProgress.set(userId, record);
    progressByCourse.set(courseId, courseProgress);
  }

  for (const attempt of store.list('attempts')) {
    const courseId = assessmentCourseIds.get(String(attempt.assessmentId ?? ''));
    const userId = String(attempt.userId ?? '');
    const score = attempt.score;
    if (!courseId || !learningUserIds.has(userId) || typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 100) continue;
    const stats = attemptStatsByCourse.get(courseId) ?? { count: 0, scoreTotal: 0, passed: 0 };
    stats.count += 1;
    stats.scoreTotal += score;
    if (attempt.passed === true) stats.passed += 1;
    attemptStatsByCourse.set(courseId, stats);
  }

  const certificatesByCourse = new Map<string, number>();
  for (const certificate of store.list('certificates')) {
    const courseId = String(certificate.courseId ?? '');
    const userId = String(certificate.userId ?? '');
    if (!coursesById.has(courseId) || !learningUserIds.has(userId)) continue;
    certificatesByCourse.set(courseId, (certificatesByCourse.get(courseId) ?? 0) + 1);
  }

  let totalEnrollments = 0;
  let completionTotal = 0;
  let completedEnrollmentCount = 0;
  let totalAttempts = 0;
  let scoreTotal = 0;
  let passedAttempts = 0;
  let certificatesEarned = 0;

  const courseAnalytics = courses.map((course) => {
    const courseId = String(course.id);
    const lessons = Array.isArray(course.lessons) ? course.lessons : [];
    const enrollments = [...(progressByCourse.get(courseId)?.values() ?? [])];
    const completionCounts = lessons.map(() => 0);
    let courseCompletionTotal = 0;

    for (const enrollment of enrollments) {
      const completedLessons = new Set(
        Array.isArray(enrollment.completedLessons)
          ? enrollment.completedLessons.filter((index): index is number =>
            typeof index === 'number' && Number.isInteger(index) && index >= 0 && index < lessons.length)
          : [],
      );
      completedLessons.forEach((index) => {
        completionCounts[index] = (completionCounts[index] ?? 0) + 1;
      });
      if (lessons.length > 0) {
        courseCompletionTotal += completedLessons.size / lessons.length;
        completionTotal += completedLessons.size / lessons.length;
        completedEnrollmentCount += 1;
      }
    }

    const attempts = attemptStatsByCourse.get(courseId) ?? { count: 0, scoreTotal: 0, passed: 0 };
    const courseCertificates = certificatesByCourse.get(courseId) ?? 0;
    totalEnrollments += enrollments.length;
    totalAttempts += attempts.count;
    scoreTotal += attempts.scoreTotal;
    passedAttempts += attempts.passed;
    certificatesEarned += courseCertificates;

    return {
      id: courseId,
      title: String(course.title),
      enrollmentCount: enrollments.length,
      activeLearnerCount: activeLearnersByCourse.get(courseId)?.size ?? 0,
      averageCompletionRate: enrollments.length && lessons.length
        ? Math.round((courseCompletionTotal / enrollments.length) * 100)
        : null,
      lessons: lessons.map((lesson, index) => {
        const completedCount = completionCounts[index] ?? 0;
        return {
          title: lesson && typeof lesson === 'object' && 'title' in lesson ? String(lesson.title) : `Lesson ${index + 1}`,
          completedCount,
          completionRate: enrollments.length ? Math.round((completedCount / enrollments.length) * 100) : null,
        };
      }),
      assessment: {
        attemptCount: attempts.count,
        averageScore: attempts.count ? Math.round(attempts.scoreTotal / attempts.count) : null,
        passedCount: attempts.passed,
        passRate: attempts.count ? Math.round((attempts.passed / attempts.count) * 100) : null,
      },
      certificatesEarned: courseCertificates,
    };
  });

  return res.json({
    generatedAt: new Date().toISOString(),
    activeLearnerWindowDays: 30,
    summary: {
      publishedCourses: courses.length,
      enrollmentCount: totalEnrollments,
      activeLearnerCount: activeLearners.size,
      averageCompletionRate: completedEnrollmentCount
        ? Math.round((completionTotal / completedEnrollmentCount) * 100)
        : null,
      assessmentAttemptCount: totalAttempts,
      averageAssessmentScore: totalAttempts ? Math.round(scoreTotal / totalAttempts) : null,
      assessmentPassRate: totalAttempts ? Math.round((passedAttempts / totalAttempts) * 100) : null,
      certificatesEarned,
    },
    courses: courseAnalytics,
  });
});

app.get('/api/trainer/analytics/active-learners', requireAuth, requireRole('trainer'), (_req, res) => {
  const { courses, coursesById, learningUserIds, assessmentCourseIds } =
    getTrainerAnalyticsScope(String(res.locals.user.id));
  const { activeLearnersByCourse } = getRecentActiveLearnersByCourse(
    coursesById,
    learningUserIds,
    assessmentCourseIds,
  );
  const learnerNames = new Map(
    store.users.all()
      .filter((user) => user.role === 'learner')
      .map((user) => [user.id, user.name]),
  );
  return res.json({
    activeLearnerWindowDays: 30,
    courses: courses.map((course) => ({
      id: String(course.id),
      title: String(course.title),
      activeLearners: [...(activeLearnersByCourse.get(String(course.id)) ?? [])]
        .map((userId) => learnerNames.get(userId))
        .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
        .sort((left, right) => left.localeCompare(right))
        .map((name) => ({ name })),
    })),
  });
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
  const userId = String(res.locals.user.id);
  const course = store.list('courses').find((item) => item.id === courseId && item.status === 'approved');
  if (!course) return res.status(404).json({ error: 'Published course not found' });

  const existing = store.list('progress').find((item) =>
    item.courseId === courseId && item.userId === userId);
  if (existing) {
    const progress = existing.enrolledAt
      ? existing
      : store.update('progress', String(existing.id), { enrolledAt: new Date().toISOString() });
    if (!progress) return res.status(500).json({ error: 'Course enrolment could not be saved' });
    return res.json({ progress, enrolled: false });
  }

  const progress = store.create('progress', {
    courseId,
    userId,
    completedLessons: [],
    enrolledAt: new Date().toISOString(),
  });
  addNotification(userId, 'Course enrolled', `You are enrolled in ${String(course.title)}.`);
  return res.status(201).json({ progress, enrolled: true });
});

app.get('/api/me/progress', requireAuth, requireRole('learner', 'employer'), (req, res) => {
  const userId = String(res.locals.user.id);
  const coursesById = new Map(
    store.list('courses')
      .filter((course) => course.status === 'approved')
      .map((course) => [String(course.id), course]),
  );
  const courses = store.list('progress')
    .filter((record) => record.userId === userId && coursesById.has(String(record.courseId)))
    .sort((a, b) => String(b.updatedAt ?? b.createdAt ?? '').localeCompare(String(a.updatedAt ?? a.createdAt ?? '')))
    .map((record) => {
      const course = coursesById.get(String(record.courseId))!;
      const lessons = Array.isArray(course.lessons) ? course.lessons : [];
      const lastLessonIndex = Number.isInteger(record.lastLessonIndex)
        && Number(record.lastLessonIndex) >= 0
        && Number(record.lastLessonIndex) < lessons.length
        ? Number(record.lastLessonIndex)
        : null;
      const completedLessons = Array.isArray(record.completedLessons)
        ? [...new Set(record.completedLessons.filter((index): index is number =>
          Number.isInteger(index) && index >= 0 && index < lessons.length))]
          .sort((a, b) => a - b)
        : [];
      return {
        course,
        completedLessons,
        progressPercent: lessons.length ? Math.round(completedLessons.length / lessons.length * 100) : 0,
        nextLessonIndex: Math.min(completedLessons.length, Math.max(0, lessons.length - 1)),
        lastLessonIndex,
        resumeLessonIndex: lastLessonIndex !== null
          ? Math.max(
            Math.min(completedLessons.length, Math.max(0, lessons.length - 1)),
            lastLessonIndex,
          )
          : Math.min(completedLessons.length, Math.max(0, lessons.length - 1)),
      };
    });
  return res.json({ courses });
});

app.get('/api/courses/:id/progress', requireAuth, requireRole('learner', 'employer'), (req, res) => {
  const courseId = String(req.params.id);
  const course = store.list('courses').find((item) => item.id === courseId && item.status === 'approved');
  if (!course) return res.status(404).json({ error: 'Published course not found' });
  const lessons = Array.isArray(course.lessons) ? course.lessons : [];
  const savedProgress = store.list('progress').find((record) =>
    record.courseId === courseId && record.userId === res.locals.user.id);
  const completedLessons = Array.isArray(savedProgress?.completedLessons)
    ? savedProgress.completedLessons.filter((index): index is number =>
      Number.isInteger(index) && index >= 0 && index < lessons.length)
    : [];
  const nextLessonIndex = Math.min(completedLessons.length, Math.max(0, lessons.length - 1));
  const savedLessonIndex = savedProgress?.lastLessonIndex;
  const resumeLessonIndex = Number.isInteger(savedLessonIndex)
    && Number(savedLessonIndex) >= 0
    && Number(savedLessonIndex) < lessons.length
    ? Math.max(nextLessonIndex, Number(savedLessonIndex))
    : nextLessonIndex;
  return res.json({
    completedLessons,
    nextLessonIndex,
    resumeLessonIndex,
  });
});

app.put('/api/courses/:id/progress', requireAuth, requireRole('learner', 'employer'), (req, res) => {
  const input = z.object({ lessonIndex: z.number().int().min(0) }).safeParse(req.body);
  if (!input.success) return res.status(400).json({ error: 'A valid lesson index is required' });

  const courseId = String(req.params.id);
  const course = store.list('courses').find((item) => item.id === courseId && item.status === 'approved');
  if (!course) return res.status(404).json({ error: 'Published course not found' });
  const lessons = Array.isArray(course.lessons) ? course.lessons : [];
  if (input.data.lessonIndex >= lessons.length) {
    return res.status(400).json({ error: 'Lesson index is invalid' });
  }

  const userId = String(res.locals.user.id);
  const existing = store.list('progress').find((item) =>
    item.courseId === courseId && item.userId === userId);
  const progress = existing
    ? store.update('progress', String(existing.id), { lastLessonIndex: input.data.lessonIndex })
    : store.create('progress', {
      courseId,
      userId,
      completedLessons: [],
      enrolledAt: new Date().toISOString(),
      lastLessonIndex: input.data.lessonIndex,
    });
  if (!progress) return res.status(500).json({ error: 'Course position could not be saved' });
  return res.json({ progress });
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

  const userId = String(res.locals.user.id);
  const existing = store.list('progress').find((item) =>
    item.courseId === courseId && item.userId === userId);
  const completedLessons = Array.isArray(existing?.completedLessons)
    ? existing.completedLessons.filter((index): index is number => Number.isInteger(index))
    : [];
  const newlyCompleted = !completedLessons.includes(lessonIndex);
  if (!completedLessons.includes(lessonIndex)) {
    if (lessonIndex !== completedLessons.length) {
      return res.status(409).json({ error: 'Complete lessons in order' });
    }
    completedLessons.push(lessonIndex);
  }
  const progress = existing
    ? store.update('progress', String(existing.id), {
      completedLessons,
      lastLessonIndex: Math.min(lessonIndex + 1, Math.max(0, lessons.length - 1)),
    })
    : store.create('progress', {
      courseId,
      userId,
      completedLessons,
      lastLessonIndex: Math.min(lessonIndex + 1, Math.max(0, lessons.length - 1)),
    });
  if (!progress) return res.status(500).json({ error: 'Lesson progress could not be saved' });
  if (newlyCompleted) {
    addNotification(userId, 'Course progress saved', `Your ${String(course.title)} progress has been updated.`);
  }
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
app.delete('/api/courses/:id', requireAuth, requireRole('trainer', 'admin'), async (req, res) => {
  const courseId = String(req.params.id);
  const record = store.list('courses').find((item) => item.id === courseId) as Record<string, unknown> | undefined;
  if (!record) return res.status(404).json({ error: 'Course not found' });
  if (res.locals.user.role !== 'admin' && record.ownerId !== res.locals.user.id) return res.status(403).json({ error: 'Cannot delete another trainer’s course' });

  try {
    for (const video of store.list('videos').filter((item) => item.courseId === courseId)) {
      await removeVideoRecord(video);
    }
  } catch (error) {
    return videoUploadError(res, error, 'course video cleanup');
  }
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
app.use((error: unknown, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) return next(error);
  const errorName = error instanceof Error ? error.name : 'UnknownError';
  console.error('Unhandled API request error', { method: req.method, path: req.path, errorName });
  return res.status(500).json({ error: 'The request could not be completed. Please try again.' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => console.log(`AgriLearn API listening on http://localhost:${port}`));
}
