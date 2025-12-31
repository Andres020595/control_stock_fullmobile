'use server';

import { readDb, writeDb, ScreenData } from './db';
import { revalidatePath } from 'next/cache';

export async function getScreens() {
    return await readDb();
}

export async function updateScreens(data: ScreenData[]) {
    await writeDb(data);
    revalidatePath('/lcd');
}

export async function addScreen(item: ScreenData) {
    const data = await readDb();
    data.push(item);
    await writeDb(data);
    revalidatePath('/lcd');
}
