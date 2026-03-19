// Resource types supported by the app
export type ResourceType = "lng" | "iron-ore" | "coal";

// Arc data contract — consumed by MapView, ArcLayer, ArcTooltip, SidePanel
// One record per trade route (Australia -> destination country) for the latest year.
export interface ArcData {
  resourceType: ResourceType;
  originCoordinates: [number, number]; // [longitude, latitude] — point in Western Australia
  destinationCoordinates: [number, number]; // [longitude, latitude]
  destinationCountry: string;
  volumeLatestYear: number; // PJ for LNG; million tonnes (Mt) for iron ore
  exportValueAUD: number; // AUD millions
  royaltiesAUD: number; // AUD millions
  corporateTaxAUD: number; // AUD millions
  costBasisMinAUD: number; // AUD millions — estimated from company annual reports
  costBasisMaxAUD: number; // AUD millions — estimated from company annual reports
}

// Per-destination record within an annual snapshot
export interface DestinationRecord {
  country: string;
  volume: number; // PJ for LNG; Mt for iron ore
  value: number; // AUD millions
  royalties: number; // AUD millions
  tax: number; // AUD millions
}

// Annual record within a resource dataset
export interface AnnualRecord {
  year: number;
  totalVolume: number; // PJ for LNG; Mt for iron ore
  totalValue: number; // AUD millions
  totalRoyalties: number; // AUD millions
  totalCorporateTax: number; // AUD millions
  destinations: DestinationRecord[];
}

// Stat page data contract — consumed by ResourceStatPage, KPICards, SankeyDiagram
// Matches /public/data/{resource}.json
export interface ResourceData {
  resource: ResourceType;
  displayName: string; // e.g. "LNG" or "Iron Ore"
  units: {
    volume: string; // e.g. "PJ (petajoules)" or "million tonnes (Mt)"
    value: string; // always "AUD millions"
  };
  lastUpdated: string; // ISO date string
  sources: string[];
  arcs: ArcData[];
  years: AnnualRecord[];
}
