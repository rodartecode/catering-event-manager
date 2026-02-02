import { Resend } from 'resend';
import { logger } from './logger';

let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

interface SendMagicLinkParams {
  to: string;
  url: string;
  clientName?: string;
}

export async function sendMagicLinkEmail({ to, url, clientName }: SendMagicLinkParams) {
  const fromEmail = process.env.EMAIL_FROM || 'noreply@example.com';

  try {
    const { data, error } = await getResendClient().emails.send({
      from: fromEmail,
      to,
      subject: 'Sign in to your Client Portal',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Client Portal</h1>
            </div>

            <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">
                Hi${clientName ? ` ${clientName}` : ''},
              </p>

              <p style="font-size: 16px; margin-bottom: 20px;">
                Click the button below to sign in to your client portal and view your event details.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${url}"
                   style="display: inline-block; background: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Sign In to Portal
                </a>
              </div>

              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                This link will expire in 15 minutes. If you didn't request this email, you can safely ignore it.
              </p>

              <p style="font-size: 12px; color: #9ca3af; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${url}" style="color: #667eea; word-break: break-all;">${url}</a>
              </p>
            </div>
          </body>
        </html>
      `,
      text: `
Sign in to your Client Portal

Hi${clientName ? ` ${clientName}` : ''},

Click the link below to sign in to your client portal and view your event details:

${url}

This link will expire in 15 minutes. If you didn't request this email, you can safely ignore it.
      `.trim(),
    });

    if (error) {
      logger.error('Magic link email failed', new Error(error.message), {
        context: 'sendMagicLinkEmail',
        recipientDomain: to.split('@')[1],
      });
      throw new Error(`Failed to send email: ${error.message}`);
    }

    logger.info('Magic link sent successfully', {
      messageId: data?.id,
      context: 'sendMagicLinkEmail',
    });
    return { success: true, messageId: data?.id };
  } catch (error) {
    logger.error(
      'Magic link email error',
      error instanceof Error ? error : new Error(String(error)),
      {
        context: 'sendMagicLinkEmail',
        recipientDomain: to.split('@')[1],
      }
    );
    throw error;
  }
}

interface SendWelcomeEmailParams {
  to: string;
  clientName: string;
  companyName: string;
  portalUrl: string;
}

export async function sendWelcomeEmail({
  to,
  clientName,
  companyName,
  portalUrl,
}: SendWelcomeEmailParams) {
  const fromEmail = process.env.EMAIL_FROM || 'noreply@example.com';

  try {
    const { data, error } = await getResendClient().emails.send({
      from: fromEmail,
      to,
      subject: `Welcome to your Client Portal - ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to Your Client Portal</h1>
            </div>

            <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">
                Hi ${clientName},
              </p>

              <p style="font-size: 16px; margin-bottom: 20px;">
                Your client portal access for <strong>${companyName}</strong> has been activated! You can now view your event details, track progress, and see communication history.
              </p>

              <h3 style="font-size: 16px; color: #374151; margin-top: 25px;">What you can do in the portal:</h3>
              <ul style="font-size: 14px; color: #4b5563;">
                <li>View your upcoming and past events</li>
                <li>Track event progress and status</li>
                <li>See task completion status</li>
                <li>Review communication history</li>
              </ul>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${portalUrl}"
                   style="display: inline-block; background: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Access Your Portal
                </a>
              </div>

              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                To sign in, you'll receive a secure login link via email each time - no password needed!
              </p>
            </div>
          </body>
        </html>
      `,
      text: `
Welcome to Your Client Portal

Hi ${clientName},

Your client portal access for ${companyName} has been activated! You can now view your event details, track progress, and see communication history.

What you can do in the portal:
- View your upcoming and past events
- Track event progress and status
- See task completion status
- Review communication history

Access your portal at: ${portalUrl}

To sign in, you'll receive a secure login link via email each time - no password needed!
      `.trim(),
    });

    if (error) {
      logger.error('Welcome email failed', new Error(error.message), {
        context: 'sendWelcomeEmail',
        recipientDomain: to.split('@')[1],
      });
      throw new Error(`Failed to send email: ${error.message}`);
    }

    logger.info('Welcome email sent successfully', {
      messageId: data?.id,
      context: 'sendWelcomeEmail',
    });
    return { success: true, messageId: data?.id };
  } catch (error) {
    logger.error('Welcome email error', error instanceof Error ? error : new Error(String(error)), {
      context: 'sendWelcomeEmail',
      recipientDomain: to.split('@')[1],
    });
    throw error;
  }
}
