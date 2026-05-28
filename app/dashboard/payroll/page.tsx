"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { useBusiness } from "@/context/BusinessContext";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, AlertCircle, Check, Users } from "lucide-react";
import Link from "next/link";

interface Employee {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  status: string;
}

interface PayrollRecord {
  id: string;
  business_id: string;
  employee_id: string;
  employee_name: string;
  amount: number;
  payment_date: string;
  payment_month: string;
  notes: string | null;
  status: string;
}

export default function PayrollPage() {
  const { user } = useUser();
  const { business } = useBusiness();
  const supabase = createClient();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

  const [formData, setFormData] = useState({
    employeeId: "",
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMonth: new Date().toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    }),
    notes: "",
  });

  // Fetch active employees for the business
  const fetchEmployees = async () => {
    if (!business?.id) return;

    try {
      const { data, error: fetchError } = await supabase
        .from("business_users")
        .select("id, name, email, role")
        .eq("business_id", business.id)
        .order("name");


      if (fetchError) throw fetchError;
      setEmployees(data || []);
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [business?.id]);

  // Fetch payroll records
  useEffect(() => {
    const fetchPayroll = async () => {
      if (!business?.id) return;

      try {
        const { data, error: fetchError } = await supabase
          .from("payroll")
          .select("*")
          .eq("business_id", business.id)
          .order("payment_date", { ascending: false });

        if (fetchError) throw fetchError;
        setPayrollRecords(data || []);
      } catch (err) {
        console.error("Error fetching payroll:", err);
      }
    };

    fetchPayroll();
  }, [business?.id]);

  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setFormData((prev) => ({
      ...prev,
      employeeId: employeeId,
    }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setFormData((prev) => ({
      ...prev,
      paymentDate: date,
      paymentMonth: new Date(date).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (!formData.employeeId || !formData.amount) {
        setError("Please select an employee and enter an amount");
        return;
      }

      const selectedEmployee = employees.find(
        (emp) => emp.id === formData.employeeId,
      );
      if (!selectedEmployee) {
        setError("Selected employee not found");
        return;
      }


      const { error: insertError } = await supabase.from("payroll").insert({
        business_id: business?.id,
        employee_id: formData.employeeId,
        employee_name: selectedEmployee.name, // Changed from employee_name to name
        amount: parseFloat(formData.amount),
        payment_date: formData.paymentDate,
        payment_month: formData.paymentMonth,
        notes: formData.notes || null,
        status: "paid",
      });

      if (insertError) {
        console.error("Insert error:", insertError);
        setError(insertError.message);
        return;
      }

      setSuccess("Payroll record added successfully!");
      setFormData({
        employeeId: "",
        amount: "",
        paymentDate: new Date().toISOString().split("T")[0],
        paymentMonth: new Date().toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
        notes: "",
      });
      setSelectedEmployeeId("");

      setTimeout(() => {
        setShowForm(false);
        setSuccess("");
      }, 2000);

      // Refresh payroll records
      const { data: updated } = await supabase
        .from("payroll")
        .select("*")
        .eq("business_id", business?.id)
        .order("payment_date", { ascending: false });
      setPayrollRecords(updated || []);
    } catch (err: any) {
      console.error("Submit error:", err);
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;

    try {
      const { error: deleteError } = await supabase
        .from("payroll")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      setPayrollRecords((prev) => prev.filter((record) => record.id !== id));
      setSuccess("Record deleted successfully!");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err: any) {
      setError(err.message || "Error deleting record");
      setTimeout(() => setError(""), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-100">
          Payroll Management
        </h1>
        <p className="text-slate-400 mt-1">
          Record and manage employee salary payments
        </p>
      </div>

      {/* Add Button and Form */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-100">
          Payroll Records
        </h2>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Payment
        </Button>
      </div>

      {/* Warning if no employees */}
      {employees.length === 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-yellow-400" />
            <div className="flex-1">
              <p className="text-yellow-200 text-sm">
                You haven't added any employees yet. Please add employees first
                to process payroll.
              </p>
            </div>
            <Link href="/dashboard/employees">
              <Button className="bg-yellow-600 hover:bg-yellow-700 text-white">
                Add Employees
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Payroll Form */}
      {showForm && employees.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex gap-3">
              <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-emerald-200 text-sm">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Select Employee *
                </label>
                <Select
                  onValueChange={handleEmployeeSelect}
                  value={selectedEmployeeId}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}{" "}
                        {employee.role && `- ${employee.role}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Amount (KSh) *
                </label>
                <Input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  className="bg-slate-800 border-slate-700 text-white"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Payment Date *
                </label>
                <Input
                  type="date"
                  name="paymentDate"
                  value={formData.paymentDate}
                  onChange={handleDateChange}
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Payment Month
                </label>
                <Input
                  type="text"
                  value={formData.paymentMonth}
                  disabled
                  className="bg-slate-700 border-slate-600 text-slate-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Additional notes..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading ? "Saving..." : "Save Payment"}
              </Button>
              <Button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-slate-700 hover:bg-slate-600 text-white"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Records Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        {payrollRecords.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            No payroll records yet. Click "Add Payment" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-200">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-200">
                    Amount (KSh)
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-200">
                    Payment Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-200">
                    Month
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-200">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-200">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {payrollRecords.map((record) => (
                  <tr
                    key={record.id}
                    className="hover:bg-slate-800/50 transition"
                  >
                    <td className="px-6 py-3 text-sm text-slate-100">
                      {record.employee_name}
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-emerald-400">
                      KSh {record.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-300">
                      {new Date(record.payment_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-300">
                      {record.payment_month}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <span className="bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded text-xs font-medium">
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="text-red-400 hover:text-red-300 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      {payrollRecords.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Total Payments</p>
              <p className="text-2xl font-bold text-slate-100 mt-1">
                KSh{" "}
                {payrollRecords
                  .reduce((sum, r) => sum + r.amount, 0)
                  .toLocaleString()}
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Employees Paid</p>
              <p className="text-2xl font-bold text-slate-100 mt-1">
                {new Set(payrollRecords.map((r) => r.employee_name)).size}
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Payment Records</p>
              <p className="text-2xl font-bold text-slate-100 mt-1">
                {payrollRecords.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
