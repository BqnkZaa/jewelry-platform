'use client'

import { useState, useEffect } from 'react'
import { getProducts, createProduct, updateProduct, deleteProduct } from '@/actions/product.actions'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input, Textarea } from '@/components/ui/Input'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmpty } from '@/components/ui/Table'
import { PRODUCTION_STEPS, type ProductionStep, type ProductFormData } from '@/lib/types'
import { Plus, Pencil, Trash2, Package } from 'lucide-react'

interface Product {
    id: string
    skuCode: string
    name: string
    nameTh: string | null
    description: string | null
    imageUrl: string | null
    weightGrams: unknown
    priceFinished: unknown
    steps: ProductionStep[]
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

export default function SKUMasterPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState<ProductFormData>({
        skuCode: '',
        name: '',
        nameTh: '',
        description: '',
        imageUrl: '',
        weightGrams: undefined,
        priceFinished: undefined,
        steps: PRODUCTION_STEPS.map((s) => s.key),
        isActive: true,
    })

    const loadProducts = async () => {
        setIsLoading(true)
        const result = await getProducts()
        if (result.success && result.data) {
            setProducts(result.data as Product[])
        }
        setIsLoading(false)
    }

    useEffect(() => {
        loadProducts()
    }, [])

    const resetForm = () => {
        setFormData({
            skuCode: '',
            name: '',
            nameTh: '',
            description: '',
            imageUrl: '',
            weightGrams: undefined,
            priceFinished: undefined,
            steps: PRODUCTION_STEPS.map((s) => s.key),
            isActive: true,
        })
        setEditingProduct(null)
        setError('')
    }

    const openCreateModal = () => {
        resetForm()
        setIsModalOpen(true)
    }

    const openEditModal = (product: Product) => {
        setEditingProduct(product)
        setFormData({
            skuCode: product.skuCode,
            name: product.name,
            nameTh: product.nameTh || '',
            description: product.description || '',
            imageUrl: product.imageUrl || '',
            weightGrams: product.weightGrams ? Number(product.weightGrams) : undefined,
            priceFinished: product.priceFinished ? Number(product.priceFinished) : undefined,
            steps: product.steps,
            isActive: product.isActive,
        })
        setIsModalOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsSubmitting(true)

        try {
            const result = editingProduct
                ? await updateProduct(editingProduct.id, formData)
                : await createProduct(formData)

            if (result.success) {
                setIsModalOpen(false)
                loadProducts()
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

    const handleDelete = async (id: string) => {
        if (!confirm('คุณต้องการลบสินค้านี้หรือไม่?')) return

        const result = await deleteProduct(id)
        if (result.success) {
            loadProducts()
        } else {
            alert(result.error || 'ไม่สามารถลบได้')
        }
    }

    const toggleStep = (step: ProductionStep) => {
        setFormData((prev) => ({
            ...prev,
            steps: prev.steps.includes(step)
                ? prev.steps.filter((s) => s !== step)
                : [...prev.steps, step].sort((a, b) => {
                    const orderA = PRODUCTION_STEPS.find((s) => s.key === a)?.order || 0
                    const orderB = PRODUCTION_STEPS.find((s) => s.key === b)?.order || 0
                    return orderA - orderB
                }),
        }))
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        SKU สินค้า
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        จัดการรายการสินค้าและขั้นตอนการผลิต
                    </p>
                </div>
                <Button onClick={openCreateModal}>
                    <Plus className="w-4 h-4 mr-2" />
                    เพิ่ม SKU
                </Button>
            </div>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle>รายการ SKU ทั้งหมด ({products.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : products.length === 0 ? (
                        <TableEmpty
                            message="ยังไม่มีสินค้า"
                            icon={<Package className="w-12 h-12 text-gray-300" />}
                        />
                    ) : (
                        <Table className="mobile-card-table">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>รหัส SKU</TableHead>
                                    <TableHead>ชื่อสินค้า</TableHead>
                                    <TableHead className="hide-on-mobile">ชื่อไทย</TableHead>
                                    <TableHead className="hide-on-mobile">ขั้นตอน</TableHead>
                                    <TableHead>สถานะ</TableHead>
                                    <TableHead className="w-24">จัดการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {products.map((product) => (
                                    <TableRow key={product.id}>
                                        <TableCell data-label="SKU" className="font-medium">{product.skuCode}</TableCell>
                                        <TableCell data-label="ชื่อ">{product.name}</TableCell>
                                        <TableCell data-label="ชื่อไทย" className="hide-on-mobile">{product.nameTh || '-'}</TableCell>
                                        <TableCell data-label="ขั้นตอน" className="hide-on-mobile">
                                            <span className="text-sm text-gray-500">
                                                {product.steps.length} ขั้นตอน
                                            </span>
                                        </TableCell>
                                        <TableCell data-label="สถานะ">
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs font-medium ${product.isActive
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                    }`}
                                            >
                                                {product.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                                            </span>
                                        </TableCell>
                                        <TableCell data-label="จัดการ">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => openEditModal(product)}
                                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product.id)}
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

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingProduct ? 'แก้ไข SKU' : 'เพิ่ม SKU ใหม่'}
                size="lg"
            >
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label="รหัส SKU *"
                                value={formData.skuCode}
                                onChange={(e) => setFormData({ ...formData, skuCode: e.target.value })}
                                required
                            />
                            <Input
                                label="ชื่อสินค้า (EN) *"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>

                        <Input
                            label="ชื่อสินค้า (TH)"
                            value={formData.nameTh || ''}
                            onChange={(e) => setFormData({ ...formData, nameTh: e.target.value })}
                        />

                        <Textarea
                            label="รายละเอียด"
                            value={formData.description || ''}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label="น้ำหนัก (กรัม)"
                                type="number"
                                step="0.01"
                                value={formData.weightGrams || ''}
                                onChange={(e) =>
                                    setFormData({ ...formData, weightGrams: e.target.value ? Number(e.target.value) : undefined })
                                }
                            />
                            <Input
                                label="ราคาสำเร็จ (บาท)"
                                type="number"
                                step="0.01"
                                value={formData.priceFinished || ''}
                                onChange={(e) =>
                                    setFormData({ ...formData, priceFinished: e.target.value ? Number(e.target.value) : undefined })
                                }
                            />
                        </div>

                        {/* Steps Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                ขั้นตอนการผลิต
                            </label>
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                {PRODUCTION_STEPS.map((step) => (
                                    <label
                                        key={step.key}
                                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${formData.steps.includes(step.key)
                                            ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-900/20'
                                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.steps.includes(step.key)}
                                            onChange={() => toggleStep(step.key)}
                                            className="rounded text-indigo-600"
                                        />
                                        <span className="text-sm">{step.labelTh}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Active Status */}
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="rounded text-indigo-600"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">ใช้งาน</span>
                        </label>

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
                            {editingProduct ? 'บันทึก' : 'เพิ่ม SKU'}
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>
        </div>
    )
}
