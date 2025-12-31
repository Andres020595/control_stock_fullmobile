import { readDb } from '@/lib/db';
import Dashboard from './Dashboard';

export const dynamic = 'force-dynamic';

export default async function LcdPage() {
    const data = await readDb();

    return (
        <main>
            <Dashboard initialData={data} />
        </main>
    );
}
