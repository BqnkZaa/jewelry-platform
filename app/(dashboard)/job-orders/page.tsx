'use client'

import { useState, useEffect } from 'react'
import { getJobOrders, createJobOrder, updateJobOrderStatus, deleteJobOrder } from '@/actions/job-order.actions'
import { getProducts } from '@/actions/product.actions'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmpty } from '@/components/ui/Table'
import { JOB_STATUSES, type JobStatus, type ProductionStep } from '@/lib/types'
import { formatDate, getStatusColor } from '@/lib/utils'
import { getStatusLabel, getStepLabel } from '@/lib/types'
import { Plus, Trash2, ClipboardList, Eye } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface Product {
    id: string
    skuCode: string
    name: string
    nameTh: string | null
}

interface JobOrderItem {
    id: string
    productId: string
    qty: number
    currentStep: ProductionStep
    product: Product
}

interface JobOrder {
    id: string
    jobNo: string
    customerName: string
    customerPo: string | null
    dueDate: string
    status: JobStatus
    notes: string | null
    createdAt: string
    items: JobOrderItem[]
}

interface OrderItemInput {
    productId: string
    qty: number
}

export default function JobOrdersPage() {
    const { data: session } = useSession()
    const [jobOrders, setJobOrders] = useState<JobOrder[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
    const [selectedOrder, setSelectedOrder] = useState<JobOrder | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState({
        customerName: '',
        customerPo: '',
        dueDate: '',
        notes: '',
        items: [{ productId: '', qty: 1 }] as OrderItemInput[],
    })

    const loadData = async () => {
        setIsLoading(true)
        const [ordersResult, productsResult] = await Promise.all([
            getJobOrders(),
            getProducts({ isActive: true }),
        ])
        if (ordersResult.success && ordersResult.data) {
            setJobOrders(ordersResult.data as unknown as JobOrder[])
        }
        if (productsResult.success && productsResult.data) {
            setProducts(productsResult.data as Product[])
        }
        setIsLoading(false)
    }

    useEffect(() => {
        loadData()
    }, [])

    const resetForm = () => {
        setFormData({
            customerName: '',
            customerPo: '',
            dueDate: '',
            notes: '',
            items: [{ productId: '', qty: 1 }],
        })
        setError('')
    }

    const openCreateModal = () => {
        resetForm()
        setIsModalOpen(true)
    }

    const openDetailModal = (order: JobOrder) => {
        setSelectedOrder(order)
        setIsDetailModalOpen(true)
    }

    const addItem = () => {
        setFormData((prev) => ({
            ...prev,
            items: [...prev.items, { productId: '', qty: 1 }],
        }))
    }

    const removeItem = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }))
    }

    const updateItem = (index: number, field: 'productId' | 'qty', value: string | number) => {
        setFormData((prev) => ({
            ...prev,
            items: prev.items.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            ),
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        // Validate items
        const validItems = formData.items.filter((item) => item.productId && item.qty > 0)
        if (validItems.length === 0) {
            setError('กรุณาเพิ่มอย่างน้อย 1 รายการสินค้า')
            return
        }

        setIsSubmitting(true)

        try {
            const result = await createJobOrder(
                {
                    customerName: formData.customerName,
                    customerPo: formData.customerPo || undefined,
                    dueDate: formData.dueDate,
                    notes: formData.notes || undefined,
                    items: validItems,
                },
                session?.user?.id
            )

            if (result.success) {
                setIsModalOpen(false)
                loadData()
                resetForm()
            } else {
                setError(result.error || 'เกิดข้อผิดพลาด')
            }
        } catch {
            setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleStatusChange = async (id: string, status: JobStatus) => {
        const result = await updateJobOrderStatus(id, status)
        if (result.success) {
            loadData()
        } else {
            alert(result.error || 'ไม่สามารถอัพเดทสถานะได้')
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('คุณต้องการลบใบสั่งผลิตนี้หรือไม่?')) return

        const result = await deleteJobOrder(id)
        if (result.success) {
            loadData()
        } else {
            alert(result.error || 'ไม่สามารถลบได้')
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        ใบสั่งผลิต
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        จัดการใบสั่งผลิตและติดตามสถานะ
                    </p>
                </div>
                <Button onClick={openCreateModal}>
                    <Plus className="w-4 h-4 mr-2" />
                    สร้างใบสั่งผลิต
                </Button>
            </div>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle>รายการใบสั่งผลิต ({jobOrders.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : jobOrders.length === 0 ? (
                        <TableEmpty
                            message="ยังไม่มีใบสั่งผลิต"
                            icon={<ClipboardList className="w-12 h-12 text-gray-300" />}
                        />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>เลขที่ใบสั่ง</TableHead>
                                    <TableHead>ลูกค้า</TableHead>
                                    <TableHead>PO ลูกค้า</TableHead>
                                    <TableHead>สินค้า</TableHead>
                                    <TableHead>กำหนดส่ง</TableHead>
                                    <TableHead>สถานะ</TableHead>
                                    <TableHead className="w-32">จัดการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {jobOrders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">{order.jobNo}</TableCell>
                                        <TableCell>{order.customerName}</TableCell>
                                        <TableCell>{order.customerPo || '-'}</TableCell>
                                        <TableCell>
                                            <span className="text-sm text-gray-500">
                                                {order.items.length} รายการ
                                            </span>
                                        </TableCell>
                                        <TableCell>{formatDate(order.dueDate)}</TableCell>
                                        <TableCell>
                                            <Select
                                                options={JOB_STATUSES.map((s) => ({ value: s.key, label: s.labelTh }))}
                                                value={order.status}
                                                onChange={(e) => handleStatusChange(order.id, e.target.value as JobStatus)}
                                                className={`text-xs ${getStatusColor(order.status)}`}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => openDetailModal(order)}
                                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(order.id)}
                                                    className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Create Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="สร้างใบสั่งผลิตใหม่"
                size="lg"
            >
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label="ชื่อลูกค้า *"
                                value={formData.customerName}
                                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                                required
                            />
                            <Input
                                label="PO ลูกค้า"
                                value={formData.customerPo}
                                onChange={(e) => setFormData({ ...formData, customerPo: e.target.value })}
                            />
                        </div>

                        <Input
                            label="กำหนดส่ง *"
                            type="date"
                            value={formData.dueDate}
                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                            required
                        />

                        <Textarea
                            label="หมายเหตุ"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={2}
                        />

                        {/* Items */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    รายการสินค้า
                                </label>
                                <Button type="button" variant="ghost" size="sm" onClick={addItem}>
                                    <Plus className="w-4 h-4 mr-1" />
                                    เพิ่มรายการ
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {formData.items.map((item, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <Select
                                            options={products.map((p) => ({
                                                value: p.id,
                                                label: `${p.skuCode} - ${p.nameTh || p.name}`,
                                            }))}
                                            value={item.productId}
                                            onChange={(e) => updateItem(index, 'productId', e.target.value)}
                                            placeholder="เลือกสินค้า"
                                            className="flex-1"
                                        />
                                        <Input
                                            type="number"
                                            min="1"
                                            value={item.qty}
                                            onChange={(e) => updateItem(index, 'qty', Number(e.target.value))}
                                            className="w-24"
                                        />
                                        {formData.items.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeItem(index)}
                                                className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                                <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
                            </div>
                        )}
                    </div>

                    <ModalFooter className="-mx-6 -mb-4 mt-6">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button type="submit" isLoading={isSubmitting}>
                            สร้างใบสั่งผลิต
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>

            {/* Detail Modal */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title={`รายละเอียด - ${selectedOrder?.jobNo}`}
                size="lg"
            >
                {selectedOrder && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-500">ลูกค้า</p>
                                <p className="font-medium">{selectedOrder.customerName}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">PO ลูกค้า</p>
                                <p className="font-medium">{selectedOrder.customerPo || '-'}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">กำหนดส่ง</p>
                                <p className="font-medium">{formatDate(selectedOrder.dueDate)}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">สถานะ</p>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                                    {getStatusLabel(selectedOrder.status)}
                                </span>
                            </div>
                        </div>

                        <div>
                            <p className="text-sm text-gray-500 mb-2">รายการสินค้า</p>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>SKU</TableHead>
                                        <TableHead>ชื่อสินค้า</TableHead>
                                        <TableHead>จำนวน</TableHead>
                                        <TableHead>ขั้นตอนปัจจุบัน</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedOrder.items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.product.skuCode}</TableCell>
                                            <TableCell>{item.product.nameTh || item.product.name}</TableCell>
                                            <TableCell>{item.qty}</TableCell>
                                            <TableCell>
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                                    {getStepLabel(item.currentStep)}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {selectedOrder.notes && (
                            <div>
                                <p className="text-sm text-gray-500">หมายเหตุ</p>
                                <p className="text-sm">{selectedOrder.notes}</p>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    )
}
