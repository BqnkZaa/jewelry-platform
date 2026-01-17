'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { subDays, format, startOfDay } from 'date-fns'
import { PRODUCTION_STEPS, type ProductionStep, type ProductionFormData } from '@/lib/types'
import { serializeProduct } from '@/lib/utils'

export async function getWorkQueue(step?: ProductionStep) {
    try {
        // Get items at the current step
        const itemsAtStep = await prisma.jobOrderItem.findMany({
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

        // Also find items that have pending rework at this step
        let itemsWithRework: typeof itemsAtStep = []
        if (step) {
            // Find distinct job order items that have rework pointing to this step
            const reworkLogs = await prisma.productionLog.findMany({
                where: { reworkToStep: step },
                select: { jobOrderItemId: true },
                distinct: ['jobOrderItemId'],
            })

            const reworkItemIds = reworkLogs.map(log => log.jobOrderItemId)
            const existingIds = new Set(itemsAtStep.map(item => item.id))
            const newReworkIds = reworkItemIds.filter(id => !existingIds.has(id))

            if (newReworkIds.length > 0) {
                itemsWithRework = await prisma.jobOrderItem.findMany({
                    where: { id: { in: newReworkIds } },
                    include: {
                        product: true,
                        jobOrder: {
                            select: {
                                id: true,
                                jobNo: true,
                                customerName: true,
                                customerPo: true,
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
            }
        }

        // Merge items
        const allItems = [...itemsAtStep, ...itemsWithRework]

        // Filter only active job orders (PENDING or IN_PROGRESS)
        const activeItems = allItems.filter(
            (item) => item.jobOrder.status === 'PENDING' || item.jobOrder.status === 'IN_PROGRESS'
        )

        // Bulk fetch logs for balance calculation
        const itemIds = activeItems.map(item => item.id)

        // 1. Get initial quantities (for first step calculation)
        // (We already have this from activeItems.qty)

        // 2. Get production logs for ALL relevant items in ONE query
        const allLogs = await prisma.productionLog.findMany({
            where: {
                jobOrderItemId: { in: itemIds }
            },
            select: {
                jobOrderItemId: true,
                stepName: true,
                goodQty: true,
                scrapQty: true,
                reworkQty: true,
                reworkToStep: true
            }
        })

        // Helper to calculate balance in-memory
        const calculateBalance = (itemId: string, targetStep: ProductionStep) => {
            const stepInfo = PRODUCTION_STEPS.find((s) => s.key === targetStep)
            const stepOrder = stepInfo?.order || 1
            const itemLogs = allLogs.filter(log => log.jobOrderItemId === itemId)
            const item = activeItems.find(i => i.id === itemId)

            let totalFromPrev = 0

            if (stepOrder === 1) {
                // First step: get from job item qty
                totalFromPrev = item?.qty || 0
            } else {
                // Other steps: sum good qty from previous step
                const prevStepKey = PRODUCTION_STEPS.find((s) => s.order === stepOrder - 1)?.key
                if (prevStepKey) {
                    const prevStepLogs = itemLogs.filter(log => log.stepName === prevStepKey)
                    totalFromPrev = prevStepLogs.reduce((sum, log) => sum + log.goodQty, 0)
                }
            }

            // Add rework coming INTO this step
            const reworkIncomingLogs = itemLogs.filter(log => log.reworkToStep === targetStep)
            const totalReworkIncoming = reworkIncomingLogs.reduce((sum, log) => sum + log.reworkQty, 0)

            totalFromPrev += totalReworkIncoming

            // Subtract processed in THIS step
            const currentStepLogs = itemLogs.filter(log => log.stepName === targetStep)
            const totalProcessed = currentStepLogs.reduce((sum, log) =>
                sum + log.goodQty + log.scrapQty + log.reworkQty, 0
            )

            return Math.max(0, totalFromPrev - totalProcessed)
        }

        const itemsWithBalance = []
        for (const item of activeItems) {
            let balance = item.qty
            if (step) {
                balance = calculateBalance(item.id, step)
                if (balance > 0) {
                    itemsWithBalance.push({ item, balance })
                }
            } else {
                itemsWithBalance.push({ item, balance: item.qty })
            }
        }

        const serializedItems = itemsWithBalance.map(({ item, balance }) => {
            const lastLog = item.productionLogs[0]
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { productionLogs, ...itemWithoutLogs } = item
            return {
                ...itemWithoutLogs,
                product: serializeProduct(item.product),
                lastWeight: lastLog?.weight ? Number(lastLog.weight) : null,
                lastStep: lastLog?.stepName || null,
                lastGoodQty: balance, // Use calculated balance instead of lastGoodQty
            }
        })

        return { success: true, data: serializedItems }
    } catch (error) {
        console.error('Error fetching work queue:', error)
        return { success: false, error: 'ไม่สามารถดึงข้อมูลงานได้' }
    }
}

// Keep single item function for other usages (like recordProduction validation)
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

    // Add rework items that were sent to this step
    const reworkIncoming = await prisma.productionLog.aggregate({
        where: {
            jobOrderItemId: jobItemId,
            reworkToStep: step  // นับ rework ที่ส่งมาที่ step นี้
        },
        _sum: { reworkQty: true },
    })
    totalFromPrev += (reworkIncoming._sum.reworkQty || 0)

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

        // Validate reworkToStep if reworkQty > 0
        if (data.reworkQty > 0) {
            if (!data.reworkToStep) {
                return { success: false, error: 'กรุณาเลือก step ที่จะส่ง rework กลับไป' }
            }
            const currentStepOrder = PRODUCTION_STEPS.find(s => s.key === data.stepName)?.order || 0
            const reworkStepOrder = PRODUCTION_STEPS.find(s => s.key === data.reworkToStep)?.order || 0
            if (reworkStepOrder >= currentStepOrder) {
                return { success: false, error: 'Rework ต้องส่งกลับไป step ก่อนหน้าเท่านั้น' }
            }
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
                reworkToStep: data.reworkQty > 0 ? data.reworkToStep : null,
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
        const sevenDaysAgo = subDays(new Date(), 7)
        const todayStart = startOfDay(new Date())

        const [
            activeOrders,
            goodOutput,
            scrapOutput,
            stepCounts,
            totalItemsInProduction,
            finishedItemsToday,
            dailyProduction
        ] = await Promise.all([
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
            // Total qty of items in active job orders
            prisma.jobOrderItem.aggregate({
                where: {
                    jobOrder: {
                        status: { in: ['PENDING', 'IN_PROGRESS'] },
                    },
                },
                _sum: { qty: true },
            }),
            // Items finished today (PACKING step completed today)
            prisma.productionLog.aggregate({
                where: {
                    stepName: 'PACKING',
                    createdAt: { gte: todayStart },
                },
                _sum: { goodQty: true },
            }),
            // Daily production for last 7 days
            prisma.productionLog.findMany({
                where: {
                    stepName: 'PACKING',
                    createdAt: { gte: sevenDaysAgo },
                },
                select: {
                    createdAt: true,
                    goodQty: true,
                },
            }),
        ])

        // Calculate finished items from PACKING logs for active orders
        const packingLogsForActive = await prisma.productionLog.aggregate({
            where: {
                stepName: 'PACKING',
                jobOrderItem: {
                    jobOrder: {
                        status: { in: ['PENDING', 'IN_PROGRESS'] },
                    },
                },
            },
            _sum: { goodQty: true },
        })

        const totalGood = goodOutput._sum.goodQty || 0
        const totalScrap = scrapOutput._sum.scrapQty || 0
        const defectRate =
            totalGood + totalScrap > 0
                ? Number(((totalScrap / (totalGood + totalScrap)) * 100).toFixed(2))
                : 0

        // Process daily production data
        const dailyProductionMap = new Map<string, number>()
        for (let i = 6; i >= 0; i--) {
            const date = format(subDays(new Date(), i), 'yyyy-MM-dd')
            dailyProductionMap.set(date, 0)
        }
        dailyProduction.forEach((log) => {
            const date = format(log.createdAt, 'yyyy-MM-dd')
            if (dailyProductionMap.has(date)) {
                dailyProductionMap.set(date, (dailyProductionMap.get(date) || 0) + log.goodQty)
            }
        })
        const dailyProductionData = Array.from(dailyProductionMap.entries()).map(([date, qty]) => ({
            date,
            label: format(new Date(date), 'dd/MM'),
            qty,
        }))

        // Calculate totals
        const totalItemsQty = totalItemsInProduction._sum.qty || 0
        const finishedInActiveOrders = packingLogsForActive._sum.goodQty || 0
        const remainingToComplete = Math.max(0, totalItemsQty - finishedInActiveOrders)

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
                // New stats
                totalItemsInProduction: totalItemsQty,
                finishedInActiveOrders,
                remainingToComplete,
                finishedToday: finishedItemsToday._sum.goodQty || 0,
                dailyProductionData,
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
