
import { PrismaClient } from '@prisma/client'
import { PRODUCTION_STEPS } from '../lib/types'

const prisma = new PrismaClient()

// Helper to get step order
const getStepOrder = (stepKey: string) => {
    return PRODUCTION_STEPS.find(s => s.key === stepKey)?.order || 0
}

interface ItemBalance {
    itemId: string
    balance: number
    jobOrderId: string
}

async function main() {
    try {
        console.log('Fixing stuck Packing jobs (Optimized)...')
        const startTime = Date.now()

        // 1. Find items stuck in PACKING
        // We select enough fields to do the logic
        const stuckItems = await prisma.jobOrderItem.findMany({
            where: { currentStep: 'PACKING' },
            select: {
                id: true,
                qty: true,
                jobOrderId: true,
                jobOrder: {
                    select: { jobNo: true }
                }
            }
        })

        if (stuckItems.length === 0) {
            console.log('No items found in PACKING.')
            return
        }

        console.log(`Found ${stuckItems.length} items in PACKING. Fetching logs...`)

        const itemIds = stuckItems.map(i => i.id)

        // 2. Bulk fetch logs for all these items
        // We need logs to calculate balance: 
        // - Good qty from previous step (POLISHING) -> but if it's not first step, we need to trace back. 
        //   Actually, simpler logic from `getStepBalance`:
        //   TotalFromPrev = (StepOrder == 1 ? ItemQty : Sum(GoodQty of PrevStep)) + Sum(ReworkIncoming)
        //   Processed = Sum(Good + Scrap + Rework) of CurrentStep
        //
        // PACKING is usually the last step. Let's look at PRODUCTION_STEPS in lib/types if possible, 
        // but for now we assume standard flow.
        // Wait, strictly following `getStepBalance` logic is safer.
        // We need logs for:
        // - PrevStep (activeItems's prev step)
        // - CurrentStep (PACKING)
        // - ReworkToStep = PACKING

        // Let's find what is the previous step for PACKING.
        const packingOrder = getStepOrder('PACKING')
        const prevStepKey = PRODUCTION_STEPS.find(s => s.order === packingOrder - 1)?.key

        // We fetch ALL production logs for these items to be safe and strictly calculate in memory
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

        console.log(`Fetched ${allLogs.length} logs. Calculating balances...`)

        const itemsToFinish: string[] = []
        const affectedJobOrderIds = new Set<string>()

        for (const item of stuckItems) {
            const itemLogs = allLogs.filter(log => log.jobOrderItemId === item.id)

            // --- Logic from getStepBalance ---
            let totalFromPrev = 0

            if (packingOrder === 1) {
                totalFromPrev = item.qty
            } else {
                if (prevStepKey) {
                    const prevLogs = itemLogs.filter(l => l.stepName === prevStepKey)
                    totalFromPrev = prevLogs.reduce((sum, l) => sum + l.goodQty, 0)
                } else {
                    totalFromPrev = 0
                }
            }

            // Add rework incoming
            const reworkIncoming = itemLogs.filter(l => l.reworkToStep === 'PACKING')
            totalFromPrev += reworkIncoming.reduce((sum, l) => sum + l.reworkQty, 0)

            // Subtract processed
            const processedLogs = itemLogs.filter(l => l.stepName === 'PACKING')
            const totalProcessed = processedLogs.reduce((sum, l) =>
                sum + l.goodQty + l.scrapQty + l.reworkQty, 0
            )

            const balance = Math.max(0, totalFromPrev - totalProcessed)
            // ----------------------------------

            if (balance === 0) {
                // console.log(` -> Item ${item.id} (Job: ${item.jobOrder.jobNo}) has 0 balance. Marking FINISHED.`)
                itemsToFinish.push(item.id)
                affectedJobOrderIds.add(item.jobOrderId)
            }
        }

        console.log(`Identified ${itemsToFinish.length} items to move to FINISHED.`)

        if (itemsToFinish.length > 0) {
            // 3. Batch Update Items
            await prisma.jobOrderItem.updateMany({
                where: { id: { in: itemsToFinish } },
                data: { currentStep: 'FINISHED' }
            })
            console.log('Updated items to FINISHED.')

            // 4. Check JobOrders
            console.log(`Checking ${affectedJobOrderIds.size} JobOrders for completion...`)

            // We need to check if *all* items in these job orders are now FINISHED.
            // CAUTION: We only updated some items. There might be other items in these job orders 
            // that were NOT in PACKING (e.g., they were already FINISHED, or stuck in previous steps).
            // So we must fetch ALL items for these job orders to verify.

            const jobOrderIdsArray = Array.from(affectedJobOrderIds)
            const allItemsInJobs = await prisma.jobOrderItem.findMany({
                where: { jobOrderId: { in: jobOrderIdsArray } },
                select: { jobOrderId: true, currentStep: true }
            })

            const completedJobOrderIds: string[] = []

            for (const jobId of jobOrderIdsArray) {
                const itemsRequestingJob = allItemsInJobs.filter(i => i.jobOrderId === jobId)
                const allFinished = itemsRequestingJob.every(i => i.currentStep === 'FINISHED')

                if (allFinished) {
                    completedJobOrderIds.push(jobId)
                }
            }

            if (completedJobOrderIds.length > 0) {
                console.log(`Marking ${completedJobOrderIds.length} JobOrders as COMPLETED...`)
                await prisma.jobOrder.updateMany({
                    where: { id: { in: completedJobOrderIds } },
                    data: { status: 'COMPLETED' }
                })
            }
        }

        const duration = (Date.now() - startTime) / 1000
        console.log(`Fix complete in ${duration.toFixed(2)}s`)

    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
