export const roles = ['learner', 'employer', 'trainer', 'admin'] as const;
export type Role = (typeof roles)[number];

export type User = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  mobileNumber?: string;
  province?: string;
  category?: string;
  primaryInterest?: string;
  language?: string;
  createdAt: string;
};

export type RecordWithId = { id: string; createdAt: string } & Record<string, unknown>;

export type CourseFile = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  durationSeconds?: number;
};
