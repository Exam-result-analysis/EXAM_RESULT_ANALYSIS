// src/service/emailService.js
const nodemailer = require('nodemailer');

let transporter = null;
if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
  try {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: String(process.env.EMAIL_PORT) === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  } catch (err) {
    console.warn('Failed to initialize nodemailer transporter:', err.message);
  }
}

const sendResetEmail = async (email, resetLink) => {
  if (
    transporter &&
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASSWORD &&
    process.env.EMAIL_PASSWORD !== '##########'
  ) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Reset your password',
        html: `
          <h2>Password Reset Request</h2>
          <p>You requested to reset your password.</p>
          <p>Click the link below to reset your password:</p>
          <a href="${resetLink}">Reset Password</a>
          <p>This link will expire in 15 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
        `,
      };
      await transporter.sendMail(mailOptions);
      return;
    } catch (err) {
      console.warn(`[EmailService] Failed to send email via SMTP (${err.message}). Logging reset link instead.`);
    }
  }

  // Graceful fallback for local/test environments
  console.log(`[EmailService] Password reset link for ${email}: ${resetLink}`);
};

module.exports = sendResetEmail;