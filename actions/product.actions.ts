'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import type { ProductFormData, ProductionStep } from '@/lib/types'
import { serializeProduct } from '@/lib/utils'

export async function getProducts(options?: { isActive?: boolean }) {
    try {
        const products = await prisma.product.findMany({
            where: options?.isActive !== undefined ? { isActive: options.isActive } : undefined,
            orderBy: { createdAt: 'desc' },
        })
        const serializedProducts = products.map(serializeProduct)
        return { success: true, data: serializedProducts }
    } catch (error) {
        console.error('Error fetching products:', error)
        return { success: false, error: 'ไม่สามารถดึงข้อมูลสินค้าได้' }
    }
}

export async function getProduct(id: string) {
    try {
        const product = await prisma.product.findUnique({
            where: { id },
        })
        if (!product) {
            return { success: false, error: 'ไม่พบสินค้า' }
        }
        return { success: true, data: serializeProduct(product) }
    } catch (error) {
        console.error('Error fetching product:', error)
        return { success: false, error: 'ไม่สามารถดึงข้อมูลสินค้าได้' }
    }
}

export async function createProduct(data: ProductFormData) {
    try {
        // Check if SKU already exists
        const existing = await prisma.product.findUnique({
            where: { skuCode: data.skuCode },
        })
        if (existing) {
            return { success: false, error: 'รหัส SKU นี้มีอยู่แล้ว' }
        }

        const product = await prisma.product.create({
            data: {
                skuCode: data.skuCode,
                name: data.name,
                nameTh: data.nameTh,
                description: data.description,
                imageUrl: data.imageUrl,
                weightGrams: data.weightGrams,
                priceFinished: data.priceFinished,
                steps: data.steps as ProductionStep[],
                isActive: data.isActive,
            },
        })

        revalidatePath('/sku-master')
        return { success: true, data: serializeProduct(product) }
    } catch (error) {
        console.error('Error creating product:', error)
        return { success: false, error: 'ไม่สามารถสร้างสินค้าได้' }
    }
}

export async function updateProduct(id: string, data: Partial<ProductFormData>) {
    try {
        // Check if updating SKU and if it already exists
        if (data.skuCode) {
            const existing = await prisma.product.findFirst({
                where: { skuCode: data.skuCode, NOT: { id } },
            })
            if (existing) {
                return { success: false, error: 'รหัส SKU นี้มีอยู่แล้ว' }
            }
        }

        const product = await prisma.product.update({
            where: { id },
            data: {
                ...(data.skuCode && { skuCode: data.skuCode }),
                ...(data.name && { name: data.name }),
                ...(data.nameTh !== undefined && { nameTh: data.nameTh }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
                ...(data.weightGrams !== undefined && { weightGrams: data.weightGrams }),
                ...(data.priceFinished !== undefined && { priceFinished: data.priceFinished }),
                ...(data.steps && { steps: data.steps as ProductionStep[] }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
            },
        })

        revalidatePath('/sku-master')
        return { success: true, data: serializeProduct(product) }
    } catch (error) {
        console.error('Error updating product:', error)
        return { success: false, error: 'ไม่สามารถอัพเดทสินค้าได้' }
    }
}

export async function deleteProduct(id: string) {
    try {
        // Check if product is used in any job orders
        const usedInOrders = await prisma.jobOrderItem.findFirst({
            where: { productId: id },
        })
        if (usedInOrders) {
            return { success: false, error: 'ไม่สามารถลบได้ เนื่องจากสินค้านี้ถูกใช้ในใบสั่งผลิต' }
        }

        await prisma.product.delete({
            where: { id },
        })

        revalidatePath('/sku-master')
        return { success: true }
    } catch (error) {
        console.error('Error deleting product:', error)
        return { success: false, error: 'ไม่สามารถลบสินค้าได้' }
    }
}
