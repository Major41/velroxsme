// lib/permissions.ts

export interface Permission {
  key: string;
  label: string;
  description: string;
  group: string;
}

export const PERMISSIONS: Permission[] = [
  // Sales & Revenue
  { key: "sales.view", label: "View sales", description: "See sales records and revenue", group: "Sales" },
  { key: "sales.create", label: "Create sales", description: "Record new sales", group: "Sales" },
  { key: "sales.edit", label: "Edit sales", description: "Modify existing sales", group: "Sales" },
  { key: "sales.delete", label: "Delete sales", description: "Remove sales records", group: "Sales" },

  // Expenses
  { key: "expenses.view", label: "View expenses", description: "See expense records", group: "Expenses" },
  { key: "expenses.create", label: "Create expenses", description: "Add new expenses", group: "Expenses" },
  { key: "expenses.edit", label: "Edit expenses", description: "Modify existing expenses", group: "Expenses" },
  { key: "expenses.delete", label: "Delete expenses", description: "Remove expenses", group: "Expenses" },

  // Purchases
  { key: "purchases.view", label: "View purchases", description: "See purchase records", group: "Purchases" },
  { key: "purchases.create", label: "Create purchases", description: "Record new purchases", group: "Purchases" },
  { key: "purchases.edit", label: "Edit purchases", description: "Modify existing purchases", group: "Purchases" },
  { key: "purchases.delete", label: "Delete purchases", description: "Remove purchases", group: "Purchases" },

  // Invoices
  { key: "invoices.view", label: "View invoices", description: "See invoices", group: "Invoices" },
  { key: "invoices.create", label: "Create invoices", description: "Generate new invoices", group: "Invoices" },
  { key: "invoices.edit", label: "Edit invoices", description: "Modify existing invoices", group: "Invoices" },
  { key: "invoices.delete", label: "Delete invoices", description: "Remove invoices", group: "Invoices" },

  // Quotations
  { key: "quotations.view", label: "View quotations", description: "See quotations", group: "Quotations" },
  { key: "quotations.create", label: "Create quotations", description: "Create new quotations", group: "Quotations" },
  { key: "quotations.edit", label: "Edit quotations", description: "Modify existing quotations", group: "Quotations" },
  { key: "quotations.delete", label: "Delete quotations", description: "Remove quotations", group: "Quotations" },

  // Customers
  { key: "customers.view", label: "View customers", description: "See customer records", group: "Customers" },
  { key: "customers.create", label: "Create customers", description: "Add new customers", group: "Customers" },
  { key: "customers.edit", label: "Edit customers", description: "Modify customer records", group: "Customers" },
  { key: "customers.delete", label: "Delete customers", description: "Remove customers", group: "Customers" },

  // Payroll
  { key: "payroll.view", label: "View payroll", description: "See payroll records", group: "Payroll" },
  { key: "payroll.create", label: "Create payroll", description: "Record payroll payments", group: "Payroll" },
  { key: "payroll.edit", label: "Edit payroll", description: "Modify payroll records", group: "Payroll" },
  { key: "payroll.delete", label: "Delete payroll", description: "Remove payroll records", group: "Payroll" },

  // Analytics
  { key: "analytics.view", label: "View analytics", description: "Access all analytics pages", group: "Analytics" },
  { key: "analytics.profitability", label: "View profitability", description: "See profit & margin data", group: "Analytics" },

  // AI
  { key: "ai.use", label: "Use Velrox AI", description: "Ask business questions to the AI assistant", group: "AI" },

  // Settings
  { key: "settings.view", label: "View settings", description: "See business settings", group: "Settings" },
  { key: "settings.edit", label: "Edit settings", description: "Change business settings", group: "Settings" },

  // System
  { key: "users.view", label: "View system users", description: "See the list of team members", group: "System" },
  { key: "users.create", label: "Create system users", description: "Add new team members", group: "System" },
  { key: "users.edit", label: "Edit system users", description: "Modify user details & roles", group: "System" },
  { key: "users.delete", label: "Delete system users", description: "Remove team members", group: "System" },
  { key: "roles.view", label: "View roles", description: "See available roles", group: "System" },
  { key: "roles.create", label: "Create roles", description: "Define new roles", group: "System" },
  { key: "roles.edit", label: "Edit roles", description: "Modify role permissions", group: "System" },
  { key: "roles.delete", label: "Delete roles", description: "Remove non-system roles", group: "System" },
];

export const PERMISSION_GROUPS = Array.from(
  new Set(PERMISSIONS.map((p) => p.group)),
);

export const ALL_PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

/** Preset roles offered when a business is created */
export const DEFAULT_ROLES = [
  {
    name: "Admin",
    description: "Full access to everything",
    permissions: ALL_PERMISSION_KEYS,
    is_system: true,
  },
  {
    name: "Manager",
    description: "Day-to-day operations, no settings or user management",
    permissions: [
      "sales.view", "sales.create", "sales.edit",
      "expenses.view", "expenses.create", "expenses.edit",
      "purchases.view", "purchases.create", "purchases.edit",
      "invoices.view", "invoices.create", "invoices.edit",
      "quotations.view", "quotations.create", "quotations.edit",
      "customers.view", "customers.create", "customers.edit",
      "payroll.view",
      "analytics.view",
      "ai.use",
    ],
    is_system: true,
  },
  {
    name: "Cashier",
    description: "Record sales and view customers",
    permissions: [
      "sales.view", "sales.create",
      "customers.view", "customers.create",
      "invoices.view", "invoices.create",
    ],
    is_system: true,
  },
  {
    name: "Viewer",
    description: "Read-only access to reports",
    permissions: [
      "sales.view",
      "expenses.view",
      "purchases.view",
      "invoices.view",
      "quotations.view",
      "customers.view",
      "payroll.view",
      "analytics.view",
    ],
    is_system: true,
  },
];