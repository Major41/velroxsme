'use client';

import { useState } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { DataTable } from '@/components/dashboard/DataTable';
import { mockRemindersData } from '@/lib/mock-data';
import { Bell, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function RemindersPage() {
  const [isCreating, setIsCreating] = useState(false);

  const pendingReminders = mockRemindersData.filter((r) => r.status === 'pending');
  const completedReminders = mockRemindersData.filter((r) => r.status === 'completed');
  const upcomingCount = pendingReminders.filter((r) => {
    const dueDate = new Date(r.dueDate);
    const today = new Date();
    return dueDate > today;
  }).length;

  const columns = [
    { key: 'title' as const, label: 'Reminder' },
    { key: 'customer' as const, label: 'Customer' },
    {
      key: 'type' as const,
      label: 'Type',
      render: (value: string) => (
        <Badge variant="outline" className="text-xs">
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </Badge>
      ),
    },
    { key: 'dueDate' as const, label: 'Due Date' },
    {
      key: 'status' as const,
      label: 'Status',
      render: (value: string) => (
        <Badge
          variant={
            value === 'pending'
              ? 'default'
              : value === 'completed'
                ? 'secondary'
                : 'outline'
          }
        >
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Reminders & Follow-ups</h1>
        <p className="text-slate-400 mt-2">Set up and manage customer follow-up reminders.</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending Reminders"
          value={pendingReminders.length}
          subtitle="To be executed"
          icon={<Bell className="w-4 h-4" />}
          trend={{ value: 5, direction: 'up' }}
        />
        <StatCard
          title="Upcoming (7 Days)"
          value={upcomingCount}
          subtitle="Due soon"
          trend={{ value: 2, direction: 'up' }}
        />
        <StatCard
          title="Completed"
          value={completedReminders.length}
          subtitle="Executed reminders"
          trend={{ value: 10, direction: 'up' }}
        />
        <StatCard
          title="Total Reminders"
          value={mockRemindersData.length}
          subtitle="All time"
        />
      </div>

      {/* Create New Reminder */}
      <ChartCard title={isCreating ? 'Create New Reminder' : 'Create Reminder'}>
        {!isCreating ? (
          <div className="space-y-3">
            <p className="text-slate-400 text-sm">Set up automated reminders for customer follow-ups and special occasions</p>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setIsCreating(true)}>
              <Bell className="w-4 h-4 mr-2" />
              New Reminder
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-2">Reminder Title</label>
              <Input
                placeholder="e.g., Follow-up with Rajesh"
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 block mb-2">Customer</label>
              <Select>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="rajesh">Rajesh Kumar</SelectItem>
                  <SelectItem value="priya">Priya Sharma</SelectItem>
                  <SelectItem value="amit">Amit Patel</SelectItem>
                  <SelectItem value="deepak">Deepak Verma</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">Reminder Type</label>
                <Select>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    <SelectItem value="followup">Follow-up</SelectItem>
                    <SelectItem value="birthday">Birthday</SelectItem>
                    <SelectItem value="anniversary">Anniversary</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">Due Date</label>
                <Input type="date" className="bg-slate-900 border-slate-700 text-white" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 block mb-2">Description</label>
              <Textarea
                placeholder="Add details about this reminder..."
                className="bg-slate-900 border-slate-700 text-white"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">Create Reminder</Button>
              <Button
                variant="outline"
                onClick={() => setIsCreating(false)}
                className="border-slate-600 text-slate-300"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </ChartCard>

      {/* Reminder Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Follow-ups', count: 2, icon: '📞', color: 'bg-blue-500/20' },
          { label: 'Birthdays', count: 1, icon: '🎂', color: 'bg-pink-500/20' },
          { label: 'Anniversaries', count: 1, icon: '🎉', color: 'bg-purple-500/20' },
          { label: 'Custom', count: 1, icon: '📋', color: 'bg-yellow-500/20' },
        ].map((cat, idx) => (
          <ChartCard key={idx} className={cat.color}>
            <div className="space-y-2">
              <div className="text-2xl">{cat.icon}</div>
              <p className="text-slate-400 text-sm">{cat.label}</p>
              <p className="text-2xl font-bold text-white">{cat.count}</p>
            </div>
          </ChartCard>
        ))}
      </div>

      {/* Upcoming Reminders */}
      <ChartCard title="Upcoming Reminders (Next 7 Days)">
        {upcomingCount === 0 ? (
          <p className="text-slate-400 text-center py-8">No reminders due in the next 7 days</p>
        ) : (
          <div className="space-y-3">
            {pendingReminders
              .filter((r) => {
                const dueDate = new Date(r.dueDate);
                const today = new Date();
                const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                return dueDate > today && dueDate <= nextWeek;
              })
              .map((reminder) => (
                <div
                  key={reminder.id}
                  className="p-4 bg-slate-900/30 rounded-lg border border-blue-500/30 flex justify-between items-start"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{reminder.title}</h3>
                    <div className="mt-2 space-y-1 text-sm text-slate-400">
                      <p className="flex items-center gap-2">
                        <User className="w-3 h-3" /> {reminder.customer}
                      </p>
                      <p className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" /> {reminder.dueDate}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    Execute
                  </Button>
                </div>
              ))}
          </div>
        )}
      </ChartCard>

      {/* All Reminders Table */}
      <ChartCard title="All Reminders">
        <DataTable data={mockRemindersData} columns={columns} />
      </ChartCard>
    </div>
  );
}
