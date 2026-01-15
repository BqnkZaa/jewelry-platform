# Prompt: สร้างระบบติดตามการผลิตเครื่องประดับ (Jewelry Production Tracking System - MES)

> **หมายเหตุ**: Prompt นี้ใช้สำหรับให้ AI Agent สร้างโปรเจคใหม่ที่มีลักษณะเหมือนกัน 100% 
> แต่ใช้ **Prisma + PostgreSQL + NextAuth.js** แทน Supabase เพื่อรองรับการ Deploy บน Plesk

---

## 🎯 วัตถุประสงค์
สร้างระบบ MES (Manufacturing Execution System) สำหรับโรงงานผลิตเครื่องประดับ ใช้ภาษาไทยเป็นหลัก

---

## 🛠️ Tech Stack ที่ต้องใช้

| Category | Technology |
|----------|------------|
| Framework | **Next.js 16+** (App Router) |
| UI | **React 19**, **TailwindCSS 4** |
| Database | **PostgreSQL** (ผ่าน Plesk) |
| ORM | **Prisma** |
| Authentication | **NextAuth.js v5** (Credentials Provider) |
| Icons | **Lucide React** |
| Language | **TypeScript 5** |
| Utilities | clsx, tailwind-merge |

---

## 📁 โครงสร้างโฟลเดอร์

```
jewelry-app/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx          # หน้า Login
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Dashboard layout พร้อม Sidebar
│   │   ├── dashboard/page.tsx      # หน้า Dashboard หลัก
│   │   ├── sku-master/page.tsx     # จัดการ SKU สินค้า (CRUD)
│   │   ├── job-orders/page.tsx     # จัดการใบสั่งผลิต (CRUD)
│   │   ├── production/page.tsx     # บันทึกการผลิต
│   │   ├── history/page.tsx        # ประวัติการผลิต
│   │   └── users/page.tsx          # จัดการผู้ใช้
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   └── generate-job-no/route.ts
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Select.tsx
│   │   └── Table.tsx
│   ├── Sidebar.tsx
│   ├── StatsCard.tsx
│   ├── ProductionFlow.tsx          # แสดง Flow การผลิต 10 ขั้นตอน
│   ├── SKUForm.tsx
│   └── TrackingModal.tsx
├── contexts/
│   └── AuthContext.tsx
├── lib/
│   ├── prisma.ts                   # Prisma client singleton
│   ├── types.ts                    # TypeScript types & constants
│   └── utils.ts                    # Utility functions
├── prisma/
│   ├── schema.prisma               # Database schema
│   └── seed.ts                     # Seed data
└── actions/                        # Server Actions
    ├── auth.actions.ts
    ├── product.actions.ts
    ├── job-order.actions.ts
    ├── production.actions.ts
    └── user.actions.ts
```

---

## 🗄️ Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  ADMIN
  OFFICE
  WORKER
}

enum JobStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum ProductionStep {
  WAX
  CLEAN_WAX
  CASTING
  FILING
  MEDIA
  SET_STONE
  POLISHING
  PLATING
  FQC
  PACKING
}

model User {
  id             String          @id @default(cuid())
  email          String?         @unique
  username       String?         @unique
  password       String          // Hashed password (bcrypt)
  fullName       String?         @map("full_name")
  role           UserRole        @default(WORKER)
  department     ProductionStep?
  avatarUrl      String?         @map("avatar_url")
  createdAt      DateTime        @default(now()) @map("created_at")
  updatedAt      DateTime        @updatedAt @map("updated_at")

  jobOrders      JobOrder[]      @relation("CreatedBy")
  productionLogs ProductionLog[]

  @@map("users")
}

model Product {
  id            String           @id @default(cuid())
  skuCode       String           @unique @map("sku_code")
  name          String
  nameTh        String?          @map("name_th")
  description   String?
  imageUrl      String?          @map("image_url")
  weightGrams   Decimal?         @map("weight_grams") @db.Decimal(10, 2)
  priceFinished Decimal?         @map("price_finished") @db.Decimal(12, 2)
  steps         ProductionStep[] @default([WAX, CLEAN_WAX, CASTING, FILING, MEDIA, SET_STONE, POLISHING, PLATING, FQC, PACKING])
  isActive      Boolean          @default(true) @map("is_active")
  createdAt     DateTime         @default(now()) @map("created_at")
  updatedAt     DateTime         @updatedAt @map("updated_at")

  jobOrderItems JobOrderItem[]

  @@map("products")
}

model JobOrder {
  id           String      @id @default(cuid())
  jobNo        String      @unique @map("job_no")
  customerName String      @map("customer_name")
  customerPo   String?     @map("customer_po")
  dueDate      DateTime    @map("due_date") @db.Date
  status       JobStatus   @default(PENDING)
  notes        String?
  createdById  String?     @map("created_by")
  createdAt    DateTime    @default(now()) @map("created_at")
  updatedAt    DateTime    @updatedAt @map("updated_at")

  createdBy    User?        @relation("CreatedBy", fields: [createdById], references: [id])
  items        JobOrderItem[]

  @@map("job_orders")
}

model JobOrderItem {
  id          String         @id @default(cuid())
  jobOrderId  String         @map("job_order_id")
  productId   String         @map("product_id")
  qty         Int
  currentStep ProductionStep @default(WAX) @map("current_step")
  createdAt   DateTime       @default(now()) @map("created_at")

  jobOrder       JobOrder        @relation(fields: [jobOrderId], references: [id], onDelete: Cascade)
  product        Product         @relation(fields: [productId], references: [id])
  productionLogs ProductionLog[]

  @@unique([jobOrderId, productId])
  @@map("job_order_items")
}

model ProductionLog {
  id             String         @id @default(cuid())
  jobOrderItemId String         @map("job_order_item_id")
  stepName       ProductionStep @map("step_name")
  workerId       String         @map("worker_id")
  goodQty        Int            @default(0) @map("good_qty")
  scrapQty       Int            @default(0) @map("scrap_qty")
  reworkQty      Int            @default(0) @map("rework_qty")
  notes          String?
  createdAt      DateTime       @default(now()) @map("created_at")

  jobOrderItem JobOrderItem @relation(fields: [jobOrderItemId], references: [id], onDelete: Cascade)
  worker       User         @relation(fields: [workerId], references: [id])

  @@map("production_logs")
}

model JobNoSequence {
  yearMonth    String @id @map("year_month")
  lastSequence Int    @default(0) @map("last_sequence")

  @@map("job_no_sequence")
}
```

---

## 🔄 Production Steps (10 ขั้นตอน)

กำหนดใน `lib/types.ts`:

```typescript
export type ProductionStep =
    | 'WAX'
    | 'CLEAN_WAX'
    | 'CASTING'
    | 'FILING'
    | 'MEDIA'
    | 'SET_STONE'
    | 'POLISHING'
    | 'PLATING'
    | 'FQC'
    | 'PACKING'

export const PRODUCTION_STEPS: { key: ProductionStep; label: string; labelTh: string; order: number }[] = [
    { key: 'WAX', label: 'Wax', labelTh: 'ฉีดเทียน', order: 1 },
    { key: 'CLEAN_WAX', label: 'Clean Wax', labelTh: 'แต่งเทียน', order: 2 },
    { key: 'CASTING', label: 'Casting', labelTh: 'หล่อ', order: 3 },
    { key: 'FILING', label: 'Filing', labelTh: 'แต่งทราย', order: 4 },
    { key: 'MEDIA', label: 'Media', labelTh: 'ร่อนมีเดีย', order: 5 },
    { key: 'SET_STONE', label: 'Set Stone', labelTh: 'ฝัง', order: 6 },
    { key: 'POLISHING', label: 'Polishing', labelTh: 'ขัด', order: 7 },
    { key: 'PLATING', label: 'Plating', labelTh: 'ชุบ', order: 8 },
    { key: 'FQC', label: 'Final QC', labelTh: 'คิวซีงานสำเร็จ', order: 9 },
    { key: 'PACKING', label: 'Packing', labelTh: 'แพค', order: 10 },
]
```

---

## 👥 User Roles & Permissions

| Role | Dashboard | SKU Master | Job Orders | Production | Users |
|------|-----------|------------|------------|------------|-------|
| ADMIN | ✅ View | ✅ CRUD | ✅ CRUD | ✅ All | ✅ CRUD |
| OFFICE | ✅ View | ❌ | ✅ Create/View | ✅ All | ❌ |
| WORKER | ❌ | ❌ | ❌ | ✅ Own Dept Only | ❌ |

---

## 📱 หน้าที่ต้องสร้าง

### 1. Login Page (`/login`)
- ฟอร์ม Login ด้วย Email/Password
- ใช้ NextAuth.js Credentials Provider
- Redirect ไป Dashboard หลัง Login

### 2. Dashboard (`/dashboard`)
- **Stats Cards**: 
  - ออเดอร์ที่กำลังผลิต
  - ผลผลิตที่ดี (30 วัน)
  - ของเสีย (30 วัน)
  - อัตราของเสีย (%)
- **Production Flow**: แสดง 10 ขั้นตอนแบบ Visual พร้อมจำนวนงาน
- **Recent Orders**: 5 ออเดอร์ล่าสุด

### 3. SKU Master (`/sku-master`)
- ตารางแสดงรายการ SKU ทั้งหมด
- Modal สร้าง/แก้ไข SKU
- Upload รูปสินค้า
- เลือก Steps ที่ต้องผ่าน (checkbox)

### 4. Job Orders (`/job-orders`)
- ตารางแสดง Job Orders ทั้งหมด
- สร้าง Job Order ใหม่พร้อมเลือกสินค้า + จำนวน
- Auto-generate Job Number (Format: `JO-YYMM-001`)
- ดู Detail ของแต่ละ Job

### 5. Production (`/production`)
- แสดงงานที่รอผลิตในแต่ละ Step
- Modal บันทึกผลการผลิต (Good/Scrap/Rework Qty)
- คำนวณ Available Qty จาก Step ก่อนหน้า
- Auto-update Current Step

### 6. History (`/history`)
- ตาราง Production Logs ทั้งหมด
- Filter ตาม Job/Step/Worker/Date

### 7. Users (`/users`)
- CRUD Users
- กำหนด Role และ Department

---

## 🎨 Design Requirements

### Color Scheme
- Primary: Indigo-Purple Gradient (`from-indigo-500 to-purple-600`)
- Success: Emerald
- Warning: Amber
- Error: Rose

### UI Components
- **Sidebar**: Fixed left, responsive with hamburger menu on mobile
- **Cards**: Rounded corners (xl), subtle shadows
- **Buttons**: Gradient สำหรับ primary actions
- **Tables**: Striped rows, hover effects
- **Modals**: Centered, with backdrop blur

### Typography
- Font: Inter (Google Fonts)
- Thai language support

### CSS Animations
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
```

---

## 🔧 Key Functions ที่ต้องมี

### 1. Generate Job Number
```typescript
// Auto-increment per month: JO-YYMM-001, JO-YYMM-002, ...
async function generateJobNo(): Promise<string> {
  const currentYM = format(new Date(), 'yyMM')
  
  const sequence = await prisma.jobNoSequence.upsert({
    where: { yearMonth: currentYM },
    update: { lastSequence: { increment: 1 } },
    create: { yearMonth: currentYM, lastSequence: 1 },
  })
  
  return `JO-${currentYM}-${String(sequence.lastSequence).padStart(3, '0')}`
}
```

### 2. Get Step Balance (Available Qty)
```typescript
// คำนวณจำนวนที่ทำได้ใน Step นั้น = Good Qty จาก Step ก่อนหน้า - ที่ทำไปแล้ว
async function getStepBalance(jobItemId: string, step: ProductionStep): Promise<number> {
  const stepOrder = PRODUCTION_STEPS.find(s => s.key === step)?.order || 1
  
  let totalFromPrev: number
  
  if (stepOrder === 1) {
    // First step gets from job item qty
    const item = await prisma.jobOrderItem.findUnique({ where: { id: jobItemId } })
    totalFromPrev = item?.qty || 0
  } else {
    // Sum good qty from previous step
    const prevStep = PRODUCTION_STEPS.find(s => s.order === stepOrder - 1)?.key
    const logs = await prisma.productionLog.aggregate({
      where: { jobOrderItemId: jobItemId, stepName: prevStep },
      _sum: { goodQty: true }
    })
    totalFromPrev = logs._sum.goodQty || 0
  }
  
  // Subtract already processed in this step
  const processed = await prisma.productionLog.aggregate({
    where: { jobOrderItemId: jobItemId, stepName: step },
    _sum: { goodQty: true, scrapQty: true, reworkQty: true }
  })
  const alreadyProcessed = (processed._sum.goodQty || 0) + (processed._sum.scrapQty || 0) + (processed._sum.reworkQty || 0)
  
  return Math.max(0, totalFromPrev - alreadyProcessed)
}
```

### 3. Dashboard Stats
```typescript
async function getDashboardStats() {
  const thirtyDaysAgo = subDays(new Date(), 30)
  
  const [activeOrders, goodOutput, scrapOutput] = await Promise.all([
    prisma.jobOrder.count({
      where: { status: { in: ['PENDING', 'IN_PROGRESS'] } }
    }),
    prisma.productionLog.aggregate({
      where: { createdAt: { gte: thirtyDaysAgo } },
      _sum: { goodQty: true }
    }),
    prisma.productionLog.aggregate({
      where: { createdAt: { gte: thirtyDaysAgo } },
      _sum: { scrapQty: true }
    })
  ])
  
  const totalGood = goodOutput._sum.goodQty || 0
  const totalScrap = scrapOutput._sum.scrapQty || 0
  const defectRate = (totalGood + totalScrap) > 0 
    ? ((totalScrap / (totalGood + totalScrap)) * 100).toFixed(2)
    : 0
  
  return {
    active_orders: activeOrders,
    total_good_output: totalGood,
    total_scrap: totalScrap,
    defect_rate: Number(defectRate)
  }
}
```

---

## 🚀 Deployment Notes (Plesk)

1. ใช้ PostgreSQL database ที่สร้างผ่าน Plesk
2. ตั้งค่า `DATABASE_URL` ใน `.env`:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/jewelry_db"
   ```
3. Run migrations:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```
4. ใช้ Node.js app ผ่าน Plesk Node.js Hosting
5. Build production:
   ```bash
   npm run build
   npm run start
   ```

---

## 📋 Environment Variables

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/jewelry_db"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="https://your-domain.com"

# Upload (optional)
UPLOAD_DIR="/var/www/uploads"
```

---

## 📦 Package Dependencies

```json
{
  "dependencies": {
    "next": "^16.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@prisma/client": "^6.0.0",
    "next-auth": "^5.0.0",
    "bcryptjs": "^2.4.3",
    "clsx": "^2.1.0",
    "lucide-react": "^0.560.0",
    "tailwind-merge": "^3.0.0",
    "date-fns": "^4.0.0"
  },
  "devDependencies": {
    "prisma": "^6.0.0",
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/bcryptjs": "^2.4.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^16.0.0"
  }
}
```

---

## ⚠️ Important Notes

1. **UI ต้องเป็นภาษาไทย** ทั้งหมด
2. **Responsive Design** - ต้องใช้งานได้ดีบน Mobile/Tablet
3. ใช้ **Server Actions** แทน API Routes เมื่อทำได้
4. **Type-safe** ตลอดทั้งโปรเจค
5. **Error Handling** ที่เหมาะสมพร้อม Toast notifications
6. **Password hashing** ด้วย bcrypt (min 10 rounds)
7. **Session management** ผ่าน NextAuth.js JWT strategy

---

## 🔐 NextAuth Configuration

```typescript
// auth.config.ts
import { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        })
        
        if (!user || !user.password) return null
        
        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )
        
        if (!isValid) return null
        
        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
          department: user.department
        }
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.department = user.department
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.department = token.department as string
      }
      return session
    }
  },
  pages: {
    signIn: '/login'
  }
}
```

---

*สร้างโดยอัตโนมัติจากโปรเจค jewelry-app เดิม*
*วันที่: 2026-01-14*
