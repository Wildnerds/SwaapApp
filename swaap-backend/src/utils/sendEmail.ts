// utils/sendEmail.ts
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export const sendEmail = async (to: string, subject: string, html: string, text?: string) => {
  try {
    console.log('📧 Starting email send process...');
    console.log('📧 Email config check:', {
      host: process.env.MAILTRAP_HOST,
      port: process.env.MAILTRAP_PORT,
      user: process.env.MAILTRAP_USER ? process.env.MAILTRAP_USER.substring(0, 5) + '***' : 'NOT_SET',
      pass: process.env.MAILTRAP_PASS ? '***SET***' : 'NOT_SET',
    });

    const transporter = nodemailer.createTransport({
      host: process.env.MAILTRAP_HOST,
      port: Number(process.env.MAILTRAP_PORT),
      auth: {
        user: process.env.MAILTRAP_USER!,
        pass: process.env.MAILTRAP_PASS!,
      },
      // Add debugging for better logs
      debug: process.env.NODE_ENV === 'development',
      logger: process.env.NODE_ENV === 'development',
    });

    console.log('📧 Testing Mailtrap connection...');
    
    // Test connection
    try {
      await transporter.verify();
      console.log('✅ Mailtrap connection verified');
    } catch (verifyError) {
      console.error('❌ Mailtrap connection failed:', verifyError);
      throw new Error(`Mailtrap connection failed: ${verifyError}`);
    }

    const info = await transporter.sendMail({
      from: {
        name: 'Swaap Notifications',
        address: 'no-reply@swaapapp.com',
      },
      to,
      subject,
      text: text ?? 'Thanks for signing up. Please verify your email.',
      html,
    });

    console.log('✅ Email sent successfully!');
    console.log('📨 Email sent:', info.messageId);
    console.log('📨 Response:', info.response);

    return {
      success: true,
      messageId: info.messageId,
    };

  } catch (error: any) {
    console.error('❌ Email sending failed:', error.message);
    console.error('❌ Full error:', error);
    
    return {
      success: false,
      error: error.message,
    };
  }
};

// Add the testEmail function
export const testEmail = async () => {
  console.log('🧪 Testing Mailtrap email service...');
  
  const testResult = await sendEmail(
    'test@example.com',
    'Test Email from Swaap - ' + new Date().toLocaleString(),
    `
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h1 style="color: #4CAF50;">🧪 Email Test Successful!</h1>
        <p>This is a test email sent at: <strong>${new Date().toLocaleString()}</strong></p>
        <p>If you see this in your Mailtrap inbox, the email service is working correctly!</p>
        <hr>
        <p><small>Sent from Swaap backend email service</small></p>
      </body>
    </html>
    `,
    `Email Test - Sent at ${new Date().toLocaleString()}. If you see this in Mailtrap, the email service is working!`
  );
  
  console.log('🧪 Test result:', testResult);
  return testResult;
};