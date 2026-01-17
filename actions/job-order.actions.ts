'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import type { JobOrderFormData, JobStatus, ProductionStep } from '@/lib/types'
import { PRODUCTION_STEPS } from '@/lib/types'
import { serializeProduct } from '@/lib/utils'

export async function generateJobNo(): Promise<string> {
    const currentYM = format(new Date(), 'yyMM')

    const sequence = await prisma.jobNoSequence.upsert({
        where: { yearMonth: currentYM },
        update: { lastSequence: { increment: 1 } },
        create: { yearMonth: currentYM, lastSequence: 1 },
    })

    return `JO-${currentYM}-${String(sequence.lastSequence).padStart(3, '0')}`
}

export async function getJobOrders(options?: { status?: JobStatus }) {
    try {
        const jobOrders = await prisma.jobOrder.findMany({
            where: options?.status ? { status: options.status } : undefined,
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        })

        const serializedJobOrders = jobOrders.map(order => ({
            ...order,
            items: order.items.map(item => ({
                ...item,
                product: serializeProduct(item.product)
            }))
        }))

        return { success: true, data: serializedJobOrders }
    } catch (error) {
        console.error('Error fetching job orders:', error)
        return { success: false, error: 'ไม่สามารถดึงข้อมูลใบสั่งผลิตได้' }
    }
}

export async function getJobOrder(id: string) {
    try {
        const jobOrder = await prisma.jobOrder.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        product: true,
                        productionLogs: {
                            include: {
                                worker: {
                                    select: {
                                        id: true,
                                        fullName: true,
                                    },
                                },
                            },
                            orderBy: { createdAt: 'desc' },
                        },
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                    },
                },
            },
        })
        if (!jobOrder) {
            return { success: false, error: 'ไม่พบใบสั่งผลิต' }
        }

        const serializedJobOrder = {
            ...jobOrder,
            items: jobOrder.items.map(item => ({
                ...item,
                product: serializeProduct(item.product)
            }))
        }

        return { success: true, data: serializedJobOrder }
    } catch (error) {
        console.error('Error fetching job order:', error)
        return { success: false, error: 'ไม่สามารถดึงข้อมูลใบสั่งผลิตได้' }
    }
}

export async function createJobOrder(data: JobOrderFormData, userId?: string) {
    try {
        const jobNo = await generateJobNo()

        const jobOrder = await prisma.jobOrder.create({
            data: {
                jobNo,
                customerName: data.customerName,
                customerPo: data.customerPo,
                dueDate: new Date(data.dueDate),
                notes: data.notes,
                createdById: userId,
                items: {
                    create: data.items.map((item) => ({
                        productId: item.productId,
                        qty: item.qty,
                        currentStep: 'WAX',
                    })),
                },
            },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
            },
        })

        const serializedJobOrder = {
            ...jobOrder,
            items: jobOrder.items.map(item => ({
                ...item,
                product: serializeProduct(item.product)
            }))
        }

        revalidatePath('/job-orders')
        revalidatePath('/dashboard')
        return { success: true, data: serializedJobOrder }
    } catch (error: any) {
        console.error('Error creating job order:', error)
        // Handle Foreign Key violation (User ID not found)
        if (error.code === 'P2003' && error?.meta?.modelName === 'JobOrder') {
            return { success: false, error: 'Session หมดอายุ กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่ (Invalid User ID)' }
        }
        return { success: false, error: `ไม่สามารถสร้างใบสั่งผลิตได้: ${error.message}` }
    }
}

export async function updateJobOrderStatus(id: string, status: JobStatus) {
    try {
        const jobOrder = await prisma.jobOrder.update({
            where: { id },
            data: { status },
        })

        // No product returned here, so no serialization needed directly on product
        // But if we ever include items, we would need it. 
        // Current implementation returns just jobOrder without items.

        revalidatePath('/job-orders')
        revalidatePath('/dashboard')
        revalidatePath('/production')
        return { success: true, data: jobOrder }
    } catch (error) {
        console.error('Error updating job order status:', error)
        return { success: false, error: 'ไม่สามารถอัพเดทสถานะได้' }
    }
}

export async function deleteJobOrder(id: string) {
    try {
        await prisma.jobOrder.delete({
            where: { id },
        })

        revalidatePath('/job-orders')
        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error deleting job order:', error)
        return { success: false, error: 'ไม่สามารถลบใบสั่งผลิตได้' }
    }
}

export interface StepProgress {
    step: ProductionStep
    stepLabel: string
    qty: number
    isCurrentStep: boolean
}

export interface ItemProgress {
    id: string
    productId: string
    product: {
        skuCode: string
        name: string
        nameTh: string | null
    }
    totalQty: number
    currentStep: ProductionStep
    finishedQty: number
    inProgressQty: number
    notStartedQty: number
    progressPercent: number
    stepProgress: StepProgress[]
}

export async function getJobOrderWithProgress(id: string) {
    try {
        const jobOrder = await prisma.jobOrder.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                skuCode: true,
                                name: true,
                                nameTh: true,
                            },
                        },
                        productionLogs: {
                            select: {
                                stepName: true,
                                goodQty: true,
                                scrapQty: true,
                                reworkQty: true,
                            },
                        },
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                    },
                },
            },
        })

        if (!jobOrder) {
            return { success: false, error: 'ไม่พบใบสั่งผลิต' }
        }

        // Calculate progress for each item
        const itemsWithProgress: ItemProgress[] = jobOrder.items.map((item) => {
            const logs = item.productionLogs
            const stepProgress: StepProgress[] = []

            // Calculate balance at each step
            for (const stepInfo of PRODUCTION_STEPS) {
                const stepOrder = stepInfo.order
                let totalFromPrev: number

                if (stepOrder === 1) {
                    // First step gets from item qty
                    totalFromPrev = item.qty
                } else {
                    // Sum good qty from previous step
                    const prevStep = PRODUCTION_STEPS.find((s) => s.order === stepOrder - 1)?.key
                    if (!prevStep) {
                        totalFromPrev = 0
                    } else {
                        totalFromPrev = logs
                            .filter((l) => l.stepName === prevStep)
                            .reduce((sum, l) => sum + l.goodQty, 0)
                    }
                }

                // Sum processed in this step
                const processedInStep = logs
                    .filter((l) => l.stepName === stepInfo.key)
                    .reduce((sum, l) => sum + l.goodQty + l.scrapQty + l.reworkQty, 0)

                const qtyAtStep = Math.max(0, totalFromPrev - processedInStep)

                stepProgress.push({
                    step: stepInfo.key,
                    stepLabel: stepInfo.labelTh,
                    qty: qtyAtStep,
                    isCurrentStep: item.currentStep === stepInfo.key,
                })
            }

            // Calculate finished qty (items that completed PACKING)
            const packingLogs = logs.filter((l) => l.stepName === 'PACKING')
            const finishedQty = packingLogs.reduce((sum, l) => sum + l.goodQty, 0)

            // Calculate in-progress qty (items that have started but not finished)
            const waxLogs = logs.filter((l) => l.stepName === 'WAX')
            const startedQty = waxLogs.reduce((sum, l) => sum + l.goodQty + l.scrapQty + l.reworkQty, 0)
            const inProgressQty = Math.max(0, startedQty - finishedQty)

            // Not started = never processed in WAX
            const notStartedQty = Math.max(0, item.qty - startedQty)

            // Progress percent
            const progressPercent = item.qty > 0 ? Math.round((finishedQty / item.qty) * 100) : 0

            return {
                id: item.id,
                productId: item.productId,
                product: item.product,
                totalQty: item.qty,
                currentStep: item.currentStep as ProductionStep,
                finishedQty,
                inProgressQty,
                notStartedQty,
                progressPercent,
                stepProgress,
            }
        })

        return {
            success: true,
            data: {
                ...jobOrder,
                itemsWithProgress,
            },
        }
    } catch (error) {
        console.error('Error fetching job order with progress:', error)
        return { success: false, error: 'ไม่สามารถดึงข้อมูลใบสั่งผลิตได้' }
    }
}
