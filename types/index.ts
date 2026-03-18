// Resource types supported by the app
export type ResourceType = 'lng' | 'iron-ore';

// Arc data contract — consumed by ArcLayer, ArcTooltip, SidePanel
export interface ArcData {
  resourceType: ResourceType;
  originCoordinates: [number, number]; // [longitude, latitude]
  destinationCoordinates: [number, number];
  destinationCountry: string;
  volumeLatestYear: number; // PJ for LNG, million tonnes for iron ore
  exportValueAUD: number; // AUD millions
  royaltiesAUD: number; // AUD millions
  corporateTaxAUD: number; // AUD millions
  costBasisMinAUD: number; // estimated, AUD per unit
  costBasisMaxAUD: number; // estimated, AUD per unit
}

// Per-destination record within a year
export interface DestinationRecord {
  country: string;
  coordinates: [number, number];
  volume: number;
  valueAUD: number;
  royaltiesAUD: number;
  corporateTaxAUD: number;
}

// Annual record within a resource dataset
export interface AnnualRecord {
  year: number;
  totalVolume: number;
  totalValue: number;
  totalRoyalties: number;
  totalCorporateTax: number;
  destinations: DestinationRecord[];
}

// Stat page data contract — consumed by ResourceStatPage, KPICards, SankeyDiagram
export interface ResourceData {
  resource: ResourceType;
  displayName: string;
  unit: string; // e.g. "PJ" or "Mt"
  lastUpdated: string; // ISO date string
  sources: string[];
  costBasisNote: string;
  years: AnnualRecord[];
}
