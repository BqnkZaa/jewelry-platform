---
description: ขั้นตอนการ Deploy โปรเจกต์ขึ้น Vercel
---

# 🚀 Deploy to Vercel

## Prerequisites
- บัญชี Vercel (สมัครฟรีที่ https://vercel.com)
- GitHub repository สำหรับโปรเจกต์
- Environment variables ที่จำเป็น (เช่น DATABASE_URL, AUTH_SECRET)

---

## วิธีที่ 1: Deploy ผ่าน Vercel Dashboard (แนะนำ)

### ขั้นตอนที่ 1: Push โค้ดขึ้น GitHub
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### ขั้นตอนที่ 2: เชื่อมต่อ Vercel กับ GitHub
1. ไปที่ https://vercel.com/new
2. คลิก "Import Git Repository"
3. เลือก repository `jewelry-platform`
4. คลิก "Import"

### ขั้นตอนที่ 3: ตั้งค่า Environment Variables
ในหน้า Configure Project ให้เพิ่มตัวแปรต่อไปนี้:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | URL ของ PostgreSQL database (เช่น Supabase, Neon, PlanetScale) |
| `AUTH_SECRET` | Secret key สำหรับ NextAuth (สร้างได้ด้วย `openssl rand -base64 32`) |
| `AUTH_TRUST_HOST` | ตั้งค่าเป็น `true` |

### ขั้นตอนที่ 4: Deploy
1. คลิก "Deploy"
2. รอให้ Vercel build และ deploy เสร็จ (~2-5 นาที)
3. เมื่อเสร็จจะได้ URL เช่น `https://jewelry-platform.vercel.app`

---

## วิธีที่ 2: Deploy ผ่าน Vercel CLI

### ขั้นตอนที่ 1: ติดตั้ง Vercel CLI
// turbo
```bash
npm install -g vercel
```

### ขั้นตอนที่ 2: Login
```bash
vercel login
```

### ขั้นตอนที่ 3: Deploy (Preview)
```bash
vercel
```

### ขั้นตอนที่ 4: Deploy to Production
```bash
vercel --prod
```

---

## การตั้งค่าเพิ่มเติม

### สร้างไฟล์ vercel.json (ถ้าต้องการ)
```json
{
  "buildCommand": "prisma generate && next build",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

### ตั้งค่า Prisma สำหรับ Vercel
เพิ่มใน `postinstall` script (โปรเจกต์นี้มีแล้ว):
```json
"postinstall": "prisma generate"
```

---

## Troubleshooting

### ปัญหา: Prisma Client not generated
**แก้ไข**: ตรวจสอบว่ามี `prisma generate` ใน build command

### ปัญหา: Database connection failed
**แก้ไข**: 
- ตรวจสอบ `DATABASE_URL` ถูกต้อง
- ตรวจสอบว่า database เปิด external connections

### ปัญหา: Auth errors
**แก้ไข**: 
- ตั้งค่า `AUTH_SECRET` ใน environment variables
- ตั้งค่า `AUTH_TRUST_HOST=true`

---

## Useful Links
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Vercel CLI Docs](https://vercel.com/docs/cli)
- [Prisma on Vercel Guide](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
