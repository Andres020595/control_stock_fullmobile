import { NextResponse } from 'next/server';
import { getProductsFromSheet } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const products = await getProductsFromSheet();
        return NextResponse.json(products);
    } catch (error) {
        console.error('[API LCD] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}
