import { Business, Payment, SuperAdminUser, SuperAdminPlatformSettings } from './types';

// Super Admin Users - Only one can exist
export const mockSuperAdminUsers: SuperAdminUser[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'superadmin@platform.com',
    password: 'admin123',
    role: 'super-admin',
    createdDate: '2024-01-01',
  },
];

// Mock Businesses Data
export const mockBusinessesData: Business[] = [
  {
    id: '1',
    businessName: 'TechFlow Solutions',
    ownerName: 'Raj Patel',
    ownerEmail: 'raj@techflow.com',
    ownerPhone: '+254 712 345 678',
    businessType: 'Technology & Services',
    city: 'Nairobi',
    status: 'active',
    subscriptionTier: 'pro',
    joinDate: '2023-06-15',
    totalUsers: 6,
  },
  {
    id: '2',
    businessName: 'Fashion Hub Kenya',
    ownerName: 'Amara Okonkwo',
    ownerEmail: 'amara@fashionhub.com',
    ownerPhone: '+254 701 234 567',
    businessType: 'Retail & Fashion',
    city: 'Mombasa',
    status: 'active',
    subscriptionTier: 'basic',
    joinDate: '2023-08-20',
    totalUsers: 3,
  },
  {
    id: '3',
    businessName: 'Digital Marketing Pro',
    ownerName: 'James Kariuki',
    ownerEmail: 'james@dmp.com',
    ownerPhone: '+254 722 567 890',
    businessType: 'Marketing & Advertising',
    city: 'Nairobi',
    status: 'active',
    subscriptionTier: 'enterprise',
    joinDate: '2023-04-10',
    totalUsers: 12,
  },
  {
    id: '4',
    businessName: 'Cafe Delights',
    ownerName: 'Grace Musyoka',
    ownerEmail: 'grace@cafedelights.com',
    ownerPhone: '+254 715 678 901',
    businessType: 'Food & Beverage',
    city: 'Kisumu',
    status: 'active',
    subscriptionTier: 'basic',
    joinDate: '2023-09-05',
    totalUsers: 2,
  },
  {
    id: '5',
    businessName: 'Real Estate Prime',
    ownerName: 'David Kipchoge',
    ownerEmail: 'david@realestate.com',
    ownerPhone: '+254 735 234 567',
    businessType: 'Real Estate',
    city: 'Nairobi',
    status: 'inactive',
    subscriptionTier: 'pro',
    joinDate: '2023-03-12',
    totalUsers: 4,
  },
  {
    id: '6',
    businessName: 'Health & Wellness Clinic',
    ownerName: 'Dr. Sarah Njoroge',
    ownerEmail: 'sarah@healthwellness.com',
    ownerPhone: '+254 755 890 123',
    businessType: 'Healthcare',
    city: 'Thika',
    status: 'active',
    subscriptionTier: 'pro',
    joinDate: '2023-07-22',
    totalUsers: 5,
  },
  {
    id: '7',
    businessName: 'Education Excellence',
    ownerName: 'Peter Mwangi',
    ownerEmail: 'peter@edexcellence.com',
    ownerPhone: '+254 765 123 456',
    businessType: 'Education',
    city: 'Nakuru',
    status: 'suspended',
    subscriptionTier: 'basic',
    joinDate: '2023-02-01',
    totalUsers: 3,
  },
  {
    id: '8',
    businessName: 'Tech Solutions Ltd',
    ownerName: 'Alice Kiplagat',
    ownerEmail: 'alice@techsolutions.com',
    ownerPhone: '+254 745 567 890',
    businessType: 'Software Development',
    city: 'Nairobi',
    status: 'active',
    subscriptionTier: 'enterprise',
    joinDate: '2023-05-18',
    totalUsers: 8,
  },
];

// Mock Payments Data
export const mockPaymentsData: Payment[] = [
  {
    id: '1',
    businessId: '1',
    businessName: 'TechFlow Solutions',
    amount: 9999,
    subscriptionTier: 'pro',
    paymentStatus: 'paid',
    billingDate: '2024-01-01',
    expiryDate: '2024-02-01',
    daysUntilExpiry: 22,
    paymentMethod: 'Credit Card',
  },
  {
    id: '2',
    businessId: '2',
    businessName: 'Fashion Hub Kenya',
    amount: 4999,
    subscriptionTier: 'basic',
    paymentStatus: 'paid',
    billingDate: '2024-01-05',
    expiryDate: '2024-02-05',
    daysUntilExpiry: 26,
    paymentMethod: 'M-Pesa',
  },
  {
    id: '3',
    businessId: '3',
    businessName: 'Digital Marketing Pro',
    amount: 19999,
    subscriptionTier: 'enterprise',
    paymentStatus: 'paid',
    billingDate: '2023-12-15',
    expiryDate: '2024-01-15',
    daysUntilExpiry: 5,
    paymentMethod: 'Bank Transfer',
  },
  {
    id: '4',
    businessId: '4',
    businessName: 'Cafe Delights',
    amount: 4999,
    subscriptionTier: 'basic',
    paymentStatus: 'pending',
    billingDate: '2024-01-10',
    expiryDate: '2024-02-10',
    daysUntilExpiry: 31,
    paymentMethod: 'M-Pesa',
  },
  {
    id: '5',
    businessId: '5',
    businessName: 'Real Estate Prime',
    amount: 9999,
    subscriptionTier: 'pro',
    paymentStatus: 'expired',
    billingDate: '2023-11-15',
    expiryDate: '2023-12-15',
    daysUntilExpiry: -26,
    paymentMethod: 'Credit Card',
  },
  {
    id: '6',
    businessId: '6',
    businessName: 'Health & Wellness Clinic',
    amount: 9999,
    subscriptionTier: 'pro',
    paymentStatus: 'paid',
    billingDate: '2023-12-20',
    expiryDate: '2024-01-20',
    daysUntilExpiry: 10,
    paymentMethod: 'Bank Transfer',
  },
  {
    id: '7',
    businessId: '7',
    businessName: 'Education Excellence',
    amount: 4999,
    subscriptionTier: 'basic',
    paymentStatus: 'expired',
    billingDate: '2023-12-01',
    expiryDate: '2024-01-01',
    daysUntilExpiry: -9,
    paymentMethod: 'M-Pesa',
  },
  {
    id: '8',
    businessId: '8',
    businessName: 'Tech Solutions Ltd',
    amount: 19999,
    subscriptionTier: 'enterprise',
    paymentStatus: 'paid',
    billingDate: '2024-01-08',
    expiryDate: '2024-02-08',
    daysUntilExpiry: 29,
    paymentMethod: 'Bank Transfer',
  },
];

export function getSuperAdminStats() {
  const totalBusinesses = mockBusinessesData.length;
  const activeBusinesses = mockBusinessesData.filter((b) => b.status === 'active').length;
  const totalUsers = mockBusinessesData.reduce((sum, b) => sum + b.totalUsers, 0);

  const paidPayments = mockPaymentsData.filter((p) => p.paymentStatus === 'paid').length;
  const pendingPayments = mockPaymentsData.filter((p) => p.paymentStatus === 'pending').length;
  const expiredPayments = mockPaymentsData.filter((p) => p.paymentStatus === 'expired').length;

  const monthlyRevenue = mockPaymentsData
    .filter((p) => p.paymentStatus === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const tierCounts = {
    basic: mockBusinessesData.filter((b) => b.subscriptionTier === 'basic').length,
    pro: mockBusinessesData.filter((b) => b.subscriptionTier === 'pro').length,
    enterprise: mockBusinessesData.filter((b) => b.subscriptionTier === 'enterprise').length,
  };

  return {
    totalBusinesses,
    activeBusinesses,
    totalUsers,
    paidPayments,
    pendingPayments,
    expiredPayments,
    monthlyRevenue,
    tierCounts,
  };
}

export const mockPlatformSettings: SuperAdminPlatformSettings = {
  platformName: 'Business Hub Pro',
  platformEmail: 'support@businesshubpro.com',
  platformPhone: '+254 712 345 678',
  platformLogo: '/placeholder-logo.png',
  companyName: 'Business Hub Pro Ltd',
  supportEmail: 'support@businesshubpro.com',
  supportPhone: '+254 712 345 678',
};
