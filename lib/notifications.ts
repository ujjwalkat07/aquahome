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
      secure: port === 465,
      auth: { user, pass },
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

export async function sendWhatsApp({ to, message }: { to: string; message: string }) {
  console.log(`\n--- [STUB WHATSAPP SEND] ---\nTo: ${to}\nMessage:\n${message}\n----------------------------\n`);
}

function getHtmlTemplate(title: string, message: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #334155;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 40px 0;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%);
      padding: 32px;
      text-align: center;
    }
    .logo-text {
      color: #ffffff;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0.5px;
      margin: 0;
    }
    .content {
      padding: 32px;
    }
    .title {
      font-size: 20px;
      font-weight: 700;
      color: #1e293b;
      margin-top: 0;
      margin-bottom: 16px;
      line-height: 1.3;
    }
    .message {
      font-size: 15px;
      line-height: 1.6;
      color: #475569;
      margin: 0 0 24px 0;
    }
    .btn-container {
      margin-bottom: 8px;
    }
    .btn {
      display: inline-block;
      background: #0284c7;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 24px;
      font-weight: 700;
      font-size: 14px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(2, 132, 199, 0.2);
    }
    .footer {
      background-color: #f1f5f9;
      padding: 24px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer-text {
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
      margin: 0 0 8px 0;
    }
    .footer-text-bold {
      font-weight: 700;
      color: #475569;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="logo-text">💧 AquaHome</h1>
      </div>
      <div class="content">
        <h2 class="title">${title}</h2>
        <p class="message">${message}</p>
        <div class="btn-container">
          <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}" class="btn">Go to Dashboard</a>
        </div>
      </div>
      <div class="footer">
        <p class="footer-text footer-text-bold">AquaHome Water Delivery Services</p>
        <p class="footer-text">Delivering purity and convenience, one drop at a time.</p>
        <p class="footer-text">This is an automated notification. Please do not reply directly to this email.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

export async function notifyUser({
  userId,
  title,
  message,
  email,
  phone,
  whatsAppMessage
}: {
  userId: string;
  title: string;
  message: string;
  email?: string;
  phone?: string;
  whatsAppMessage?: string;
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
        html: getHtmlTemplate(title, message)
      });
    }

    // 3. SMS notification
    if (phone) {
      await sendSMS({
        to: phone,
        message: `${title}: ${message}`
      });
    }

    // 4. WhatsApp notification
    if (phone && whatsAppMessage) {
      await sendWhatsApp({
        to: phone,
        message: whatsAppMessage
      });
    }
  } catch (error) {
    console.error("Notification trigger failure:", error);
  }
}
