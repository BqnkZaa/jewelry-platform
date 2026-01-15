import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
    title: string
    value: string | number
    icon: LucideIcon
    trend?: {
        value: number
        isPositive: boolean
    }
    color?: 'indigo' | 'emerald' | 'amber' | 'rose'
    className?: string
}

export function StatsCard({
    title,
    value,
    icon: Icon,
    trend,
    color = 'indigo',
    className,
}: StatsCardProps) {
    const colors = {
        indigo: {
            bg: 'bg-indigo-50 dark:bg-indigo-900/20',
            icon: 'text-indigo-600 dark:text-indigo-400',
            gradient: 'from-indigo-500 to-purple-600',
        },
        emerald: {
            bg: 'bg-emerald-50 dark:bg-emerald-900/20',
            icon: 'text-emerald-600 dark:text-emerald-400',
            gradient: 'from-emerald-500 to-teal-600',
        },
        amber: {
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            icon: 'text-amber-600 dark:text-amber-400',
            gradient: 'from-amber-500 to-orange-600',
        },
        rose: {
            bg: 'bg-rose-50 dark:bg-rose-900/20',
            icon: 'text-rose-600 dark:text-rose-400',
            gradient: 'from-rose-500 to-pink-600',
        },
    }

    const colorStyles = colors[color]

    return (
        <div
            className={cn(
                'relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6',
                'animate-slideUp',
                className
            )}
        >
            {/* Gradient decoration */}
            <div
                className={cn(
                    'absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-10 blur-2xl',
                    `bg-gradient-to-br ${colorStyles.gradient}`
                )}
            />

            <div className="relative flex items-start justify-between">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">
                        {title}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {typeof value === 'number' ? value.toLocaleString('th-TH') : value}
                    </p>
                    {trend && (
                        <div className="flex items-center gap-1 mt-2">
                            <span
                                className={cn(
                                    'text-sm font-medium',
                                    trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
                                )}
                            >
                                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                            </span>
                            <span className="text-xs text-gray-400">จากเดือนก่อน</span>
                        </div>
                    )}
                </div>

                <div className={cn('p-3 rounded-xl', colorStyles.bg)}>
                    <Icon className={cn('w-6 h-6', colorStyles.icon)} />
                </div>
            </div>
        </div>
    )
}
