'use client'

import { cn } from '@/lib/utils'
import {
    LayoutDashboard,
    Package,
    ClipboardList,
    Settings,
    Users,
    History,
    Menu,
    X,
    LogOut,
    ChevronLeft,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { signOut } from 'next-auth/react'

interface NavItem {
    href: string
    label: string
    icon: React.ReactNode
    roles?: string[]
}

const navItems: NavItem[] = [
    {
        href: '/dashboard',
        label: 'แดชบอร์ด',
        icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
        href: '/sku-master',
        label: 'SKU สินค้า',
        icon: <Package className="w-5 h-5" />,
        roles: ['ADMIN'],
    },
    {
        href: '/job-orders',
        label: 'ใบสั่งผลิต',
        icon: <ClipboardList className="w-5 h-5" />,
        roles: ['ADMIN', 'OFFICE'],
    },
    {
        href: '/production',
        label: 'บันทึกการผลิต',
        icon: <Settings className="w-5 h-5" />,
    },
    {
        href: '/history',
        label: 'ประวัติการผลิต',
        icon: <History className="w-5 h-5" />,
    },
    {
        href: '/users',
        label: 'จัดการผู้ใช้',
        icon: <Users className="w-5 h-5" />,
        roles: ['ADMIN'],
    },
]

interface SidebarProps {
    userRole?: string
    userName?: string
}

export function Sidebar({ userRole = 'ADMIN', userName = 'ผู้ใช้งาน' }: SidebarProps) {
    const pathname = usePathname()
    const [isOpen, setIsOpen] = useState(false)
    const [isCollapsed, setIsCollapsed] = useState(false)

    const filteredNavItems = navItems.filter(
        (item) => !item.roles || item.roles.includes(userRole)
    )

    const handleSignOut = async () => {
        await signOut({ callbackUrl: '/login' })
    }

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed top-4 left-4 z-40 p-2 rounded-xl bg-zinc-900 border border-amber-500/30 shadow-lg lg:hidden"
            >
                <Menu className="w-6 h-6 text-amber-500" />
            </button>

            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed top-0 left-0 z-50 h-screen bg-zinc-900 border-r border-amber-500/20 transition-all duration-300',
                    'flex flex-col',
                    isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
                    isCollapsed ? 'w-20' : 'w-64'
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-4 border-b border-amber-500/20">
                    {!isCollapsed && (
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 relative">
                                <Image
                                    src="/picture/jewelry_logo.png"
                                    alt="JC Logo"
                                    fill
                                    className="object-contain"
                                    unoptimized
                                />
                            </div>
                            <div>
                                <h1 className="font-bold bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">Jewelry MES</h1>
                                <p className="text-xs text-amber-200/50">ระบบจัดการการผลิต</p>
                            </div>
                        </div>
                    )}
                    {isCollapsed && (
                        <div className="w-10 h-10 relative mx-auto">
                            <Image
                                src="/picture/jewelry_logo.png"
                                alt="JC Logo"
                                fill
                                className="object-contain"
                            />
                        </div>
                    )}

                    {/* Mobile Close */}
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1.5 rounded-lg text-amber-500/60 hover:bg-amber-500/10 lg:hidden"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Collapse Toggle (Desktop) */}
                    {!isCollapsed && (
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="hidden lg:flex p-1.5 rounded-lg text-amber-500/60 hover:bg-amber-500/10"
                        >
                            <ChevronLeft className="w-5 h-5 transition-transform" />
                        </button>
                    )}
                </div>

                {isCollapsed && (
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden lg:flex p-1.5 rounded-lg text-amber-500/60 hover:bg-amber-500/10 mx-auto mt-2"
                    >
                        <ChevronLeft className="w-5 h-5 transition-transform rotate-180" />
                    </button>
                )}

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {filteredNavItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={cn(
                                    'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                                    isActive
                                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-zinc-900 shadow-lg shadow-amber-500/25'
                                        : 'text-amber-200/70 hover:bg-amber-500/10 hover:text-amber-400',
                                    isCollapsed && 'justify-center px-0'
                                )}
                            >
                                {item.icon}
                                {!isCollapsed && <span className="font-medium">{item.label}</span>}
                            </Link>
                        )
                    })}
                </nav>

                {/* User Section */}
                <div className="p-3 border-t border-amber-500/20">
                    {!isCollapsed && (
                        <div className="flex items-center gap-3 px-3 py-2 mb-2">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center">
                                <span className="text-zinc-900 text-sm font-bold">
                                    {userName?.charAt(0)?.toUpperCase() || 'U'}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-amber-100 truncate">
                                    {userName}
                                </p>
                                <p className="text-xs text-amber-200/50">{userRole}</p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleSignOut}
                        className={cn(
                            'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-amber-200/70',
                            'hover:bg-rose-500/10 hover:text-rose-400',
                            'transition-all duration-200',
                            isCollapsed && 'justify-center px-0'
                        )}
                    >
                        <LogOut className="w-5 h-5" />
                        {!isCollapsed && <span className="font-medium">ออกจากระบบ</span>}
                    </button>
                </div>
            </aside>
        </>
    )
}
