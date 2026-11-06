import type { Certificate } from './api';

export type EarnedSkill = {
  name: string;
  courses: string[];
};

export function getEarnedSkills(certificates: Certificate[]): EarnedSkill[] {
  const skills = new Map<string, { name: string; courses: Set<string> }>();
  certificates.forEach((certificate) => {
    certificate.skills?.forEach((skill) => {
      const name = skill.trim();
      if (!name) return;
      const key = name.toLocaleLowerCase();
      const earnedSkill = skills.get(key) ?? {
        name,
        courses: new Set<string>(),
      };
      earnedSkill.courses.add(certificate.title ?? certificate.courseTitle ?? 'Course certificate');
      skills.set(key, earnedSkill);
    });
  });
  return Array.from(skills.values()).map((skill) => ({
    ...skill,
    courses: Array.from(skill.courses),
  }));
}

export function getCertificatePoints(certificates: Certificate[]): number {
  return certificates.reduce(
    (total, certificate) => total + (Number.isFinite(certificate.points) ? certificate.points ?? 0 : 0),
    0,
  );
}
