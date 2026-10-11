import { DashboardView } from '@/components/dashboard/dashboard-view';

export const metadata = {
  title: 'Dashboard | DSA Sheet Platform',
  description: 'Your personalized DSA study dashboard with progress overview, topic tracking, and revision queue.'
};

export default function DashboardPage() {
  return <DashboardView />;
}
