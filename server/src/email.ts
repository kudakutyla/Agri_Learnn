import nodemailer from 'nodemailer';

type PasswordResetEmail = {
  email: string;
  name: string;
  resetUrl: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

export function isPasswordResetEmailConfigured() {
  return Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_FROM?.trim());
}

export async function sendPasswordResetEmail({ email, name, resetUrl }: PasswordResetEmail) {
  const host = process.env.SMTP_HOST?.trim();
  const from = process.env.SMTP_FROM?.trim();
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;

  if (!host || !from || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Password reset SMTP configuration is invalid.');
  }
  if (Boolean(user) !== Boolean(password)) {
    throw new Error('Configure both SMTP_USER and SMTP_PASSWORD, or neither.');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true' || (process.env.SMTP_SECURE !== 'false' && port === 465),
    ...(user && password ? { auth: { user, pass: password } } : {}),
  });
  const safeName = escapeHtml(name);

  await transporter.sendMail({
    from,
    to: email,
    subject: 'Reset your AgriLearn password',
    text: `Hello ${name},\n\nUse the link below to reset your AgriLearn password. This link expires in one hour and can only be used once.\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>Hello ${safeName},</p><p>Use the link below to reset your AgriLearn password. This link expires in one hour and can only be used once.</p><p><a href="${escapeHtml(resetUrl)}">Reset your password</a></p><p>If you did not request this, you can ignore this email.</p>`,
  });
}
