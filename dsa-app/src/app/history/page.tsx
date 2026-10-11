import { PracticeHistoryView } from '@/components/history/practice-history-view';

export const metadata = {
  title: 'Practice History | DSA Platform',
  description: 'Review your complete timeline of practice attempts, reflections, and solving times.'
};

export default function HistoryPage() {
  return <PracticeHistoryView />;
}
