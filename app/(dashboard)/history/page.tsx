'use client'

import { useState, useEffect, useCallback } from 'react'
import { getProductionLogs } from '@/actions/production.actions'
import { getUsers } from '@/actions/user.actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmpty } from '@/components/ui/Table'
import { PRODUCTION_STEPS, type ProductionStep } from '@/lib/types'
import { formatDateTime, getStepColor } from '@/lib/utils'
import { getStepLabel } from '@/lib/types'
import { History, Search } from 'lucide-react'

interface User {
    id: string
    fullName: string | null
}

interface ProductionLog {
    id: string
    stepName: ProductionStep
    goodQty: number
    scrapQty: number
    reworkQty: number
    notes: string | null
    createdAt: Date
    worker: { id: string; fullName: string | null }
    jobOrderItem: {
        id: string
        product: { id: string; skuCode: string; name: string; nameTh: string | null }
        jobOrder: { id: string; jobNo: string; customerName: string }
    }
}

export default function HistoryPage() {
    const [logs, setLogs] = useState<ProductionLog[]>([])
    const [users, setUsers] = useState<User[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [filters, setFilters] = useState({
        stepName: '' as ProductionStep | '',
        workerId: '',
        startDate: '',
        endDate: '',
    })

    const loadData = useCallback(async () => {
        setIsLoading(true)
        const [logsResult, usersResult] = await Promise.all([
            getProductionLogs({
                stepName: filters.stepName || undefined,
                workerId: filters.workerId || undefined,
                startDate: filters.startDate ? new Date(filters.startDate) : undefined,
                endDate: filters.endDate ? new Date(filters.endDate + 'T23:59:59') : undefined,
            }),
            getUsers(),
        ])
        if (logsResult.success && logsResult.data) setLogs(logsResult.data as ProductionLog[])
        if (usersResult.success && usersResult.data) setUsers(usersResult.data as User[])
        setIsLoading(false)
    }, [filters])

    useEffect(() => { loadData() }, [loadData])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ประวัติการผลิต</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">ดูประวัติการบันทึกการผลิตทั้งหมด</p>
            </div>
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Search className="w-5 h-5" />ค้นหา / กรอง</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Select label="ขั้นตอน" options={[{ value: '', label: 'ทั้งหมด' }, ...PRODUCTION_STEPS.map((s) => ({ value: s.key, label: s.labelTh }))]} value={filters.stepName} onChange={(e) => setFilters({ ...filters, stepName: e.target.value as ProductionStep | '' })} />
                        <Select label="พนักงาน" options={[{ value: '', label: 'ทั้งหมด' }, ...users.map((u) => ({ value: u.id, label: u.fullName || 'ไม่ระบุ' }))]} value={filters.workerId} onChange={(e) => setFilters({ ...filters, workerId: e.target.value })} />
                        <Input label="ตั้งแต่วันที่" type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
                        <Input label="ถึงวันที่" type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>ประวัติการบันทึก ({logs.length})</CardTitle></CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
                    ) : logs.length === 0 ? (
                        <TableEmpty message="ไม่พบประวัติ" icon={<History className="w-12 h-12 text-gray-300" />} />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>วันที่</TableHead>
                                    <TableHead>ใบสั่ง</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>ขั้นตอน</TableHead>
                                    <TableHead>ดี</TableHead>
                                    <TableHead>เสีย</TableHead>
                                    <TableHead>แก้ไข</TableHead>
                                    <TableHead>พนักงาน</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="text-sm">{formatDateTime(log.createdAt)}</TableCell>
                                        <TableCell className="font-medium">{log.jobOrderItem.jobOrder.jobNo}</TableCell>
                                        <TableCell>{log.jobOrderItem.product.skuCode}</TableCell>
                                        <TableCell><span className={`px-2 py-1 rounded-full text-xs text-white ${getStepColor(log.stepName)}`}>{getStepLabel(log.stepName)}</span></TableCell>
                                        <TableCell className="text-emerald-600 font-medium">{log.goodQty}</TableCell>
                                        <TableCell className="text-rose-600 font-medium">{log.scrapQty}</TableCell>
                                        <TableCell className="text-amber-600 font-medium">{log.reworkQty}</TableCell>
                                        <TableCell>{log.worker.fullName || '-'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
