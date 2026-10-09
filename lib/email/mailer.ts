// lib/email/mailer.ts
import nodemailer, { type Transporter } from "nodemailer";

let cachedTransporter: Transporter | null = null;

export function getMailer(): Transporter {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.EMAIL_HOST || "smtp.gmail.com";
  const port = Number(process.env.EMAIL_PORT || 587);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error(
      "EMAIL_USER and EMAIL_PASS must be set in your environment variables",
    );
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587
    auth: { user, pass },
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
  });

  return cachedTransporter;
}

export function getSenderAddress(): string {
  const name = process.env.EMAIL_FROM_NAME || "Velrox";
  const user = process.env.EMAIL_USER || "no-reply@velrox.app";
  return `"${name}" <${user}>`;
}