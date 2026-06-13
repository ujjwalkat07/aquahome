import nodemailer from "nodemailer";
import prisma from "@/lib/prisma";

export async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text?: string; html?: string }) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || "noreply@aquahome.com";

  if (!user || !pass) {
    console.log(`[STUB EMAIL] To: ${to} | Subject: ${subject} | Content: ${text || html}`);
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      auth: {
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      } as any,
    });

    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
    console.log(`[EMAIL SENT] To: ${to} | Subject: ${subject}`);
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}

export async function sendSMS({ to, message }: { to: string; message: string }) {
  console.log(`[STUB SMS] To: ${to} | Message: ${message}`);
}

export async function notifyUser({
  userId,
  title,
  message,
  email,
  phone
}: {
  userId: string;
  title: string;
  message: string;
  email?: string;
  phone?: string;
}) {
  try {
    // 1. In-app notification
    await prisma.notification.create({
      data: {
        userId,
        title,
        message,
      },
    });

    // 2. Email notification
    if (email) {
      await sendEmail({
        to: email,
        subject: title,
        text: message,
        html: `<p><strong>${title}</strong></p><p>${message}</p>`
      });
    }

    // 3. SMS notification
    if (phone) {
      await sendSMS({
        to: phone,
        message: `${title}: ${message}`
      });
    }
  } catch (error) {
    console.error("Notification trigger failure:", error);
  }
}
