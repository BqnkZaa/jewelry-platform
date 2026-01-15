import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { SessionProvider } from 'next-auth/react'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()

    if (!session) {
        redirect('/login')
    }

    return (
        <SessionProvider session={session}>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
                <Sidebar
                    userRole={session.user?.role || 'WORKER'}
                    userName={session.user?.name || 'ผู้ใช้งาน'}
                />

                {/* Main Content */}
                <main className="lg:pl-64 min-h-screen transition-all duration-300">
                    <div className="p-4 md:p-6 lg:p-8 pt-20 lg:pt-8">
                        {children}
                    </div>
                </main>
            </div>
        </SessionProvider>
    )
}
