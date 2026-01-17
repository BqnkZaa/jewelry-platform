import { getDashboardStats, getRecentOrders } from '@/actions/production.actions'
import { StatsCard } from '@/components/StatsCard'
import { ProductionFlow } from '@/components/ProductionFlow'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { ClipboardList, CheckCircle, AlertTriangle, Percent, Package, Clock, TrendingUp, CalendarCheck } from 'lucide-react'
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

    // Calculate max for chart scaling
    const maxDailyQty = stats?.dailyProductionData?.reduce((max, d) => Math.max(max, d.qty), 0) || 1

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

            {/* Production Overview Section */}
            <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-indigo-900 dark:text-indigo-100">
                        <Package className="w-5 h-5" />
                        ภาพรวมการผลิต
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-indigo-100 dark:border-indigo-800">
                            <div className="flex items-center gap-2 mb-2">
                                <ClipboardList className="w-4 h-4 text-indigo-500" />
                                <span className="text-xs text-gray-500 dark:text-gray-400">รวมทั้งหมดในใบสั่ง</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.totalItemsInProduction || 0}</p>
                            <p className="text-xs text-gray-500">ชิ้น</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-emerald-100 dark:border-emerald-800">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                <span className="text-xs text-gray-500 dark:text-gray-400">ผลิตเสร็จแล้ว</span>
                            </div>
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats?.finishedInActiveOrders || 0}</p>
                            <p className="text-xs text-gray-500">ชิ้น</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-amber-100 dark:border-amber-800">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-4 h-4 text-amber-500" />
                                <span className="text-xs text-gray-500 dark:text-gray-400">คงเหลือต้องผลิต</span>
                            </div>
                            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats?.remainingToComplete || 0}</p>
                            <p className="text-xs text-gray-500">ชิ้น</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-cyan-100 dark:border-cyan-800">
                            <div className="flex items-center gap-2 mb-2">
                                <CalendarCheck className="w-4 h-4 text-cyan-500" />
                                <span className="text-xs text-gray-500 dark:text-gray-400">เสร็จวันนี้</span>
                            </div>
                            <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{stats?.finishedToday || 0}</p>
                            <p className="text-xs text-gray-500">ชิ้น</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Daily Production Chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-500" />
                        ผลิตเสร็จรายวัน (7 วันล่าสุด)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-end justify-between gap-1 sm:gap-2 h-auto mt-4 pb-2">
                        {stats?.dailyProductionData?.map((day) => (
                            <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                                <div className="w-full flex items-end justify-center h-[100px] sm:h-[120px]">
                                    <div
                                        className="w-full max-w-[40px] bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-lg transition-all duration-300 hover:from-indigo-500 hover:to-indigo-300"
                                        style={{
                                            height: `${maxDailyQty > 0 ? Math.max(8, (day.qty / maxDailyQty) * 100) : 8}%`,
                                            minHeight: '8px'
                                        }}
                                        title={`${day.qty} ชิ้น`}
                                    />
                                </div>
                                <span className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-white">{day.qty}</span>
                                <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{day.label}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Original Stats Cards */}
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
                    <Table className="mobile-card-table">
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
                                        <TableCell data-label="เลขที่" className="font-medium">{order.jobNo}</TableCell>
                                        <TableCell data-label="ลูกค้า">{order.customerName}</TableCell>
                                        <TableCell data-label="สินค้า">
                                            {order.items.map((item) => (
                                                <div key={item.id} className="text-sm">
                                                    {item.product.nameTh || item.product.skuCode} x {item.qty}
                                                </div>
                                            ))}
                                        </TableCell>
                                        <TableCell data-label="กำหนดส่ง" className="hide-on-mobile">{formatDate(order.dueDate)}</TableCell>
                                        <TableCell data-label="สถานะ">
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
