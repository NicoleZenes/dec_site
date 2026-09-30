
// Function to hold pixel information for the map
export const mapConfig = {
    imageWidth: 3205,
    imageHeight: 2964,
    minLat: 40.44225147,
    maxLat: 45.14603288,
    minLon: -79.07943197,
    maxLon: -72.38254023
};

//Equations to convert lat/lon to pixel coordinates
export const latLonToPixel = (lat: number, lon: number, pixelWidth: number, pixelHeight: number): { x: number; y: number } => {
    const x = ((lon - mapConfig.minLon) / (mapConfig.maxLon - mapConfig.minLon)) * pixelWidth;
    const y = ((mapConfig.maxLat - lat) / (mapConfig.maxLat - mapConfig.minLat)) * pixelHeight;
    
    return { x, y };
}