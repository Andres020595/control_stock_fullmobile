'use server';

import { readDb, writeDb, ScreenData } from './db';
import { revalidatePath } from 'next/cache';
import { logAction } from './logger';

export async function getScreens() {
    return await readDb();
}

export async function updateScreens(data: ScreenData[], userEmail: string) {
    await writeDb(data);
    await logAction(userEmail, 'UPDATE_ITEMS', { count: data.length });
    revalidatePath('/lcd');
}

export async function addScreen(item: ScreenData, userEmail: string) {
    const data = await readDb();
    data.push(item);
    await writeDb(data);
    await logAction(userEmail, 'ADD_ITEM', item);
    revalidatePath('/lcd');
}
