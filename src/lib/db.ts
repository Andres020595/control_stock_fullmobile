import fs from 'fs-extra';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const DB_DIR = process.env.DB_PATH || process.cwd();
const MAX_VERSIONS = 5;

export interface ScreenData {
    Marca: string;
    Modelo_LCD: string;
    Precio: number;
    Stock: number;
}

interface FileWithTime {
    name: string;
    path: string;
    time: number;
}

export async function getLatestDbFile() {
    const files = await fs.readdir(DB_DIR);
    const dbFiles: { name: string; time: number }[] = files
        .filter(f => f.startsWith('BD_LCD') && f.endsWith('.csv'))
        .map(f => ({
            name: f,
            time: fs.statSync(path.join(DB_DIR, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

    return dbFiles.length > 0 ? dbFiles[0].name : 'BD_LCD.csv';
}

export async function readDb(): Promise<ScreenData[]> {
    const latestFile = await getLatestDbFile();
    const filePath = path.join(DB_DIR, latestFile);

    if (!await fs.pathExists(filePath)) {
        return [];
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        cast: (value: string, context: any) => {
            if (context.column === 'Precio') return parseFloat(value) || 0;
            return value;
        }
    });

    return records as ScreenData[];
}

export async function writeDb(data: ScreenData[]) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const newFileName = `BD_LCD_${timestamp}.csv`;
    const filePath = path.join(DB_DIR, newFileName);

    const output = stringify(data, { header: true });
    await fs.writeFile(filePath, output);

    // Maintain max versions (only those with timestamp)
    const files = await fs.readdir(DB_DIR);
    const dbFiles: FileWithTime[] = files
        .filter(f => f.startsWith('BD_LCD_') && f.endsWith('.csv'))
        .map(f => ({
            name: f,
            path: path.join(DB_DIR, f),
            time: fs.statSync(path.join(DB_DIR, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

    if (dbFiles.length > MAX_VERSIONS) {
        const toDelete = dbFiles.slice(MAX_VERSIONS);
        for (const file of toDelete) {
            await fs.remove(file.path);
        }
    }

    return newFileName;
}
