// middlewares/virtualAccount.ts
import axios from 'axios';
import User from '@/models/User';
import { WalletTransaction } from '@/models/WalletTransaction';

export interface VirtualAccountResult {
  success: boolean;
  accountDetails?: {
    accountNumber: string;
    bankName: string;
    accountName: string;
  };
  error?: string;
}

// ✅ CREATE VIRTUAL ACCOUNT FOR USER
export async function createVirtualAccountForUser(userId: string): Promise<VirtualAccountResult> {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Check if user already has a virtual account
    if (user.virtualAccountNumber && user.virtualBankName) {
      return {
        success: true,
        accountDetails: {
          accountNumber: user.virtualAccountNumber,
          bankName: user.virtualBankName,
          accountName: user.virtualAccountName || user.fullName,
        }
      };
    }

    // Create or retrieve Paystack customer
    let customerCode = user.paystackCustomerCode;
    
    if (!customerCode) {
      const customerRes = await axios.post('https://api.paystack.co/customer', {
        email: user.email,
        first_name: user.fullName?.split(' ')[0] || 'User',
        last_name: user.fullName?.split(' ').slice(1).join(' ') || '',
        phone: user.phone || '',
        metadata: {
          user_id: userId,
          registration_date: user.createdAt,
        }
      }, {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        }
      });

      customerCode = customerRes.data.data.customer_code;
    }

    // Create dedicated virtual account
    const virtualAccountRes = await axios.post('https://api.paystack.co/dedicated_account', {
      customer: customerCode,
      preferred_bank: 'wema-bank', // You can make this configurable
      // subaccount: process.env.PAYSTACK_SUBACCOUNT_CODE, // Optional
    }, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    const virtualAccountData = virtualAccountRes.data.data;

    // Update user with virtual account details
    user.paystackCustomerCode = customerCode;
    user.virtualAccountNumber = virtualAccountData.account_number;
    user.virtualAccountName = virtualAccountData.account_name;
    user.virtualBankName = virtualAccountData.bank.name;
    user.virtualAccountId = virtualAccountData.id;
    user.virtualAccountActive = true;
    
    await user.save();

    // Log the virtual account creation
    await WalletTransaction.create({
      user: user._id,
      reference: `VA-CREATED-${Date.now()}`,
      amount: 0,
      status: 'success',
      type: 'fund',
      channel: 'system',
      currency: 'NGN',
      narration: 'Virtual account created successfully',
      verified: true,
    });

    console.log(`✅ Virtual account created for user: ${user.email} - Account: ${virtualAccountData.account_number}`);

    return {
      success: true,
      accountDetails: {
        accountNumber: virtualAccountData.account_number,
        bankName: virtualAccountData.bank.name,
        accountName: virtualAccountData.account_name,
      }
    };

  } catch (error: any) {
    console.error('[Create Virtual Account Error]', error?.response?.data || error.message);
    return {
      success: false,
      error: error?.response?.data?.message || 'Failed to create virtual account'
    };
  }
}

// ✅ MIDDLEWARE TO AUTO-CREATE VIRTUAL ACCOUNT AFTER USER REGISTRATION
export const autoCreateVirtualAccount = async (req: any, res: any, next: any) => {
  try {
    // This middleware should be called after successful user registration
    const user = req.user || req.newUser; // Assuming user is attached to request
    
    if (!user || !user._id) {
      return next(); // Skip if no user context
    }

    console.log(`🏦 Auto-creating virtual account for user: ${user.email}`);

    // Create virtual account asynchronously (don't block the response)
    createVirtualAccountForUser(user._id.toString()).then((result) => {
      if (result.success) {
        console.log(`✅ Virtual account auto-created for ${user.email}`);
      } else {
        console.error(`❌ Failed to auto-create virtual account for ${user.email}: ${result.error}`);
      }
    }).catch((error) => {
      console.error(`❌ Virtual account auto-creation error for ${user.email}:`, error);
    });

    next();
  } catch (error) {
    console.error('[Auto Create Virtual Account Middleware Error]', error);
    next(); // Continue even if virtual account creation fails
  }
};

// ✅ VALIDATE VIRTUAL ACCOUNT STATUS
export async function validateVirtualAccount(userId: string): Promise<boolean> {
  try {
    const user = await User.findById(userId);
    if (!user || !user.virtualAccountId) {
      return false;
    }

    // Optional: Verify with Paystack that the account is still active
    const response = await axios.get(`https://api.paystack.co/dedicated_account/${user.virtualAccountId}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      }
    });

    const accountData = response.data.data;
    const isActive = accountData.active === true;

    // Update user's virtual account status if different
    if (user.virtualAccountActive !== isActive) {
      user.virtualAccountActive = isActive;
      await user.save();
    }

    return isActive;
  } catch (error) {
    console.error('[Validate Virtual Account Error]', error);
    return false;
  }
}

// ✅ GET BANK LIST FOR WITHDRAWALS
export async function getBankList() {
  try {
    const response = await axios.get('https://api.paystack.co/bank', {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      }
    });

    return {
      success: true,
      banks: response.data.data.map((bank: any) => ({
        name: bank.name,
        code: bank.code,
        longcode: bank.longcode,
        gateway: bank.gateway,
        pay_with_bank: bank.pay_with_bank,
        active: bank.active,
      }))
    };
  } catch (error: any) {
    console.error('[Get Bank List Error]', error?.response?.data || error.message);
    return {
      success: false,
      error: error?.response?.data?.message || 'Failed to fetch bank list'
    };
  }
}

// ✅ VERIFY BANK ACCOUNT
export async function verifyBankAccount(accountNumber: string, bankCode: string) {
  try {
    const response = await axios.get(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        }
      }
    );

    if (response.data.status) {
      return {
        success: true,
        accountName: response.data.data.account_name,
        accountNumber: response.data.data.account_number,
      };
    } else {
      return {
        success: false,
        error: 'Unable to verify account details'
      };
    }
  } catch (error: any) {
    console.error('[Verify Bank Account Error]', error?.response?.data || error.message);
    return {
      success: false,
      error: error?.response?.data?.message || 'Account verification failed'
    };
  }
}