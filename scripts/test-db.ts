
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        console.log('Testing DB Connectivity...');
        const now = await prisma.$queryRaw`SELECT NOW()`
        console.log('DB Time:', now)
        const userCount = await prisma.user.count();
        console.log('User Count:', userCount);
        console.log('Connectivity OK');
    } catch (e: any) {
        console.error('Connection Failed:', e.message);
        if (e.code) console.error('Code:', e.code);
    } finally {
        await prisma.$disconnect();
    }
}

main();
