'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { subDays } from 'date-fns'
import { PRODUCTION_STEPS, type ProductionStep, type ProductionFormData } from '@/lib/types'
import { serializeProduct } from '@/lib/utils'

export async function getWorkQueue(step?: ProductionStep) {
    try {
        const items = await prisma.jobOrderItem.findMany({
            where: step ? { currentStep: step } : undefined,
            include: {
                product: true,
                jobOrder: {
                    select: {
                        id: true,
                        jobNo: true,
                        customerName: true,
                        dueDate: true,
                        status: true,
                    },
                },
                productionLogs: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: {
                        stepName: true,
                        weight: true,
                        goodQty: true,
                    }
                }
            },
            orderBy: {
                jobOrder: {
                    dueDate: 'asc',
                },
            },
        })

        // Filter only active job orders (PENDING or IN_PROGRESS)
        const activeItems = items.filter(
            (item) => item.jobOrder.status === 'PENDING' || item.jobOrder.status === 'IN_PROGRESS'
        )

        const serializedItems = activeItems.map(item => {
            const lastLog = item.productionLogs[0]
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { productionLogs, ...itemWithoutLogs } = item
            return {
                ...itemWithoutLogs,
                product: serializeProduct(item.product),
                lastWeight: lastLog?.weight ? Number(lastLog.weight) : null,
                lastStep: lastLog?.stepName || null,
                lastGoodQty: lastLog?.goodQty || null,
            }
        })

        return { success: true, data: serializedItems }
    } catch (error) {
        console.error('Error fetching work queue:', error)
        return { success: false, error: 'ไม่สามารถดึงข้อมูลงานได้' }
    }
}

export async function getStepBalance(jobItemId: string, step: ProductionStep): Promise<number> {
    const stepInfo = PRODUCTION_STEPS.find((s) => s.key === step)
    const stepOrder = stepInfo?.order || 1

    let totalFromPrev: number

    if (stepOrder === 1) {
        // First step gets from job item qty
        const item = await prisma.jobOrderItem.findUnique({
            where: { id: jobItemId },
        })
        totalFromPrev = item?.qty || 0
    } else {
        // Sum good qty from previous step
        const prevStep = PRODUCTION_STEPS.find((s) => s.order === stepOrder - 1)?.key
        if (!prevStep) {
            totalFromPrev = 0
        } else {
            const logs = await prisma.productionLog.aggregate({
                where: { jobOrderItemId: jobItemId, stepName: prevStep },
                _sum: { goodQty: true },
            })
            totalFromPrev = logs._sum.goodQty || 0
        }
    }

    // Subtract already processed in this step
    const processed = await prisma.productionLog.aggregate({
        where: { jobOrderItemId: jobItemId, stepName: step },
        _sum: { goodQty: true, scrapQty: true, reworkQty: true },
    })
    const alreadyProcessed =
        (processed._sum.goodQty || 0) +
        (processed._sum.scrapQty || 0) +
        (processed._sum.reworkQty || 0)

    return Math.max(0, totalFromPrev - alreadyProcessed)
}

export async function recordProduction(data: ProductionFormData, workerId: string) {
    try {
        // Validate balance
        const balance = await getStepBalance(data.jobOrderItemId, data.stepName)
        const totalRecording = data.goodQty + data.scrapQty + data.reworkQty

        if (totalRecording > balance) {
            return { success: false, error: `จำนวนเกินกว่าที่มีอยู่ (เหลือ ${balance} ชิ้น)` }
        }

        // Create production log
        const log = await prisma.productionLog.create({
            data: {
                jobOrderItemId: data.jobOrderItemId,
                stepName: data.stepName,
                workerId,
                goodQty: data.goodQty,
                scrapQty: data.scrapQty,
                reworkQty: data.reworkQty,
                weight: data.weight,
                notes: data.notes,
            },
        })

        // Check if step is complete and move to next
        const newBalance = await getStepBalance(data.jobOrderItemId, data.stepName)
        if (newBalance === 0) {
            const currentStepInfo = PRODUCTION_STEPS.find((s) => s.key === data.stepName)
            if (currentStepInfo && currentStepInfo.order < 11) {
                const nextStep = PRODUCTION_STEPS.find((s) => s.order === currentStepInfo.order + 1)
                if (nextStep) {
                    await prisma.jobOrderItem.update({
                        where: { id: data.jobOrderItemId },
                        data: { currentStep: nextStep.key },
                    })

                    // Check if all items are finished to complete JobOrder
                    if (nextStep.key === 'FINISHED') {
                        const currentItem = await prisma.jobOrderItem.findUnique({
                            where: { id: data.jobOrderItemId },
                            select: { jobOrderId: true }
                        })

                        if (currentItem) {
                            const jobOrderItems = await prisma.jobOrderItem.findMany({
                                where: { jobOrderId: currentItem.jobOrderId },
                            })

                            const allFinished = jobOrderItems.every((i) => i.currentStep === 'FINISHED')

                            if (allFinished) {
                                await prisma.jobOrder.update({
                                    where: { id: currentItem.jobOrderId },
                                    data: { status: 'COMPLETED' },
                                })
                            }
                        }
                    }
                }
            }
        }

        // Update job order status to IN_PROGRESS if PENDING
        const item = await prisma.jobOrderItem.findUnique({
            where: { id: data.jobOrderItemId },
            include: { jobOrder: true },
        })
        if (item?.jobOrder.status === 'PENDING') {
            await prisma.jobOrder.update({
                where: { id: item.jobOrderId },
                data: { status: 'IN_PROGRESS' },
            })
        }

        revalidatePath('/production')
        revalidatePath('/history')
        revalidatePath('/dashboard')
        // Serialize Decimal fields before returning
        return {
            success: true,
            data: {
                ...log,
                weight: log.weight ? Number(log.weight) : null
            }
        }
    } catch (error) {
        console.error('Error recording production:', error)
        return { success: false, error: 'ไม่สามารถบันทึกการผลิตได้' }
    }
}

export async function getProductionLogs(options?: {
    jobOrderId?: string
    stepName?: ProductionStep
    workerId?: string
    startDate?: Date
    endDate?: Date
}) {
    try {
        const logs = await prisma.productionLog.findMany({
            where: {
                ...(options?.stepName && { stepName: options.stepName }),
                ...(options?.workerId && { workerId: options.workerId }),
                ...(options?.jobOrderId && {
                    jobOrderItem: { jobOrderId: options.jobOrderId },
                }),
                ...((options?.startDate || options?.endDate) && {
                    createdAt: {
                        ...(options?.startDate && { gte: options.startDate }),
                        ...(options?.endDate && { lte: options.endDate }),
                    },
                }),
            },
            include: {
                worker: {
                    select: {
                        id: true,
                        fullName: true,
                    },
                },
                jobOrderItem: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                skuCode: true,
                                name: true,
                                nameTh: true,
                            },
                        },
                        jobOrder: {
                            select: {
                                id: true,
                                jobNo: true,
                                customerName: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        })
        // Serialize Decimal fields to avoid "Decimal objects are not supported" error
        const serializedLogs = logs.map(log => ({
            ...log,
            weight: log.weight ? Number(log.weight) : null,
        }))

        return { success: true, data: serializedLogs }
    } catch (error) {
        console.error('Error fetching production logs:', error)
        return { success: false, error: 'ไม่สามารถดึงข้อมูลประวัติการผลิตได้' }
    }
}

export async function getDashboardStats() {
    try {
        const thirtyDaysAgo = subDays(new Date(), 30)

        const [activeOrders, goodOutput, scrapOutput, stepCounts] = await Promise.all([
            prisma.jobOrder.count({
                where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
            }),
            prisma.productionLog.aggregate({
                where: { createdAt: { gte: thirtyDaysAgo } },
                _sum: { goodQty: true },
            }),
            prisma.productionLog.aggregate({
                where: { createdAt: { gte: thirtyDaysAgo } },
                _sum: { scrapQty: true },
            }),
            prisma.jobOrderItem.groupBy({
                by: ['currentStep'],
                _count: true,
                where: {
                    jobOrder: {
                        status: { in: ['PENDING', 'IN_PROGRESS'] },
                    },
                },
            }),
        ])

        const totalGood = goodOutput._sum.goodQty || 0
        const totalScrap = scrapOutput._sum.scrapQty || 0
        const defectRate =
            totalGood + totalScrap > 0
                ? Number(((totalScrap / (totalGood + totalScrap)) * 100).toFixed(2))
                : 0

        return {
            success: true,
            data: {
                activeOrders,
                totalGoodOutput: totalGood,
                totalScrap,
                defectRate,
                stepCounts: stepCounts.map((s) => ({
                    step: s.currentStep as ProductionStep,
                    count: s._count,
                })),
            },
        }
    } catch (error) {
        console.error('Error fetching dashboard stats:', error)
        return { success: false, error: 'ไม่สามารถดึงข้อมูลสถิติได้' }
    }
}

export async function getRecentOrders(limit: number = 5) {
    try {
        const orders = await prisma.jobOrder.findMany({
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                skuCode: true,
                                nameTh: true,
                            },
                        },
                    },
                },
            },
        })
        return { success: true, data: orders }
    } catch (error) {
        console.error('Error fetching recent orders:', error)
        return { success: false, error: 'ไม่สามารถดึงข้อมูลออเดอร์ล่าสุดได้' }
    }
}
