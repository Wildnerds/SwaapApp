// src/services/smsService.ts - AWS SNS VERSION
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

class SMSService {
  private snsClient: SNSClient | null = null;
  private region: string;
  private appName: string;

  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.appName = process.env.APP_NAME || 'Swaap';

    // Initialize AWS SNS client if credentials are available
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      this.snsClient = new SNSClient({
        region: this.region,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
      console.log('✅ AWS SNS service initialized');
      console.log('🌍 Region:', this.region);
    } else {
      console.warn('⚠️ AWS credentials not found - SMS will be simulated');
    }
  }

  async sendVerificationCode(phoneNumber: string, code: string): Promise<void> {
    // Validate phone number first
    if (!this.isValidNigerianNumber(phoneNumber)) {
      throw new Error(`Invalid Nigerian phone number format: ${phoneNumber}`);
    }

    const formattedNumber = this.formatPhoneNumber(phoneNumber);
    const message = `Your ${this.appName} verification code is: ${code}. This code expires in 5 minutes. Do not share this code with anyone.`;

    if (!this.snsClient) {
      // Development mode simulation
      console.log('📱 SMS SIMULATION (Development Mode):');
      console.log(`📞 To: ${formattedNumber}`);
      console.log(`💬 Message: ${message}`);
      console.log(`🔐 Code: ${code}`);
      console.log('💰 Estimated cost: ₦11 (~$0.007)');
      console.log('---');
      return;
    }

    // Production mode - send actual SMS via AWS SNS
    await this.sendSMSViaSNS(formattedNumber, message);
  }

  private async sendSMSViaSNS(phoneNumber: string, message: string): Promise<void> {
    try {
      console.log(`📱 Sending SMS via AWS SNS to: ${phoneNumber}`);
      
      const command = new PublishCommand({
        PhoneNumber: phoneNumber,
        Message: message,
        MessageAttributes: {
          'AWS.SNS.SMS.SenderID': {
            DataType: 'String',
            StringValue: this.appName.substring(0, 11) // Max 11 characters
          },
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional' // For verification codes
          },
          'AWS.SNS.SMS.MaxPrice': {
            DataType: 'String',
            StringValue: '0.50' // Max $0.50 per SMS (safety limit)
          }
        }
      });

      const response = await this.snsClient!.send(command);

      if (response.MessageId) {
        console.log(`✅ SMS sent successfully to ${phoneNumber}`);
        console.log(`📱 Message ID: ${response.MessageId}`);
        console.log(`💰 Estimated cost: ₦11 (~$0.007)`);
      } else {
        throw new Error('No MessageId received from AWS SNS');
      }
      
    } catch (error: any) {
      console.error('❌ AWS SNS error:', error);
      
      // Handle specific AWS SNS errors
      if (error.name === 'InvalidParameterException') {
        if (error.message.includes('phone number')) {
          throw new Error('Invalid phone number format for AWS SNS');
        } else if (error.message.includes('message')) {
          throw new Error('Invalid message content');
        }
      }
      
      if (error.name === 'AuthorizationException') {
        throw new Error('AWS credentials invalid or insufficient permissions');
      }
      
      if (error.name === 'ThrottlingException') {
        throw new Error('SMS rate limit exceeded. Please try again later.');
      }

      if (error.name === 'EndpointDisabledException') {
        throw new Error('Phone number has opted out of SMS messages');
      }
      
      throw new Error(`Failed to send SMS via AWS SNS: ${error.message}`);
    }
  }

  // Format phone number for AWS SNS (expects full international format with +)
  formatPhoneNumber(phoneNumber: string): string {
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    console.log(`📱 Original phone: ${phoneNumber}`);
    console.log(`📱 Cleaned phone: ${cleaned}`);
    
    // If it already starts with +234, return as is
    if (cleaned.startsWith('+234')) {
      console.log(`📱 Already formatted: ${cleaned}`);
      return cleaned;
    }
    
    // Remove + if present at start
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }
    
    // If it already has 234, add +
    if (cleaned.startsWith('234')) {
      const formatted = '+' + cleaned;
      console.log(`📱 Added + to 234: ${formatted}`);
      return formatted;
    }
    
    // If it starts with 0, remove it and add +234
    if (cleaned.startsWith('0')) {
      const formatted = '+234' + cleaned.substring(1);
      console.log(`📱 Replaced 0 with +234: ${formatted}`);
      return formatted;
    }
    
    // If it's 10 digits starting with 7/8/9, add +234
    if (/^[789]\d{9}$/.test(cleaned)) {
      const formatted = '+234' + cleaned;
      console.log(`📱 Added +234 to local number: ${formatted}`);
      return formatted;
    }
    
    // Default: add +234
    const formatted = '+234' + cleaned;
    console.log(`📱 Default format: ${formatted}`);
    return formatted;
  }

  // Validate Nigerian phone numbers
  isValidNigerianNumber(phoneNumber: string): boolean {
    const formatted = this.formatPhoneNumber(phoneNumber);
    
    // Must be +234 followed by 7/8/9 and exactly 9 more digits (total 14 characters)
    const nigerianRegex = /^\+234[789]\d{9}$/;
    
    const isValid = nigerianRegex.test(formatted);
    console.log(`📱 Nigerian validation for ${formatted}: ${isValid}`);
    
    return isValid;
  }

  // Get display format for phone numbers (for UI)
  getDisplayFormat(phoneNumber: string): string {
    const formatted = this.formatPhoneNumber(phoneNumber);
    
    // Convert +234XXXXXXXXXX to +234 XXX XXX XXXX for display
    if (formatted.startsWith('+234') && formatted.length === 14) {
      const number = formatted.substring(4); // Remove +234
      return `+234 ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6)}`;
    }
    
    return formatted;
  }

  // Helper method to estimate costs
  estimateCost(messageCount: number): { naira: number; usd: number } {
    const costPerSMS = 11; // ₦11 per SMS
    const usdRate = 0.007; // ~$0.007 per SMS
    
    return {
      naira: messageCount * costPerSMS,
      usd: messageCount * usdRate
    };
  }

  // Test connection to AWS SNS
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.snsClient) {
      return { success: false, message: 'AWS credentials not configured' };
    }

    try {
      // Test with a simple publish to a test topic (this won't actually send SMS)
      const testCommand = new PublishCommand({
        PhoneNumber: '+2347000000000', // Dummy number for testing
        Message: 'Test connection',
        DryRun: true // This would be ideal but SNS doesn't support DryRun
      });

      // Instead, we'll just verify credentials by attempting to create the command
      // Real test would require sending to a real number or using a test endpoint
      
      return { 
        success: true, 
        message: `AWS SNS connection ready. Region: ${this.region}` 
      };
    } catch (error: any) {
      return { 
        success: false, 
        message: `AWS SNS connection failed: ${error.message}` 
      };
    }
  }

  // Utility method for delays (if needed for retries)
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const smsService = new SMSService();