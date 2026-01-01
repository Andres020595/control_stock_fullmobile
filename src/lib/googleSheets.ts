import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || '';
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
const GOOGLE_PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

const serviceAccountAuth = new JWT({
    email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: GOOGLE_PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

export interface SheetProduct {
    Marca: string;
    Modelo_LCD: string;
    Precio: number;
    Stock: number;
}

async function getSheet() {
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    return doc.sheetsByIndex[0];
}

export async function getProductsFromSheet(): Promise<SheetProduct[]> {
    if (!SPREADSHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
        console.warn('Google Sheets credentials missing. Returning empty array.');
        return [];
    }

    try {
        const sheet = await getSheet();
        const rows = await sheet.getRows();

        return rows.map(row => ({
            Marca: row.get('Marca') || '',
            Modelo_LCD: row.get('Modelo_LCD') || '',
            Precio: parseFloat(row.get('Precio')) || 0,
            Stock: parseInt(row.get('Stock')) || 0,
        })).filter(p => p.Marca && p.Modelo_LCD);
    } catch (error) {
        console.error('Error fetching products from Google Sheets:', error);
        return [];
    }
}

export async function addProductToSheet(product: SheetProduct) {
    try {
        const sheet = await getSheet();
        await sheet.addRow({
            Marca: product.Marca,
            Modelo_LCD: product.Modelo_LCD,
            Precio: product.Precio,
            Stock: product.Stock
        });
    } catch (error) {
        console.error('Error adding product to Google Sheets:', error);
        throw error;
    }
}

export async function updateProductsInSheet(products: SheetProduct[]) {
    try {
        const sheet = await getSheet();

        // Clear all rows except header
        await sheet.clearRows();

        // Add all products
        await sheet.addRows(products.map(p => ({
            Marca: p.Marca,
            Modelo_LCD: p.Modelo_LCD,
            Precio: p.Precio,
            Stock: p.Stock
        })));
    } catch (error) {
        console.error('Error updating Google Sheets:', error);
        throw error;
    }
}
