'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DataTableColumn<T> {
  key: keyof T;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  className?: string;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  className,
}: DataTableProps<T>) {
  return (
    <div className={`rounded-lg border border-slate-700 bg-slate-900/50 overflow-hidden ${className}`}>
      <Table>
        <TableHeader>
          <TableRow className="border-slate-700 hover:bg-slate-800/30">
            {columns.map((column) => (
              <TableHead key={String(column.key)} className="text-slate-300">
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-8 text-slate-400">
                No data available
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={row.id} className="border-slate-700 hover:bg-slate-800/30">
                {columns.map((column) => (
                  <TableCell key={String(column.key)} className="text-slate-300">
                    {column.render ? column.render(row[column.key], row) : String(row[column.key])}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
