import { getScreens } from '@/lib/actions';
import Dashboard from './Dashboard';

export const dynamic = 'force-dynamic';

export default async function LcdPage() {
    const data = await getScreens();

    return (
        <main>
            <Dashboard initialData={data} />
        </main>
    );
}
