
import { PrismaClient } from '@prisma/client'
import { getStepBalance } from '../actions/production.actions'

const prisma = new PrismaClient()

async function main() {
    try {
        const jobNo = 'JO-2601-004'
        console.log(`Inspecting Job: ${jobNo}`)

        const job = await prisma.jobOrder.findUnique({
            where: { jobNo },
            include: { items: true }
        })

        if (!job) {
            console.error('Job not found')
            return
        }

        console.log('Job ID:', job.id)
        console.log('Status:', job.status)

        const item = job.items[0] // Assuming single item for debug
        console.log('Item ID:', item.id)
        console.log('Current Step:', item.currentStep)
        console.log('Qty:', item.qty)

        // Check Balance for Packing
        const balance = await getStepBalance(item.id, 'PACKING')
        console.log('Calculated Balance for PACKING:', balance)

        // Check Logs
        const logs = await prisma.productionLog.findMany({
            where: { jobOrderItemId: item.id }
        })
        console.log('Production Logs:', logs.length)
        logs.forEach(l => {
            console.log(` - Step: ${l.stepName}, Good: ${l.goodQty}, CreatedAt: ${l.createdAt}`)
        })

    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
