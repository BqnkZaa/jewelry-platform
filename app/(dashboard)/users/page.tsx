'use client'

import { useState, useEffect } from 'react'
import { getUsers, createUser, updateUser, deleteUser } from '@/actions/user.actions'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmpty } from '@/components/ui/Table'
import { USER_ROLES, PRODUCTION_STEPS, type UserRole, type ProductionStep } from '@/lib/types'
import { getRoleLabel, getStepLabel } from '@/lib/types'
import { Plus, Pencil, Trash2, Users } from 'lucide-react'

interface User {
    id: string
    email: string | null
    username: string | null
    fullName: string | null
    role: UserRole
    department: ProductionStep | null
    createdAt: Date
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [formData, setFormData] = useState({ email: '', username: '', password: '', fullName: '', role: 'WORKER' as UserRole, department: '' as ProductionStep | '' })

    const loadUsers = async () => { setIsLoading(true); const r = await getUsers(); if (r.success && r.data) setUsers(r.data as User[]); setIsLoading(false) }
    useEffect(() => { loadUsers() }, [])

    const resetForm = () => { setFormData({ email: '', username: '', password: '', fullName: '', role: 'WORKER', department: '' }); setEditingUser(null); setError('') }
    const openCreateModal = () => { resetForm(); setIsModalOpen(true) }
    const openEditModal = (user: User) => { setEditingUser(user); setFormData({ email: user.email || '', username: user.username || '', password: '', fullName: user.fullName || '', role: user.role, department: user.department || '' }); setIsModalOpen(true) }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError(''); setIsSubmitting(true)
        try {
            const data = { ...formData, department: formData.department || undefined, password: formData.password || undefined }
            const r = editingUser ? await updateUser(editingUser.id, data) : await createUser(data as Parameters<typeof createUser>[0])
            if (r.success) { setIsModalOpen(false); loadUsers(); resetForm() } else setError(r.error || 'เกิดข้อผิดพลาด')
        } catch { setError('เกิดข้อผิดพลาด') } finally { setIsSubmitting(false) }
    }

    const handleDelete = async (id: string) => { if (!confirm('ลบผู้ใช้นี้?')) return; const r = await deleteUser(id); if (r.success) loadUsers(); else alert(r.error) }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">จัดการผู้ใช้</h1><p className="text-gray-500 mt-1">จัดการผู้ใช้งานในระบบ</p></div>
                <Button onClick={openCreateModal}><Plus className="w-4 h-4 mr-2" />เพิ่มผู้ใช้</Button>
            </div>
            <Card>
                <CardHeader><CardTitle>รายการผู้ใช้ ({users.length})</CardTitle></CardHeader>
                <CardContent className="p-0">
                    {isLoading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div> : users.length === 0 ? <TableEmpty message="ยังไม่มีผู้ใช้" icon={<Users className="w-12 h-12 text-gray-300" />} /> : (
                        <Table className="mobile-card-table">
                            <TableHeader><TableRow><TableHead>ชื่อ</TableHead><TableHead className="hide-on-mobile">อีเมล</TableHead><TableHead className="hide-on-mobile">ชื่อผู้ใช้</TableHead><TableHead>บทบาท</TableHead><TableHead className="hide-on-mobile">แผนก</TableHead><TableHead className="w-24">จัดการ</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {users.map((u) => (
                                    <TableRow key={u.id}>
                                        <TableCell data-label="ชื่อ" className="font-medium">{u.fullName || '-'}</TableCell>
                                        <TableCell data-label="อีเมล" className="hide-on-mobile">{u.email || '-'}</TableCell>
                                        <TableCell data-label="ชื่อผู้ใช้" className="hide-on-mobile">{u.username || '-'}</TableCell>
                                        <TableCell data-label="บทบาท"><span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">{getRoleLabel(u.role)}</span></TableCell>
                                        <TableCell data-label="แผนก" className="hide-on-mobile">{u.department ? getStepLabel(u.department) : '-'}</TableCell>
                                        <TableCell data-label="จัดการ"><div className="flex gap-1"><button onClick={() => openEditModal(u)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"><Pencil className="w-4 h-4" /></button><button onClick={() => handleDelete(u.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600"><Trash2 className="w-4 h-4" /></button></div></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingUser ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้'} size="md">
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <Input label="ชื่อ-นามสกุล" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input label="อีเมล" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                            <Input label="ชื่อผู้ใช้" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
                        </div>
                        <Input label={editingUser ? 'รหัสผ่านใหม่ (ว่างไว้หากไม่เปลี่ยน)' : 'รหัสผ่าน *'} type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required={!editingUser} />
                        <div className="grid grid-cols-2 gap-4">
                            <Select label="บทบาท" options={USER_ROLES.map((r) => ({ value: r.key, label: r.labelTh }))} value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })} />
                            <Select label="แผนก" options={[{ value: '', label: 'ไม่ระบุ' }, ...PRODUCTION_STEPS.map((s) => ({ value: s.key, label: s.labelTh }))]} value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value as ProductionStep | '' })} />
                        </div>
                        {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200"><p className="text-sm text-rose-600">{error}</p></div>}
                    </div>
                    <ModalFooter className="-mx-6 -mb-4 mt-6"><Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>ยกเลิก</Button><Button type="submit" isLoading={isSubmitting}>{editingUser ? 'บันทึก' : 'เพิ่ม'}</Button></ModalFooter>
                </form>
            </Modal>
        </div>
    )
}
