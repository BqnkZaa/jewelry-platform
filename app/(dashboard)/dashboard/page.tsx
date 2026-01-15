import { getDashboardStats, getRecentOrders } from '@/actions/production.actions'
import { StatsCard } from '@/components/StatsCard'
import { ProductionFlow } from '@/components/ProductionFlow'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { ClipboardList, CheckCircle, AlertTriangle, Percent } from 'lucide-react'
import { formatDate, getStatusColor } from '@/lib/utils'
import { getStatusLabel } from '@/lib/types'
import type { JobStatus } from '@/lib/types'

export default async function DashboardPage() {
    const [statsResult, ordersResult] = await Promise.all([
        getDashboardStats(),
        getRecentOrders(5),
    ])

    const stats = statsResult.success ? statsResult.data : null
    const recentOrders = ordersResult.success ? ordersResult.data : []

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    แดชบอร์ด
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    ภาพรวมการผลิตและสถิติประจำวัน
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="ออเดอร์ที่กำลังผลิต"
                    value={stats?.activeOrders || 0}
                    icon={ClipboardList}
                    color="indigo"
                />
                <StatsCard
                    title="ผลผลิตที่ดี (30 วัน)"
                    value={stats?.totalGoodOutput || 0}
                    icon={CheckCircle}
                    color="emerald"
                />
                <StatsCard
                    title="ของเสีย (30 วัน)"
                    value={stats?.totalScrap || 0}
                    icon={AlertTriangle}
                    color="rose"
                />
                <StatsCard
                    title="อัตราของเสีย"
                    value={`${stats?.defectRate || 0}%`}
                    icon={Percent}
                    color="amber"
                />
            </div>

            {/* Production Flow */}
            <ProductionFlow stepCounts={stats?.stepCounts || []} />

            {/* Recent Orders */}
            <Card>
                <CardHeader>
                    <CardTitle>ออเดอร์ล่าสุด</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>เลขที่ใบสั่ง</TableHead>
                                <TableHead>ลูกค้า</TableHead>
                                <TableHead>สินค้า</TableHead>
                                <TableHead>กำหนดส่ง</TableHead>
                                <TableHead>สถานะ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentOrders && recentOrders.length > 0 ? (
                                recentOrders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">{order.jobNo}</TableCell>
                                        <TableCell>{order.customerName}</TableCell>
                                        <TableCell>
                                            {order.items.map((item) => (
                                                <div key={item.id} className="text-sm">
                                                    {item.product.nameTh || item.product.skuCode} x {item.qty}
                                                </div>
                                            ))}
                                        </TableCell>
                                        <TableCell>{formatDate(order.dueDate)}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status as JobStatus)}`}>
                                                {getStatusLabel(order.status as JobStatus)}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                                        ยังไม่มีออเดอร์
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
