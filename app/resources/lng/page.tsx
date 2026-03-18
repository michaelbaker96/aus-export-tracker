import lngData from '@/public/data/lng.json';
import ResourceStatPage from '@/components/ResourceStatPage';
import type { ResourceData } from '@/types';

export const metadata = {
  title: 'LNG Exports — Aus Export Tracker',
  description:
    "Detailed statistics on Australia's LNG export volumes, revenues, royalties, and corporate tax by destination country.",
};

export default function LngPage() {
  return <ResourceStatPage data={lngData as ResourceData} accent="#00bfff" />;
}
