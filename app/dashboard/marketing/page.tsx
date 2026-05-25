'use client';

import { useState } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { DataTable } from '@/components/dashboard/DataTable';
import { mockCustomersData, mockWhatsAppAutomations } from '@/lib/mock-data';
import { MessageCircle, Send, Users, Filter, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function MarketingPage() {
  const [isSending, setIsSending] = useState(false);
  const [customerFilter, setCustomerFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [messageType, setMessageType] = useState<'discount' | 'promotion' | 'custom'>('discount');
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [messageContent, setMessageContent] = useState('');

  // Filter customers based on selection
  const filteredCustomers = mockCustomersData.filter(customer => {
    if (customerFilter === 'all') return true;
    if (customerFilter === 'active') return customer.status === 'active';
    if (customerFilter === 'inactive') return customer.status === 'inactive';
    return true;
  });

  const totalMessages = mockWhatsAppAutomations.reduce((sum, a) => sum + a.messagesSent, 0);
  const activeAutomations = mockWhatsAppAutomations.filter((a) => a.status === 'active').length;

  const handleSelectAll = () => {
    if (selectedCustomers.length === filteredCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredCustomers.map(c => c.id));
    }
  };

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomers(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const columns = [
    { key: 'name' as const, label: 'Customer Name' },
    { key: 'email' as const, label: 'Email' },
    { key: 'phone' as const, label: 'Phone' },
    {
      key: 'status' as const,
      label: 'Status',
      render: (value: string) => (
        <Badge variant={value === 'active' ? 'default' : 'secondary'}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </Badge>
      ),
    },
  ];

  const automationColumns = [
    { key: 'name' as const, label: 'Campaign' },
    { key: 'trigger' as const, label: 'Trigger' },
    {
      key: 'status' as const,
      label: 'Status',
      render: (value: string) => (
        <Badge variant={value === 'active' ? 'default' : 'secondary'}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'messagesSent' as const,
      label: 'Messages Sent',
      render: (value: number) => value.toLocaleString(),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Marketing & Promotions</h1>
        <p className="text-slate-400 mt-2">Send promotional messages and discounts to your customers via WhatsApp.</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Customers"
          value={mockCustomersData.length}
          subtitle="All customers"
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          title="Active Customers"
          value={mockCustomersData.filter(c => c.status === 'active').length}
          subtitle="Currently active"
        />
        <StatCard
          title="Active Campaigns"
          value={activeAutomations}
          subtitle="Running automations"
          icon={<MessageCircle className="w-4 h-4" />}
        />
        <StatCard
          title="Messages Sent"
          value={totalMessages.toLocaleString()}
          subtitle="All time"
          trend={{ value: 18, direction: 'up' }}
        />
      </div>

      {/* Send Message Section */}
      <ChartCard title="Send WhatsApp Message">
        <div className="space-y-6">
          {/* Customer Selection */}
          <div>
            <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Select Customers
            </h3>
            
            {/* Filter Buttons */}
            <div className="flex gap-2 mb-4">
              <Button
                onClick={() => setCustomerFilter('all')}
                variant={customerFilter === 'all' ? 'default' : 'outline'}
                className={customerFilter === 'all' ? 'bg-blue-600 hover:bg-blue-700' : 'border-slate-600 text-slate-300'}
              >
                All Customers ({mockCustomersData.length})
              </Button>
              <Button
                onClick={() => setCustomerFilter('active')}
                variant={customerFilter === 'active' ? 'default' : 'outline'}
                className={customerFilter === 'active' ? 'bg-green-600 hover:bg-green-700' : 'border-slate-600 text-slate-300'}
              >
                Active ({mockCustomersData.filter(c => c.status === 'active').length})
              </Button>
              <Button
                onClick={() => setCustomerFilter('inactive')}
                variant={customerFilter === 'inactive' ? 'default' : 'outline'}
                className={customerFilter === 'inactive' ? 'bg-yellow-600 hover:bg-yellow-700' : 'border-slate-600 text-slate-300'}
              >
                Inactive ({mockCustomersData.filter(c => c.status === 'inactive').length})
              </Button>
            </div>

            {/* Select All Checkbox */}
            <div className="flex items-center gap-3 p-3 bg-slate-900/30 rounded-lg border border-slate-700 mb-4">
              <Checkbox
                checked={selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-slate-300 font-medium">
                Select All {filteredCustomers.length} Customers
              </span>
              {selectedCustomers.length > 0 && (
                <span className="ml-auto text-blue-400 font-semibold">
                  {selectedCustomers.length} selected
                </span>
              )}
            </div>

            {/* Customer List */}
            <div className="bg-slate-900/20 rounded-lg border border-slate-700 max-h-64 overflow-y-auto">
              {filteredCustomers.map(customer => (
                <div
                  key={customer.id}
                  className="flex items-center gap-3 p-3 border-b border-slate-700/50 last:border-b-0 hover:bg-slate-900/40 transition-colors"
                >
                  <Checkbox
                    checked={selectedCustomers.includes(customer.id)}
                    onCheckedChange={() => handleSelectCustomer(customer.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 font-medium truncate">{customer.name}</p>
                    <p className="text-xs text-slate-400 truncate">{customer.phone}</p>
                  </div>
                  <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
                    {customer.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Message Template Selection */}
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-2">Message Type</label>
            <Select value={messageType} onValueChange={(value: any) => setMessageType(value)}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="discount">Discount Offer</SelectItem>
                <SelectItem value="promotion">Promotional Message</SelectItem>
                <SelectItem value="custom">Custom Message</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Message Content */}
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-2">Message Content</label>
            <Textarea
              placeholder="Write your message here. Use {'{'}{'{'}name{'}'}{'}'} for customer name, {'{'}{'{'}phone{'}'}{'}'} for phone, etc."
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white"
              rows={4}
            />
            <p className="text-xs text-slate-400 mt-2">
              Available variables: {'{'}name{'}'}, {'{'}phone{'}'}, {'{'}email{'}'}, {'{'}lastPurchaseDate{'}'}
            </p>
          </div>

          {/* Quick Templates */}
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-2">Quick Templates</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Button
                onClick={() => setMessageContent('Hi {{name}}! 🎉 Get 20% off your next purchase. Use code SAVE20. Valid till end of month.')}
                variant="outline"
                className="border-slate-600 text-slate-300 justify-start text-xs h-auto py-2"
              >
                <span className="text-left">20% Discount Offer</span>
              </Button>
              <Button
                onClick={() => setMessageContent('{{name}}, check out our new collection! Special offers available for limited time. Shop now!')}
                variant="outline"
                className="border-slate-600 text-slate-300 justify-start text-xs h-auto py-2"
              >
                <span className="text-left">New Collection Alert</span>
              </Button>
              <Button
                onClick={() => setMessageContent('We miss you {{name}}! Come back and explore with an exclusive 15% welcome-back discount. Code: COMEBACK15')}
                variant="outline"
                className="border-slate-600 text-slate-300 justify-start text-xs h-auto py-2"
              >
                <span className="text-left">Win-back Campaign</span>
              </Button>
              <Button
                onClick={() => setMessageContent('Thank you {{name}} for your loyalty! Special members-only sale happening now. Shop exclusive deals!')}
                variant="outline"
                className="border-slate-600 text-slate-300 justify-start text-xs h-auto py-2"
              >
                <span className="text-left">VIP Customer Offer</span>
              </Button>
            </div>
          </div>

          {/* Send Button */}
          <div className="flex gap-2">
            <Button
              onClick={() => setIsSending(true)}
              disabled={selectedCustomers.length === 0 || !messageContent.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              <Send className="w-4 h-4 mr-2" />
              Send to {selectedCustomers.length} Customer{selectedCustomers.length !== 1 ? 's' : ''}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedCustomers([]);
                setMessageContent('');
                setCustomerFilter('all');
              }}
              className="border-slate-600 text-slate-300"
            >
              Clear
            </Button>
          </div>

          {/* Success Message */}
          {isSending && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
              <Check className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-green-400 font-semibold">Messages Scheduled Successfully!</p>
                <p className="text-xs text-green-300">Your messages will be sent to {selectedCustomers.length} customers.</p>
              </div>
              <Button
                onClick={() => setIsSending(false)}
                variant="ghost"
                className="ml-auto text-green-400 hover:text-green-300"
              >
                Dismiss
              </Button>
            </div>
          )}
        </div>
      </ChartCard>

      {/* Active Automations */}
      <ChartCard title="Active Campaigns">
        <DataTable data={mockWhatsAppAutomations} columns={automationColumns} />
      </ChartCard>
    </div>
  );
}
