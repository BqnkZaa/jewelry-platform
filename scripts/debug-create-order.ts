
import prisma from '../lib/prisma'
import { generateJobNo } from '../actions/job-order.actions'

async function main() {
    try {
        console.log('--- START DEBUG ---');

        // Check User
        const user = await prisma.user.findFirst();
        console.log('User found:', user ? user.email : 'NONE');

        // Check Product
        const product = await prisma.product.findFirst();
        console.log('Product found:', product ? product.skuCode : 'NONE');

        if (!product || !user) {
            console.error('Missing prerequisites (User or Product)');
            // Ensure we have a user to create order with, if missing
            if (!user) {
                await prisma.user.create({
                    data: {
                        email: 'debug@test.com',
                        username: 'debug',
                        password: 'password',
                        role: 'ADMIN',
                        fullName: 'Debug User'
                    }
                });
            }
            if (!product) {
                await prisma.product.create({
                    data: {
                        skuCode: 'DEBUG-001',
                        name: 'Debug Product',
                        isActive: true
                    }
                });
            }
        }

        // Check Sequence
        const currentYM = '2601' // JAN 2026? Wait, date-fns 'yyMM' for 2026 is 2601.
        const seq = await prisma.jobNoSequence.findUnique({ where: { yearMonth: currentYM } });
        console.log('Current Sequence for', currentYM, ':', seq);

        // Try Generate Job No
        const jobNo = await generateJobNo();
        console.log('Generated JobNo:', jobNo);

        // Check if it already exists
        const existing = await prisma.jobOrder.findUnique({ where: { jobNo } });
        console.log('Does JobNo exist?:', existing ? 'YES' : 'NO');

        // Try Create
        console.log('Attempting to create JobOrder...');
        const order = await prisma.jobOrder.create({
            data: {
                jobNo: existing ? jobNo + '-FIX' : jobNo,
                customerName: 'Debug Customer',
                dueDate: new Date(),
                createdById: user?.id,
                items: {
                    create: [
                        {
                            productId: product!.id,
                            qty: 5,
                            currentStep: 'WAX'
                        }
                    ]
                }
            }
        });
        console.log('SUCCESS: Created Order', order.id);

    } catch (error: any) {
        console.error('!!! ERROR !!!');
        console.error('Code:', error.code);
        console.error('Message:', error.message);
        if (error.meta) console.error('Meta:', error.meta);
    }
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect())
