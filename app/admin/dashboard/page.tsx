import { redirect } from 'next/navigation';
import { isAdminAuthenticated } from '../actions';
import DashboardClient from './DashboardClient';

export default async function Dashboard() {
    const isAuth = await isAdminAuthenticated();

    if (!isAuth) {
        redirect('/admin');
    }

    return <DashboardClient />;
}
