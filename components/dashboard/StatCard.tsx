'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  className?: string;
}

export function StatCard({ title, value, subtitle, icon, trend, className }: StatCardProps) {
  return (
    <Card className={`border-slate-700 bg-slate-800/50 ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-300">{title}</CardTitle>
        {icon && <div className="text-blue-400/50">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
        {(subtitle || trend) && (
          <div className="text-xs text-slate-400 mt-1">
            {trend && (
              <span className={trend.direction === 'up' ? 'text-emerald-400' : 'text-red-400'}>
                {trend.direction === 'up' ? '↑' : '↓'} {trend.value}%
              </span>
            )}
            {subtitle && <span>{subtitle}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
