'use server'

import { signIn, signOut } from '@/auth'
import { AuthError } from 'next-auth'

export async function signInAction(email: string, password: string) {
    try {
        await signIn('credentials', {
            email,
            password,
            redirect: false,
        })
        return { success: true }
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return { success: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }
                default:
                    return { success: false, error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }
            }
        }
        throw error
    }
}

export async function signOutAction() {
    await signOut({ redirect: false })
}
