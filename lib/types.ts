// Production Steps - 10 ขั้นตอนการผลิต
export type ProductionStep =
    | 'WAX'
    | 'CLEAN_WAX'
    | 'CASTING'
    | 'FILING'
    | 'MEDIA'
    | 'SET_STONE'
    | 'POLISHING'
    | 'PLATING'
    | 'FQC'
    | 'PACKING'
    | 'FINISHED'

export interface ProductionStepInfo {
    key: ProductionStep
    label: string
    labelTh: string
    order: number
}

export const PRODUCTION_STEPS: ProductionStepInfo[] = [
    { key: 'WAX', label: 'Wax', labelTh: 'ฉีดเทียน', order: 1 },
    { key: 'CLEAN_WAX', label: 'Clean Wax', labelTh: 'แต่งเทียน', order: 2 },
    { key: 'CASTING', label: 'Casting', labelTh: 'หล่อ', order: 3 },
    { key: 'FILING', label: 'Filing', labelTh: 'แต่งทราย', order: 4 },
    { key: 'MEDIA', label: 'Media', labelTh: 'ร่อนมีเดีย', order: 5 },
    { key: 'SET_STONE', label: 'Set Stone', labelTh: 'ฝัง', order: 6 },
    { key: 'POLISHING', label: 'Polishing', labelTh: 'ขัด', order: 7 },
    { key: 'PLATING', label: 'Plating', labelTh: 'ชุบ', order: 8 },
    { key: 'FQC', label: 'Final QC', labelTh: 'คิวซีงานสำเร็จ', order: 9 },
    { key: 'PACKING', label: 'Packing', labelTh: 'แพค', order: 10 },
    { key: 'FINISHED', label: 'Finished', labelTh: 'จบงาน', order: 11 },
]

// User Roles
export type UserRole = 'ADMIN' | 'OFFICE' | 'WORKER'

export const USER_ROLES: { key: UserRole; label: string; labelTh: string }[] = [
    { key: 'ADMIN', label: 'Admin', labelTh: 'ผู้ดูแลระบบ' },
    { key: 'OFFICE', label: 'Office', labelTh: 'สำนักงาน' },
    { key: 'WORKER', label: 'Worker', labelTh: 'พนักงานผลิต' },
]

// Job Status
export type JobStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export const JOB_STATUSES: { key: JobStatus; label: string; labelTh: string }[] = [
    { key: 'PENDING', label: 'Pending', labelTh: 'รอดำเนินการ' },
    { key: 'IN_PROGRESS', label: 'In Progress', labelTh: 'กำลังผลิต' },
    { key: 'COMPLETED', label: 'Completed', labelTh: 'เสร็จสิ้น' },
    { key: 'CANCELLED', label: 'Cancelled', labelTh: 'ยกเลิก' },
]

// Helper functions
export function getStepOrder(step: ProductionStep): number {
    return PRODUCTION_STEPS.find((s) => s.key === step)?.order || 1
}

export function getStepByOrder(order: number): ProductionStep | null {
    return PRODUCTION_STEPS.find((s) => s.order === order)?.key || null
}

export function getNextStep(currentStep: ProductionStep): ProductionStep | null {
    const currentOrder = getStepOrder(currentStep)
    if (currentOrder >= 10) return null
    return getStepByOrder(currentOrder + 1)
}

export function getStepLabel(step: ProductionStep, lang: 'en' | 'th' = 'th'): string {
    const stepInfo = PRODUCTION_STEPS.find((s) => s.key === step)
    return lang === 'th' ? stepInfo?.labelTh || step : stepInfo?.label || step
}

export function getStatusLabel(status: JobStatus, lang: 'en' | 'th' = 'th'): string {
    const statusInfo = JOB_STATUSES.find((s) => s.key === status)
    return lang === 'th' ? statusInfo?.labelTh || status : statusInfo?.label || status
}

export function getRoleLabel(role: UserRole, lang: 'en' | 'th' = 'th'): string {
    const roleInfo = USER_ROLES.find((r) => r.key === role)
    return lang === 'th' ? roleInfo?.labelTh || role : roleInfo?.label || role
}

// Type definitions for database models
export interface User {
    id: string
    email: string | null
    username: string | null
    password: string
    fullName: string | null
    role: UserRole
    department: ProductionStep | null
    avatarUrl: string | null
    createdAt: Date
    updatedAt: Date
}

export interface Product {
    id: string
    skuCode: string
    name: string
    nameTh: string | null
    description: string | null
    imageUrl: string | null
    weightGrams: number | null
    priceFinished: number | null
    steps: ProductionStep[]
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

export interface JobOrder {
    id: string
    jobNo: string
    customerName: string
    customerPo: string | null
    dueDate: Date
    status: JobStatus
    notes: string | null
    createdById: string | null
    createdAt: Date
    updatedAt: Date
    items?: JobOrderItem[]
    createdBy?: User
}

export interface JobOrderItem {
    id: string
    jobOrderId: string
    productId: string
    qty: number
    currentStep: ProductionStep
    createdAt: Date
    product?: Product
    jobOrder?: JobOrder
    productionLogs?: ProductionLog[]
}

export interface ProductionLog {
    id: string
    jobOrderItemId: string
    stepName: ProductionStep
    workerId: string
    goodQty: number
    scrapQty: number
    reworkQty: number
    weight: number | null
    notes: string | null
    createdAt: Date
    worker?: User
    jobOrderItem?: JobOrderItem
}

// Form types
export interface ProductFormData {
    skuCode: string
    name: string
    nameTh?: string
    description?: string
    imageUrl?: string
    weightGrams?: number
    priceFinished?: number
    steps: ProductionStep[]
    isActive: boolean
}

export interface JobOrderFormData {
    customerName: string
    customerPo?: string
    dueDate: string
    notes?: string
    items: {
        productId: string
        qty: number
    }[]
}

export interface ProductionFormData {
    jobOrderItemId: string
    stepName: ProductionStep
    goodQty: number
    scrapQty: number
    reworkQty: number
    reworkToStep?: ProductionStep // Step ที่จะส่ง rework กลับไป
    weight?: number
    notes?: string
}

export interface UserFormData {
    email?: string
    username?: string
    password?: string
    fullName?: string
    role: UserRole
    department?: ProductionStep
}
