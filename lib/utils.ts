import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import type { ProductionStep, JobStatus } from './types'

// Tailwind class name utility
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

// Date formatting
export function formatDate(date: Date | string, formatStr: string = 'dd/MM/yyyy'): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return format(d, formatStr, { locale: th })
}

export function formatDateTime(date: Date | string): string {
    return formatDate(date, 'dd/MM/yyyy HH:mm')
}

// Number formatting
export function formatNumber(num: number): string {
    return new Intl.NumberFormat('th-TH').format(num)
}

export function formatCurrency(num: number): string {
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 2,
    }).format(num)
}

export function formatPercent(num: number): string {
    return new Intl.NumberFormat('th-TH', {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(num / 100)
}

// Color utilities
export function getStepColor(step: ProductionStep): string {
    const colors: Record<ProductionStep, string> = {
        WAX: 'bg-amber-500',
        CLEAN_WAX: 'bg-yellow-500',
        CASTING: 'bg-orange-500',
        FILING: 'bg-lime-500',
        MEDIA: 'bg-green-500',
        SET_STONE: 'bg-teal-500',
        POLISHING: 'bg-cyan-500',
        PLATING: 'bg-blue-500',
        FQC: 'bg-indigo-500',
        PACKING: 'bg-purple-500',
        FINISHED: 'bg-emerald-500',
    }
    return colors[step] || 'bg-gray-500'
}

export function getStepTextColor(step: ProductionStep): string {
    const colors: Record<ProductionStep, string> = {
        WAX: 'text-amber-500',
        CLEAN_WAX: 'text-yellow-500',
        CASTING: 'text-orange-500',
        FILING: 'text-lime-500',
        MEDIA: 'text-green-500',
        SET_STONE: 'text-teal-500',
        POLISHING: 'text-cyan-500',
        PLATING: 'text-blue-500',
        FQC: 'text-indigo-500',
        PACKING: 'text-purple-500',
        FINISHED: 'text-emerald-500',
    }
    return colors[step] || 'text-gray-500'
}

export function getStepBorderColor(step: ProductionStep): string {
    const colors: Record<ProductionStep, string> = {
        WAX: 'border-amber-500',
        CLEAN_WAX: 'border-yellow-500',
        CASTING: 'border-orange-500',
        FILING: 'border-lime-500',
        MEDIA: 'border-green-500',
        SET_STONE: 'border-teal-500',
        POLISHING: 'border-cyan-500',
        PLATING: 'border-blue-500',
        FQC: 'border-indigo-500',
        PACKING: 'border-purple-500',
        FINISHED: 'border-emerald-500',
    }
    return colors[step] || 'border-gray-500'
}

export function getStatusColor(status: JobStatus): string {
    const colors: Record<JobStatus, string> = {
        PENDING: 'bg-amber-100 text-amber-800',
        IN_PROGRESS: 'bg-blue-100 text-blue-800',
        COMPLETED: 'bg-emerald-100 text-emerald-800',
        CANCELLED: 'bg-rose-100 text-rose-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
}

// Validation
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

// Error handling
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message
    if (typeof error === 'string') return error
    return 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
}

// Generate ID
export function generateId(): string {
    return crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15)
}

// Serialization
export function serializeProduct(product: any) {
    if (!product) return null
    return {
        ...product,
        weightGrams: product.weightGrams ? Number(product.weightGrams) : 0,
        priceFinished: product.priceFinished ? Number(product.priceFinished) : 0,
    }
}
