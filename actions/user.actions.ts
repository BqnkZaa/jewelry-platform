'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import type { UserFormData, UserRole, ProductionStep } from '@/lib/types'

export async function getUsers() {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                username: true,
                fullName: true,
                role: true,
                department: true,
                avatarUrl: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: 'desc' },
        })
        return { success: true, data: users }
    } catch (error) {
        console.error('Error fetching users:', error)
        return { success: false, error: 'ไม่สามารถดึงข้อมูลผู้ใช้ได้' }
    }
}

export async function getUser(id: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                username: true,
                fullName: true,
                role: true,
                department: true,
                avatarUrl: true,
                createdAt: true,
                updatedAt: true,
            },
        })
        if (!user) {
            return { success: false, error: 'ไม่พบผู้ใช้' }
        }
        return { success: true, data: user }
    } catch (error) {
        console.error('Error fetching user:', error)
        return { success: false, error: 'ไม่สามารถดึงข้อมูลผู้ใช้ได้' }
    }
}

export async function createUser(data: UserFormData) {
    try {
        // Check for existing email/username
        if (data.email) {
            const existingEmail = await prisma.user.findUnique({
                where: { email: data.email },
            })
            if (existingEmail) {
                return { success: false, error: 'อีเมลนี้มีอยู่แล้ว' }
            }
        }

        if (data.username) {
            const existingUsername = await prisma.user.findUnique({
                where: { username: data.username },
            })
            if (existingUsername) {
                return { success: false, error: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' }
            }
        }

        if (!data.password) {
            return { success: false, error: 'กรุณาระบุรหัสผ่าน' }
        }

        const hashedPassword = await bcrypt.hash(data.password, 10)

        const user = await prisma.user.create({
            data: {
                email: data.email,
                username: data.username,
                password: hashedPassword,
                fullName: data.fullName,
                role: data.role as UserRole,
                department: data.department as ProductionStep | undefined,
            },
            select: {
                id: true,
                email: true,
                username: true,
                fullName: true,
                role: true,
                department: true,
                createdAt: true,
            },
        })

        revalidatePath('/users')
        return { success: true, data: user }
    } catch (error) {
        console.error('Error creating user:', error)
        return { success: false, error: 'ไม่สามารถสร้างผู้ใช้ได้' }
    }
}

export async function updateUser(id: string, data: Partial<UserFormData>) {
    try {
        // Check for existing email/username
        if (data.email) {
            const existingEmail = await prisma.user.findFirst({
                where: { email: data.email, NOT: { id } },
            })
            if (existingEmail) {
                return { success: false, error: 'อีเมลนี้มีอยู่แล้ว' }
            }
        }

        if (data.username) {
            const existingUsername = await prisma.user.findFirst({
                where: { username: data.username, NOT: { id } },
            })
            if (existingUsername) {
                return { success: false, error: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' }
            }
        }

        const updateData: Record<string, unknown> = {
            ...(data.email !== undefined && { email: data.email }),
            ...(data.username !== undefined && { username: data.username }),
            ...(data.fullName !== undefined && { fullName: data.fullName }),
            ...(data.role && { role: data.role }),
            ...(data.department !== undefined && { department: data.department }),
        }

        // Hash password if provided
        if (data.password) {
            updateData.password = await bcrypt.hash(data.password, 10)
        }

        const user = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                email: true,
                username: true,
                fullName: true,
                role: true,
                department: true,
                updatedAt: true,
            },
        })

        revalidatePath('/users')
        return { success: true, data: user }
    } catch (error) {
        console.error('Error updating user:', error)
        return { success: false, error: 'ไม่สามารถอัพเดทผู้ใช้ได้' }
    }
}

export async function deleteUser(id: string) {
    try {
        // Check if user has production logs
        const hasLogs = await prisma.productionLog.findFirst({
            where: { workerId: id },
        })
        if (hasLogs) {
            return { success: false, error: 'ไม่สามารถลบได้ เนื่องจากผู้ใช้มีประวัติการผลิต' }
        }

        await prisma.user.delete({
            where: { id },
        })

        revalidatePath('/users')
        return { success: true }
    } catch (error) {
        console.error('Error deleting user:', error)
        return { success: false, error: 'ไม่สามารถลบผู้ใช้ได้' }
    }
}
