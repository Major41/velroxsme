// Dashboard Types

export interface SaleTransaction {
  id: string;
  date: string;
  productName: string;
  category: string;
  amount: number;
  quantity: number;
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  status: 'completed' | 'pending' | 'cancelled';
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  status: 'paid' | 'pending';
}

export interface Purchase {
  id: string;
  date: string;
  vendorName: string;
  category: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentMethod: string;
  status: 'delivered' | 'pending' | 'cancelled';
  deliveryDate?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  location: string;
  joinDate: string;
  totalSpent: number;
  visitCount: number;
  status: 'active' | 'inactive';
  lastPurchase: string;
}

export interface RepeatCustomer extends Customer {
  repeatPercentage: number;
  loyaltyTier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface Promotion {
  id: string;
  title: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  code?: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'ended' | 'scheduled';
  usageCount: number;
  targetAmount: number;
}

export interface WhatsAppAutomation {
  id: string;
  name: string;
  trigger: string;
  template: string;
  status: 'active' | 'inactive';
  createdDate: string;
  messagesSent: number;
}

export interface Reminder {
  id: string;
  title: string;
  description: string;
  type: 'followup' | 'birthday' | 'anniversary' | 'custom';
  customer: string;
  dueDate: string;
  status: 'pending' | 'sent' | 'completed';
  createdDate: string;
}

export interface DashboardStats {
  totalSales: number;
  totalExpenses: number;
  totalCustomers: number;
  repeatCustomers: number;
  profitMargin: number;
  activePromotions: number;
}

export interface ChartData {
  name: string;
  value: number;
  fill?: string;
}

export interface SalesChartData {
  date: string;
  sales: number;
  expenses: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'manager' | 'staff';
  status: 'active' | 'inactive';
  permissions: string[];
  joinDate: string;
  lastLogin: string;
}

export interface CompanySettings {
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  companyCity: string;
  companyState: string;
  companyZip: string;
  companyLogo?: string;
  adminEmail: string;
  adminPhone: string;
  businessType: string;
  taxId: string;
  timezone: string;
  currency: string;
}

export interface Business {
  id: string;
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  businessType: string;
  city: string;
  status: 'active' | 'inactive' | 'suspended';
  subscriptionTier: 'basic' | 'pro' | 'enterprise';
  joinDate: string;
  totalUsers: number;
  business_logo?: string;
}

export interface Payment {
  id: string;
  businessId: string;
  businessName: string;
  amount: number;
  subscriptionTier: 'basic' | 'pro' | 'enterprise';
  paymentStatus: 'paid' | 'pending' | 'expired';
  billingDate: string;
  expiryDate: string;
  daysUntilExpiry: number;
  paymentMethod: string;
}

export interface SuperAdminUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'super-admin';
  createdDate: string;
}

export interface SuperAdminPlatformSettings {
  platformName: string;
  platformEmail: string;
  platformPhone: string;
  platformLogo?: string;
  companyName: string;
  supportEmail: string;
  supportPhone: string;
}
