import coalData from '@/public/data/coal.json';
import ResourceStatPage from '@/components/ResourceStatPage';
import type { ResourceData } from '@/types';

export const metadata = {
  title: 'Coal Exports — Aus Export Tracker',
  description:
    "Detailed statistics on Australia's coal export volumes, revenues, royalties, and corporate tax by destination country.",
  openGraph: {
    title: 'Coal Exports — Aus Export Tracker',
    description:
      "Detailed statistics on Australia's coal export volumes, revenues, royalties, and corporate tax by destination country.",
    type: 'website',
  },
};

export default function CoalPage() {
  return <ResourceStatPage data={coalData as ResourceData} accent="#f59e0b" />;
}
