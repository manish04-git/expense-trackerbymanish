import { where } from 'firebase/firestore'
import { createItem, deleteItem, hasAnyWhere, updateItem } from '@/services/firebase/firestore.service'

export const createCategory = (uid, v) => createItem(uid, 'categories', { ...v, isDefault: false })

export const updateCategory = (uid, cat, v) =>
  updateItem(uid, 'categories', cat.id, { name: v.name, type: cat.type, icon: v.icon, color: v.color, isDefault: cat.isDefault ?? false })

export async function deleteCategory(uid, categoryId) {
  if (await hasAnyWhere(uid, 'transactions', where('categoryId', '==', categoryId))) {
    throw Object.assign(new Error('in-use'), { userMessage: 'This category is used by transactions. Edit it instead of deleting.' })
  }
  await deleteItem(uid, 'categories', categoryId)
}
