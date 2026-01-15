import { cn } from '@/lib/utils'
import { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes, forwardRef } from 'react'

const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
    ({ className, ...props }, ref) => {
        return (
            <div className="w-full overflow-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <table
                    ref={ref}
                    className={cn('w-full caption-bottom text-sm', className)}
                    {...props}
                />
            </div>
        )
    }
)
Table.displayName = 'Table'

const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
    ({ className, ...props }, ref) => {
        return (
            <thead
                ref={ref}
                className={cn('bg-gray-50 dark:bg-gray-800 [&_tr]:border-b', className)}
                {...props}
            />
        )
    }
)
TableHeader.displayName = 'TableHeader'

const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
    ({ className, ...props }, ref) => {
        return (
            <tbody
                ref={ref}
                className={cn('[&_tr:last-child]:border-0', className)}
                {...props}
            />
        )
    }
)
TableBody.displayName = 'TableBody'

const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
    ({ className, ...props }, ref) => {
        return (
            <tr
                ref={ref}
                className={cn(
                    'border-b border-gray-100 dark:border-gray-700 transition-colors',
                    'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                    'data-[state=selected]:bg-indigo-50 dark:data-[state=selected]:bg-indigo-900/20',
                    className
                )}
                {...props}
            />
        )
    }
)
TableRow.displayName = 'TableRow'

const TableHead = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
    ({ className, ...props }, ref) => {
        return (
            <th
                ref={ref}
                className={cn(
                    'h-12 px-4 text-left align-middle font-semibold text-gray-600 dark:text-gray-300',
                    '[&:has([role=checkbox])]:pr-0',
                    className
                )}
                {...props}
            />
        )
    }
)
TableHead.displayName = 'TableHead'

const TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
    ({ className, ...props }, ref) => {
        return (
            <td
                ref={ref}
                className={cn(
                    'p-4 align-middle text-gray-700 dark:text-gray-300',
                    '[&:has([role=checkbox])]:pr-0',
                    className
                )}
                {...props}
            />
        )
    }
)
TableCell.displayName = 'TableCell'

const TableCaption = forwardRef<HTMLTableCaptionElement, HTMLAttributes<HTMLTableCaptionElement>>(
    ({ className, ...props }, ref) => {
        return (
            <caption
                ref={ref}
                className={cn('mt-4 text-sm text-gray-500 dark:text-gray-400', className)}
                {...props}
            />
        )
    }
)
TableCaption.displayName = 'TableCaption'

// Empty state component
interface TableEmptyProps extends HTMLAttributes<HTMLDivElement> {
    message?: string
    icon?: React.ReactNode
}

const TableEmpty = forwardRef<HTMLDivElement, TableEmptyProps>(
    ({ className, message = 'ไม่มีข้อมูล', icon, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn('flex flex-col items-center justify-center py-12 text-gray-400', className)}
                {...props}
            >
                {icon}
                <p className="mt-2 text-sm">{message}</p>
            </div>
        )
    }
)
TableEmpty.displayName = 'TableEmpty'

export {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableCaption,
    TableEmpty,
}
