import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { User } from './types.js';

const file = process.env.DATA_FILE
  ? resolve(process.env.DATA_FILE)
  : resolve(process.cwd(), 'data', 'agrilearn.json');

export type Database = {
  users: User[];
  courses: Record<string, unknown>[];
  jobs: Record<string, unknown>[];
  applications: Record<string, unknown>[];
  invitations: Record<string, unknown>[];
  categories: Record<string, unknown>[];
  assessments: Record<string, unknown>[];
  attempts: Record<string, unknown>[];
  progress: Record<string, unknown>[];
  certificates: Record<string, unknown>[];
  courseReviews: Record<string, unknown>[];
  passwordResets: Record<string, unknown>[];
  videos: Record<string, unknown>[];
};
const initial: Database = { users: [], courses: [], jobs: [], applications: [], invitations: [], categories: [], assessments: [], attempts: [], progress: [], certificates: [], courseReviews: [], passwordResets: [], videos: [] };

function load(): Database {
  if (!existsSync(file)) return structuredClone(initial);
  const stored = JSON.parse(readFileSync(file, 'utf8')) as Partial<Database>;
  return { ...structuredClone(initial), ...stored };
}

function save(database: Database) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(database, null, 2));
}

export const store = {
  create(resource: keyof Omit<Database, 'users'>, input: Record<string, unknown>) {
    const database = load();
    const record = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    database[resource].push(record);
    save(database);
    return record;
  },
  createVideo(id: string, input: Record<string, unknown>) {
    const database = load();
    const record = { ...input, id, createdAt: new Date().toISOString() };
    database.videos.push(record);
    save(database);
    return record;
  },
  list(resource: keyof Omit<Database, 'users'>) {
    return load()[resource];
  },
  update(resource: keyof Omit<Database, 'users'>, id: string, input: Record<string, unknown>) {
    const database = load();
    const index = database[resource].findIndex((record) => record.id === id);
    if (index < 0) return undefined;
    database[resource][index] = { ...database[resource][index], ...input, id, updatedAt: new Date().toISOString() };
    save(database);
    return database[resource][index];
  },
  remove(resource: keyof Omit<Database, 'users'>, id: string) {
    const database = load();
    const before = database[resource].length;
    database[resource] = database[resource].filter((record) => record.id !== id);
    if (database[resource].length === before) return false;
    save(database);
    return true;
  },
  reviewCourse(courseId: string, input: { reviewerId: string; status: 'approved' | 'rejected'; note: string }) {
    const database = load();
    const course = database.courses.find((record) => record.id === courseId);
    if (!course || course.status !== 'submitted') return undefined;
    const reviewedAt = new Date().toISOString();
    const review = {
      id: randomUUID(),
      courseId,
      reviewerId: input.reviewerId,
      status: input.status,
      note: input.note,
      createdAt: reviewedAt,
    };
    Object.assign(course, {
      status: input.status,
      updatedAt: reviewedAt,
    });
    database.courseReviews.push(review);
    save(database);
    return { course, review };
  },
  resetPassword(tokenHash: string, passwordHash: string) {
    const database = load();
    const reset = database.passwordResets.find((record) => record.tokenHash === tokenHash);
    const expiresAt = typeof reset?.expiresAt === 'string' ? Date.parse(reset.expiresAt) : Number.NaN;
    if (!reset || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;
    const user = database.users.find((candidate) => candidate.id === reset.userId);
    if (!user) return false;
    user.passwordHash = passwordHash;
    database.passwordResets = database.passwordResets.filter((record) => record.userId !== user.id);
    save(database);
    return true;
  },
  hasValidPasswordReset(tokenHash: string) {
    const reset = load().passwordResets.find((record) => record.tokenHash === tokenHash);
    const expiresAt = typeof reset?.expiresAt === 'string' ? Date.parse(reset.expiresAt) : Number.NaN;
    return Boolean(reset && Number.isFinite(expiresAt) && expiresAt > Date.now());
  },
  users: {
    all(): User[] {
      return load().users;
    },
    findByEmail(email: string): User | undefined {
      return load().users.find((user) => user.email === email.toLowerCase());
    },
    create(input: Omit<User, 'id' | 'createdAt'>): User {
      const database = load();
      const user = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
      database.users.push(user);
      save(database);
      return user;
    },
    updateProfile(id: string, input: Partial<Pick<User, 'name' | 'email' | 'mobileNumber' | 'province' | 'category' | 'primaryInterest' | 'passwordHash'>>): User | undefined {
      const database = load();
      const user = database.users.find((candidate) => candidate.id === id);
      if (!user) return undefined;
      Object.assign(user, input);
      save(database);
      return user;
    },
  },
};
