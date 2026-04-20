import { Resend } from 'resend';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  return new Resend(apiKey);
}

// Verify email configuration on startup
export const verifyEmailConfig = async () => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️  Resend API key not configured');
      console.warn('   Set RESEND_API_KEY to enable email functionality');
      return false;
    }

    console.log('✅ Resend email service is configured');
    return true;
  } catch (error) {
    console.error('❌ Email service verification failed:', error.message);
    return false;
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (to, resetToken, username) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@finvibe.com';

  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: `FinVibe <${fromEmail}>`,
      to: [to],
      subject: 'Password Reset Request - FinVibe',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset Request</h1>
              </div>
              <div class="content">
                <p>Hi ${username},</p>
                <p>We received a request to reset your password for your FinVibe account.</p>
                <p>Click the button below to reset your password:</p>
                <p style="text-align: center;">
                  <a href="${resetUrl}" class="button">Reset Password</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
                <div class="warning">
                  <strong>⚠️ Security Notice:</strong>
                  <ul>
                    <li>This link will expire in 1 hour</li>
                    <li>If you didn't request this, please ignore this email</li>
                    <li>Your password won't change until you create a new one</li>
                  </ul>
                </div>
                <p>If you have any questions, please contact our support team.</p>
                <p>Best regards,<br>The FinVibe Team</p>
              </div>
              <div class="footer">
                <p>This is an automated email. Please do not reply.</p>
                <p>&copy; 2024 FinVibe. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
Hi ${username},

We received a request to reset your password for your FinVibe account.

Click the link below to reset your password:
${resetUrl}

⚠️ Security Notice:
- This link will expire in 1 hour
- If you didn't request this, please ignore this email
- Your password won't change until you create a new one

If you have any questions, please contact our support team.

Best regards,
The FinVibe Team

---
This is an automated email. Please do not reply.
© 2024 FinVibe. All rights reserved.
      `,
    });

    if (error) {
      console.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }

    console.log('Password reset email sent:', data?.id);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

// Send email verification email
export const sendVerificationEmail = async (to, verificationToken, username) => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@finvibe.com';

  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: `FinVibe <${fromEmail}>`,
      to: [to],
      subject: 'Verify Your Email - FinVibe',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to FinVibe!</h1>
              </div>
              <div class="content">
                <p>Hi ${username},</p>
                <p>Thank you for signing up for FinVibe! We're excited to have you on board.</p>
                <p>Please verify your email address by clicking the button below:</p>
                <p style="text-align: center;">
                  <a href="${verificationUrl}" class="button">Verify Email</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
                <p><strong>Note:</strong> This link will expire in 24 hours.</p>
                <p>Once verified, you'll have full access to all FinVibe features!</p>
                <p>Best regards,<br>The FinVibe Team</p>
              </div>
              <div class="footer">
                <p>This is an automated email. Please do not reply.</p>
                <p>&copy; 2024 FinVibe. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
Hi ${username},

Thank you for signing up for FinVibe! We're excited to have you on board.

Please verify your email address by clicking the link below:
${verificationUrl}

Note: This link will expire in 24 hours.

Once verified, you'll have full access to all FinVibe features!

Best regards,
The FinVibe Team

---
This is an automated email. Please do not reply.
© 2024 FinVibe. All rights reserved.
      `,
    });

    if (error) {
      console.error('Failed to send verification email:', error);
      throw new Error('Failed to send verification email');
    }

    console.log('Verification email sent:', data?.id);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

// Send welcome email after verification
export const sendWelcomeEmail = async (to, username) => {
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@finvibe.com';

  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: `FinVibe <${fromEmail}>`,
      to: [to],
      subject: 'Welcome to FinVibe - Get Started!',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .feature { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #667eea; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Welcome to FinVibe!</h1>
              </div>
              <div class="content">
                <p>Hi ${username},</p>
                <p>Your email has been verified successfully! You now have full access to FinVibe.</p>
                <h2>What's Next?</h2>
                <div class="feature">
                  <strong>📊 Create Your First Account</strong>
                  <p>Add your bank accounts or credit cards to start tracking your finances.</p>
                </div>
                <div class="feature">
                  <strong>💰 Add Transactions</strong>
                  <p>Record your income and expenses to see where your money goes.</p>
                </div>
                <div class="feature">
                  <strong>📈 Set Budgets</strong>
                  <p>Create budgets for different categories and track your progress.</p>
                </div>
                <div class="feature">
                  <strong>📉 View Reports</strong>
                  <p>Analyze your spending patterns with beautiful charts and insights.</p>
                </div>
                <p style="text-align: center;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="button">Get Started</a>
                </p>
                <p>If you have any questions or need help, feel free to reach out to our support team.</p>
                <p>Happy tracking!<br>The FinVibe Team</p>
              </div>
              <div class="footer">
                <p>This is an automated email. Please do not reply.</p>
                <p>&copy; 2024 FinVibe. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Failed to send welcome email:', error);
      // Don't throw error for welcome email - it's not critical
      return { success: false, error: error.message };
    }

    console.log('Welcome email sent:', data?.id);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    // Don't throw error for welcome email - it's not critical
    return { success: false, error: error.message };
  }
};

export default {
  verifyEmailConfig,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
};
