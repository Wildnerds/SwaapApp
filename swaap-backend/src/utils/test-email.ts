// test-email.ts
import { sendEmail } from './sendEmail';

(async () => {
  try {
    await sendEmail(
      'alipearce1991@gmail.com', // ✅ Replace with your own email
      'Test Email from Swaap',
      '<h1>Hello from Swaap!</h1><p>This is a test email sent using Nodemailer and SendGrid.</p>'
    );
    console.log('✅ Test email sent!');
  } catch (err) {
    console.error('❌ Failed to send test email:', err);
  }
})();
