'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import type { JobOrderFormData, JobStatus } from '@/lib/types'
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
