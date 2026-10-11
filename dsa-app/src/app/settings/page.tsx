import { SettingsView } from '@/components/settings/settings-view';

export const metadata = {
  title: 'Settings & Preferences | DSA Platform',
  description: 'Manage study goals, programming language preferences, and visual theme.'
};

export default function SettingsPage() {
  return <SettingsView />;
}
