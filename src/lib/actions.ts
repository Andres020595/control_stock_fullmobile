'use server';

import { ScreenData } from './db';
import { revalidatePath } from 'next/cache';
import { logAction } from './logger';
import { getProductsFromSheet, updateProductsInSheet, addProductToSheet, SheetProduct } from './googleSheets';

export async function getScreens() {
    return await getProductsFromSheet();
}

export async function updateScreens(data: SheetProduct[], userEmail: string, userRole: string) {
    if (userRole === 'viewer') throw new Error('Permission denied');

    await updateProductsInSheet(data);
    await logAction(userEmail, userRole, 'UPDATE_PRODUCTS', { count: data.length });
    revalidatePath('/lcd');
}

export async function addScreen(item: SheetProduct, userEmail: string, userRole: string) {
    if (userRole !== 'admin') throw new Error('Permission denied');

    await addProductToSheet(item);
    await logAction(userEmail, userRole, 'ADD_PRODUCT', item);
    revalidatePath('/lcd');
}

export async function deleteScreen(data: SheetProduct[], userEmail: string, userRole: string, deletedItem: SheetProduct) {
    if (userRole !== 'admin') throw new Error('Permission denied');

    await updateProductsInSheet(data);
    await logAction(userEmail, userRole, 'DELETE_PRODUCT', deletedItem);
    revalidatePath('/lcd');
}
