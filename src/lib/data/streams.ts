import streamsCSV from './streams_metadata.csv?raw';
import Papa from 'papaparse';

export interface Stream {
    usgs_id: string;
    lat: number;
    lon: number;
    start_year: number;
    name: string;
}

// Parse the CSV data into an array of Stream objects
const parsedData = Papa.parse<Stream>(streamsCSV, {
    header: true,
    skipEmptyLines: true
});

export const streams: Stream[] = parsedData.data.map((row: any) => ({
    usgs_id: row.usgs_id,
    lat: parseFloat(row.lat),
    lon: parseFloat(row.lon),
    start_year: parseInt(row.start_year, 10),
    name: row.name,
    imagepath: `static/images/forecasts/${getForecastFileName(row.usgs_id, 'YYYY-MM-DD')}`
}));

// Convert to stream forecast file name
// 01529500_forecast_figure_combination_2_weeks_2026-07-26.png
// Date will be passed in as a string in the format YYYY-MM-DD
// wpc is our standard forecast for now
export function getForecastFileName(usgs_id: string, date: string): string{
    return `${usgs_id}_forecast_figure_combination_2_weeks_${date}_wpc.png`;
}

export function getStreamById(usgs_id: string): Stream | undefined {
    return streams.find(stream => stream.usgs_id === usgs_id);
}

// Helper to get an array of dates for the last 14 days
export function getAvailableDates(): string[] {
    const dates: string[] = [];
    const today = new Date();
    
    for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
        dates.push(dateStr);
    }
    
    return dates;
}

export function formatStreamName(name: string): string {
    return name
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

export const precipOptions = [
  { key: 'wpc', label: '7-day Weather Prediction Center, 14-day CFSv2' },
  { key: 'p10', label: 'ECMWF Ensemble 10th percentile' },
  { key: 'p90', label: 'ECMWF Ensemble 90th percentile' },
  { key: 'mean', label: 'ECMWF Ensemble Mean' },
  { key: 'control', label: 'ECMWF Control' }
];

export function getPrecipFileName(usgs_id: string, optionKey: string, date: string): string {
  // returns filename only; caller composes path. adjust format to your real files
  // 04269000_forecast_figure_combination_2_weeks_2026-09-06_p10.png
  return `${usgs_id}_forecast_figure_combination_2_weeks_${date}_${optionKey}.png`;
}