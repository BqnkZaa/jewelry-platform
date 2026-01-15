
import { PrismaClient } from '@prisma/client'
import { getStepBalance } from '../actions/production.actions'

const prisma = new PrismaClient()

async function main() {
    try {
        console.log('Fixing stuck Packing jobs...')

        // Find items stuck in PACKING
        const stuckItems = await prisma.jobOrderItem.findMany({
            where: { currentStep: 'PACKING' },
            include: { jobOrder: true }
        })

        console.log(`Found ${stuckItems.length} items in PACKING`)

        for (const item of stuckItems) {
            console.log(`Checking item: ${item.id} (Job: ${item.jobOrder.jobNo})`)
            const balance = await getStepBalance(item.id, 'PACKING')
            console.log(` - Balance: ${balance}`)

            if (balance === 0) {
                console.log(' -> Balance is 0, moving to FINISHED')
                await prisma.jobOrderItem.update({
                    where: { id: item.id },
                    data: { currentStep: 'FINISHED' }
                })
                console.log(' -> Moved to FINISHED')

                // Check if JobOrder is complete
                const siblingItems = await prisma.jobOrderItem.findMany({
                    where: { jobOrderId: item.jobOrderId }
                })
                const allFinished = siblingItems.every(i => i.currentStep === 'FINISHED')
                if (allFinished) {
                    await prisma.jobOrder.update({
                        where: { id: item.jobOrderId },
                        data: { status: 'COMPLETED' }
                    })
                    console.log(' -> JobOrder marked COMPLETED')
                }
            }
        }
        console.log('Fix complete')

    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
