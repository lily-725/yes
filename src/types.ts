export type PointType = 'heritage' | 'incident' | 'landmark';

export interface HistoricalImage {
  url: string;
  name: string;
  source: string;
}

export interface HistoricalPoint {
  id: string;
  position: [number, number];
  title: string;
  description: string;
  images: HistoricalImage[];
  type: PointType;
}

export interface ResidentialArea {
  id: string;
  name: string;
  description: string;
  points: [number, number][];
  images?: HistoricalImage[];
}

export interface OralHistory {
  url: string;
  name: string;
  narrator: string;
  duration?: string;
}

export interface PeriodData {
  id: string;
  label: string;
  subLabel: string;
  audioUrl: string;
  audioLabel: string;
  riverPath: [number, number][];
  railwayPath?: [number, number][];
  roadPath?: [number, number][];
  highlightArea?: [number, number][];
  residentialAreas?: ResidentialArea[];
  points: HistoricalPoint[];
  coverImage?: HistoricalImage;
  historicalImages?: HistoricalImage[];
  oralHistory?: OralHistory;
  evolutionNotes: string;
  surveyorName: string;
}

export interface SelectedFeature {
  type: string;
  title: string;
  description: string;
  images?: HistoricalImage[];
  tag?: string;
  id?: string;
}
