import { RevisionQueueView } from '@/components/revisions/revision-queue-view';

export const metadata = {
  title: 'Revision Queue | Spaced Repetition',
  description: 'Maintain high retention for coding interviews with an SM-2 spaced repetition queue.'
};

export default function RevisionsPage() {
  return <RevisionQueueView />;
}
