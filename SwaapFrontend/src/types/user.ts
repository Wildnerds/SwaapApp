// types/user.ts

export interface User {
  _id: string;
  email: string;
  fullName: string;
  level?: string;
  plan?: 'free' | 'pro';
  successfulSwaps?: number;
  verified?: boolean;

  // Allow for dynamic optional string properties if you need them
  [key: string]: string | number | boolean | undefined;
}
