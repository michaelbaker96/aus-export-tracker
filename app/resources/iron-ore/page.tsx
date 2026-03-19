import ironOreData from '@/public/data/iron-ore.json';
import ResourceStatPage from '@/components/ResourceStatPage';
import type { ResourceData } from '@/types';

export const metadata = {
  title: 'Iron Ore Exports — Aus Export Tracker',
  description:
    "Detailed statistics on Australia's iron ore export volumes, revenues, royalties, and corporate tax by destination country.",
  openGraph: {
    title: 'Iron Ore Exports — Aus Export Tracker',
    description:
      "Detailed statistics on Australia's iron ore export volumes, revenues, royalties, and corporate tax by destination country.",
    type: 'website',
  },
};

export default function IronOrePage() {
  return <ResourceStatPage data={ironOreData as ResourceData} accent="#ffd799" />;
}
