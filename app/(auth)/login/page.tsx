'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Lock, Mail } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            })

            if (result?.error) {
                setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
            } else {
                router.push('/dashboard')
                router.refresh()
            }
        } catch {
            setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-neutral-900 to-stone-900 p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-3xl" />
                <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-yellow-600/10 to-transparent rounded-full blur-3xl" />
            </div>

            {/* Login Card */}
            <div className="relative w-full max-w-md animate-scaleIn">
                <div className="bg-black backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-10 border border-amber-500/20">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-48 h-40 overflow-hidden mb-2">
                            <img
                                src="/picture/jewelry_logo.png"
                                alt="JC Internationnal Jewelry Casting"
                                className="w-full h-auto object-cover object-top scale-110"
                            />
                        </div>
                        <p className="text-amber-200/70 mt-1">
                            ระบบจัดการการผลิตเครื่องประดับ
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500/60 z-10" />
                            <Input
                                type="text"
                                placeholder="อีเมล หรือ ชื่อผู้ใช้"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-12 bg-zinc-800/50 border-amber-500/30 text-white placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500/20"
                                required
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500/60 z-10" />
                            <Input
                                type="password"
                                placeholder="รหัสผ่าน"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-12 bg-zinc-800/50 border-amber-500/30 text-white placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500/20"
                                required
                            />
                        </div>

                        {error && (
                            <div className="p-3 rounded-xl bg-rose-900/30 border border-rose-500/30">
                                <p className="text-sm text-rose-400 text-center">
                                    {error}
                                </p>
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-600 hover:via-yellow-600 hover:to-amber-600 text-zinc-900 font-semibold shadow-lg shadow-amber-500/25"
                            size="lg"
                            isLoading={isLoading}
                        >
                            เข้าสู่ระบบ
                        </Button>
                    </form>

                    {/* Footer */}
                    <div className="mt-8 text-center">
                        <p className="text-sm text-amber-200/40">
                            © 2024 JC Internationnal Jewelry Casting
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
