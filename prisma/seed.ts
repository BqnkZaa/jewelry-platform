import { PrismaClient, ProductionStep } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Department users data - 1 user per production step
const DEPARTMENT_USERS: {
    username: string
    fullName: string
    department: ProductionStep
}[] = [
        { username: 'wax', fullName: 'พนักงานฉีดเทียน', department: 'WAX' },
        { username: 'cleanwax', fullName: 'พนักงานแต่งเทียน', department: 'CLEAN_WAX' },
        { username: 'casting', fullName: 'พนักงานหล่อ', department: 'CASTING' },
        { username: 'filing', fullName: 'พนักงานแต่งทราย', department: 'FILING' },
        { username: 'media', fullName: 'พนักงานร่อนมีเดีย', department: 'MEDIA' },
        { username: 'setstone', fullName: 'พนักงานฝัง', department: 'SET_STONE' },
        { username: 'polishing', fullName: 'พนักงานขัด', department: 'POLISHING' },
        { username: 'plating', fullName: 'พนักงานชุบ', department: 'PLATING' },
        { username: 'fqc', fullName: 'พนักงานคิวซี', department: 'FQC' },
        { username: 'packing', fullName: 'พนักงานแพค', department: 'PACKING' },
    ]

async function main() {
    console.log('🌱 Seeding database...')

    const defaultPassword = await bcrypt.hash('password123', 10)

    // Create admin user
    const admin = await prisma.user.upsert({
        where: { email: 'admin@jewelry.com' },
        update: {},
        create: {
            email: 'admin@jewelry.com',
            username: 'admin',
            password: defaultPassword,
            fullName: 'ผู้ดูแลระบบ',
            role: 'ADMIN',
        },
    })
    console.log('✅ Created admin user:', admin.email)

    // Create office user
    const office = await prisma.user.upsert({
        where: { username: 'office' },
        update: {},
        create: {
            username: 'office',
            password: defaultPassword,
            fullName: 'เจ้าหน้าที่สำนักงาน',
            role: 'OFFICE',
        },
    })
    console.log('✅ Created office user:', office.username)

    // Create worker users for each department
    console.log('\n📋 Creating department workers...')
    for (const user of DEPARTMENT_USERS) {
        const worker = await prisma.user.upsert({
            where: { username: user.username },
            update: {},
            create: {
                username: user.username,
                password: defaultPassword,
                fullName: user.fullName,
                role: 'WORKER',
                department: user.department,
            },
        })
        console.log(`  ✅ Created worker: ${worker.username} (${user.fullName})`)
    }
    console.log('')

    // Create sample products
    const products = [
        { skuCode: 'RG-001', name: 'Diamond Ring', nameTh: 'แหวนเพชร', weightGrams: 5.5, priceFinished: 15000 },
        { skuCode: 'NL-001', name: 'Gold Necklace', nameTh: 'สร้อยคอทอง', weightGrams: 12.0, priceFinished: 28000 },
        { skuCode: 'BR-001', name: 'Silver Bracelet', nameTh: 'กำไลเงิน', weightGrams: 8.0, priceFinished: 5000 },
        { skuCode: 'ER-001', name: 'Pearl Earrings', nameTh: 'ต่างหูมุก', weightGrams: 2.5, priceFinished: 8000 },
    ]

    for (const p of products) {
        await prisma.product.upsert({
            where: { skuCode: p.skuCode },
            update: {},
            create: {
                skuCode: p.skuCode,
                name: p.name,
                nameTh: p.nameTh,
                weightGrams: p.weightGrams,
                priceFinished: p.priceFinished,
                isActive: true,
            },
        })
        console.log('✅ Created product:', p.skuCode)
    }

    console.log('🎉 Seeding completed!')
}

main()
    .catch((e) => { console.error(e); process.exit(1) })
    .finally(async () => { await prisma.$disconnect() })
