'use client'

import { useState, useEffect, useCallback } from 'react'
import { getWorkQueue, getStepBalance, recordProduction } from '@/actions/production.actions'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmpty } from '@/components/ui/Table'
import { PRODUCTION_STEPS, type ProductionStep } from '@/lib/types'
import { formatDate, getStepColor } from '@/lib/utils'
import { getStepLabel } from '@/lib/types'
import { Play, Settings } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface Product {
    id: string
    skuCode: string
    name: string
    nameTh: string | null
}

interface JobOrder {
    id: string
    jobNo: string
    customerName: string
    dueDate: Date
    status: string
}

interface WorkItem {
    id: string
    productId: string
    qty: number
    currentStep: ProductionStep
    product: Product
    jobOrder: JobOrder
    lastWeight?: number | null
    lastStep?: ProductionStep | null
    lastGoodQty?: number | null
}

export default function ProductionPage() {
    const { data: session } = useSession()

    // Get user role and department from session
    const userRole = session?.user?.role || 'WORKER'
    const userDepartment = session?.user?.department as ProductionStep | null

    // If WORKER, lock to their department; otherwise default to WAX
    const defaultStep = userRole === 'WORKER' && userDepartment ? userDepartment : 'WAX'
    const [selectedStep, setSelectedStep] = useState<ProductionStep>(defaultStep)

    const [workItems, setWorkItems] = useState<WorkItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null)
    const [availableQty, setAvailableQty] = useState(0)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState({
        goodQty: 0,
        scrapQty: 0,
        reworkQty: 0,
        weight: undefined as number | undefined,
        notes: '',
    })

    // Update selectedStep when session changes (for WORKER)
    useEffect(() => {
        if (userRole === 'WORKER' && userDepartment) {
            setSelectedStep(userDepartment)
        }
    }, [userRole, userDepartment])

    const loadWorkQueue = useCallback(async () => {
        setIsLoading(true)
        const result = await getWorkQueue(selectedStep)
        if (result.success && result.data) {
            setWorkItems(result.data as unknown as WorkItem[])
        }
        setIsLoading(false)
    }, [selectedStep])

    useEffect(() => {
        loadWorkQueue()
    }, [loadWorkQueue])

    const openRecordModal = async (item: WorkItem) => {
        setSelectedItem(item)
        setFormData({ goodQty: 0, scrapQty: 0, reworkQty: 0, weight: undefined, notes: '' })
        setError('')

        // Get available quantity
        const balance = await getStepBalance(item.id, selectedStep)
        setAvailableQty(balance)
        setIsModalOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedItem || !session?.user?.id) return

        setError('')
        const total = formData.goodQty + formData.scrapQty + formData.reworkQty

        if (total <= 0) {
            setError('กรุณาระบุจำนวน')
            return
        }

        if (total > availableQty) {
            setError(`จำนวนเกินกว่าที่มีอยู่ (เหลือ ${availableQty} ชิ้น)`)
            return
        }

        setIsSubmitting(true)

        try {
            const result = await recordProduction(
                {
                    jobOrderItemId: selectedItem.id,
                    stepName: selectedStep,
                    goodQty: formData.goodQty,
                    scrapQty: formData.scrapQty,
                    reworkQty: formData.reworkQty,
                    weight: formData.weight,
                    notes: formData.notes || undefined,
                },
                session.user.id
            )

            if (result.success) {
                setIsModalOpen(false)
                loadWorkQueue()
            } else {
                setError(result.error || 'เกิดข้อผิดพลาด')
            }
        } catch {
            setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    บันทึกการผลิต
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    บันทึกผลการผลิตในแต่ละขั้นตอน
                </p>
            </div>

            {/* Step Selector - Hidden for WORKER, they only see their department */}
            {userRole === 'WORKER' ? (
                <div className="flex items-center gap-3">
                    <span className="text-gray-600 dark:text-gray-400">แผนกของคุณ:</span>
                    <span className={`px-4 py-2 rounded-xl text-sm font-medium text-white shadow-lg ${getStepColor(selectedStep)}`}>
                        {getStepLabel(selectedStep)}
                    </span>
                </div>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {PRODUCTION_STEPS.filter(step => step.key !== 'FINISHED').map((step) => (
                        <button
                            key={step.key}
                            onClick={() => setSelectedStep(step.key)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedStep === step.key
                                ? `${getStepColor(step.key)} text-white shadow-lg`
                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                                }`}
                        >
                            {step.labelTh}
                        </button>
                    ))}
                </div>
            )}

            {/* Work Queue */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${getStepColor(selectedStep)}`} />
                        งานที่รอ - {getStepLabel(selectedStep)} ({workItems.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : workItems.length === 0 ? (
                        <TableEmpty
                            message="ไม่มีงานในขั้นตอนนี้"
                            icon={<Settings className="w-12 h-12 text-gray-300" />}
                        />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>เลขที่ใบสั่ง</TableHead>
                                    <TableHead>ลูกค้า</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>ชื่อสินค้า</TableHead>
                                    <TableHead>จำนวนรับ</TableHead>
                                    <TableHead>น้ำหนักรับ (g.)</TableHead>
                                    <TableHead>กำหนดส่ง</TableHead>
                                    <TableHead className="w-24">บันทึก</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {workItems.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.jobOrder.jobNo}</TableCell>
                                        <TableCell>{item.jobOrder.customerName}</TableCell>
                                        <TableCell>{item.product.skuCode}</TableCell>
                                        <TableCell>{item.product.nameTh || item.product.name}</TableCell>
                                        <TableCell>
                                            {item.lastGoodQty ?? item.qty}
                                        </TableCell>
                                        <TableCell>
                                            {item.lastWeight ? (
                                                <span className="text-indigo-600 font-medium">{item.lastWeight.toFixed(2)} g</span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>{formatDate(item.jobOrder.dueDate)}</TableCell>
                                        <TableCell>
                                            <Button
                                                size="sm"
                                                onClick={() => openRecordModal(item)}
                                            >
                                                <Play className="w-3 h-3 mr-1" />
                                                บันทึก
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Record Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={`บันทึกการผลิต - ${getStepLabel(selectedStep)}`}
                size="md"
            >
                {selectedItem && (
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            {/* Item Info */}
                            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-500">ใบสั่งผลิต</p>
                                        <p className="font-medium">{selectedItem.jobOrder.jobNo}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">สินค้า</p>
                                        <p className="font-medium">{selectedItem.product.skuCode}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">จำนวนทั้งหมด</p>
                                        <p className="font-medium">{selectedItem.qty} ชิ้น</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">จำนวนที่ทำได้</p>
                                        <p className="font-bold text-indigo-600">{availableQty} ชิ้น</p>
                                    </div>
                                </div>
                            </div>

                            {/* Quantity Inputs */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <Input
                                    label="ดี (ชิ้น)"
                                    type="number"
                                    min="0"
                                    max={availableQty}
                                    value={formData.goodQty}
                                    onChange={(e) => setFormData({ ...formData, goodQty: Number(e.target.value) })}
                                    className="text-center"
                                />
                                <Input
                                    label="น้ำหนัก (g.)"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.weight || ''}
                                    onChange={(e) => setFormData({ ...formData, weight: e.target.value ? Number(e.target.value) : undefined })}
                                    className="text-center"
                                />
                                <Input
                                    label="เสีย (ชิ้น)"
                                    type="number"
                                    min="0"
                                    max={availableQty}
                                    value={formData.scrapQty}
                                    onChange={(e) => setFormData({ ...formData, scrapQty: Number(e.target.value) })}
                                    className="text-center"
                                />
                                <Input
                                    label="แก้ไข (ชิ้น)"
                                    type="number"
                                    min="0"
                                    max={availableQty}
                                    value={formData.reworkQty}
                                    onChange={(e) => setFormData({ ...formData, reworkQty: Number(e.target.value) })}
                                    className="text-center"
                                />
                            </div>

                            <div className="text-sm text-gray-500 text-center">
                                รวม: {formData.goodQty + formData.scrapQty + formData.reworkQty} / {availableQty} ชิ้น
                            </div>

                            <Textarea
                                label="หมายเหตุ"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows={2}
                            />

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
                                บันทึก
                            </Button>
                        </ModalFooter>
                    </form>
                )}
            </Modal>
        </div>
    )
}
