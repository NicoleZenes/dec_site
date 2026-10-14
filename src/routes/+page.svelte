<script>
    import { browser } from '$app/environment';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation'; // SvelteKit's router
    import { streamSites, wells, formatStreamName } from '$lib/data/streams';

    //import * as L from 'leaflet';

    let mapContainer;
    let L;

    // Place this inside your <script> block, above onMount
    function getPercentileColor(percentile) {
        // Handle missing or invalid data
        if (percentile === null || percentile === undefined) return '#808080'; // Gray

        // USGS Percentile Classes
        if (percentile <= 10) return '#b12222'; // Dark Red: Much below normal / Severe Drought
        if (percentile <= 25) return '#ffa500'; // Orange: Below normal / Moderate Drought
        if (percentile <= 75) return '#00ff00'; // Green: Normal
        if (percentile <= 90) return '#40e0d0'; // Light Blue: Above normal
        return '#0000ff';                       // Dark Blue: Much above normal (>90%)
    }

    onMount(async () => {
        if (!browser) return;
        
        // Only import Leaflet in the browser
        L = await import('leaflet').then(module => module.default);
        //const cartoKey = import.meta.env.VITE_CARTO_API_KEY;
        const cartoKey = 'cb1_4kuv_1_2615f9dcebd41527138afc0f'
        // Initialize the map
        const map = L.map(mapContainer).setView([42.5, -75.0], 6); // Centered on NY

        // Add the base map tiles
        L.tileLayer(`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${cartoKey}`, {
            attribution: '&copy; OpenStreetMap &copy; CARTO'
        }).addTo(map);

        //define usgs colors for different percentiles
        const usgsColors = [
            '#8b0000', // 0: Record Low
            '#ff0000', // 1: <10%
            '#ffa500', // 2: 10-25%
            '#00ff00', // 3: 25-75%
            '#00ffff', // 4: 75-90%
            '#0000ff', // 5: >90%
            '#000000'  // 6: Record High
        ];

        // Option for USDM colors
        // The 11-tier USDM (U.S. Drought Monitor) Groundwater Palette
        const usdmColors = [
            '#730000', // 0: ≤2% (D4: Exceptional Drought - Dark Red)
            '#e60000', // 1: 2-5% (D3: Extreme Drought - Red)
            '#e69800', // 2: 5-10% (D2: Severe Drought - Orange)
            '#fcd37f', // 3: 10-20% (D1: Moderate Drought - Tan/Peach)
            '#ffff00', // 4: 20-30% (D0: Abnormally Dry - Yellow)
            '#ffffff', // 5: 30-70% (Normal - White)
            '#b4d79e', // 6: 70-80% (Slightly Wet - Light Green)
            '#50a050', // 7: 80-90% (Moderately Wet - Medium Green)
            '#00b0f0', // 8: 90-95% (Severely Wet - Light Blue)
            '#0000ff', // 9: 95-98% (Extremely Wet - Dark Blue)
            '#000080'  // 10: >98% (Exceptionally Wet - Navy)
        ]; 
        // Fetch the json for stream data
        fetch('/api/nrcc')
            .then(response => response.json())
            .then(jsonData => {
                // The JSON has a top-level "data" array based on what you found earlier
                const apiStations = jsonData.data ?? [];
            
                // Loop through your local streams data instead of calculating pixels
                streamSites.forEach(stream => {
                    // Find the corresponding API data for this stream site
                    const apiData = apiStations.find(s => s.siteid === String(stream.usgs_id));
                    console.log('stream', stream.usgs_id, 'matched', apiData, 'usgs=', apiData?.usgs);
                    
                    const color =
                        apiData && typeof apiData.usgs === 'number'
                        ? usgsColors[apiData.usgs] ?? '#808080'
                        : '#808080';

                    // Place marker using exact Lat/Lon (Leaflet handles the pixel math automatically)
                    const marker = L.circleMarker([stream.lat, stream.lon], {
                        radius: 7,
                        color: '#000',
                        weight: 1,
                        fillColor: color,
                        fillOpacity: 0.9
                    }).addTo(map);

                    // Replicate your marker-label functionality using a Leaflet Tooltip
                    marker.bindTooltip(formatStreamName(stream.name), {
                        permanent: false, 
                        direction: 'right',
                        className: 'custom-tooltip'
                    });

                    // Replicate your link behavior using SvelteKit's router
                    marker.on('click', () => {
                        goto(`/streams/${stream.usgs_id}`);
                    });
                        // Loop through your local streams data instead of calculating pixels
                });
            })
            .catch(err => console.error("Failed to fetch NRCC JSON:", err));
        fetch('/api/wells')
            .then(response => response.json())
            .then(jsonData => {
                const wellStations = jsonData.data ?? [];

                wells.forEach(well => {
                    const wellData = wellStations.find(
                        s => String(s.siteid) === String(well.storageId)
                    );

                    const color =
                        apiData && typeof wellData.usgs === 'number'
                        ? usgsColors[wellData.usgs] ?? '#808080'
                        : '#808080';

                    // Place marker using exact Lat/Lon (Leaflet handles the pixel math automatically)
                    const marker = L.circleMarker([well.lat, well.lon], {
                        radius: 7,
                        color: '#000',
                        weight: 1,
                        fillColor: color,
                        fillOpacity: 0.9
                    }).addTo(map);

                // Replicate your marker-label functionality using a Leaflet Tooltip
                marker.bindTooltip(formatStreamName(well.name), {
                    permanent: false, 
                    direction: 'right',
                    className: 'custom-tooltip'
                });

                // Replicate your link behavior using SvelteKit's router
                marker.on('click', () => {
                    goto(`/groundwater/${well.storageId}`);
                });
                });
            })
            .catch(err => console.error("Failed to fetch NRCC JSON:", err));
        // Cleanup on unmount
        return () => {
            map.remove();
        };
    });
    
</script>

<svelte:head>
    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
</svelte:head>

<h1>Welcome to the streamflow forecast website. Please select a stream site from the map below.</h1>

<div bind:this={mapContainer} class="map-container"></div>

<style>
    .map-container {
        width: 80vw;
        height: 70vh; /* Replaces your image aspect ratio */
        border: 2px solid #f80202; /* Kept your visual debugging border */
        border-radius: 8px;
        margin: 0 auto;
        z-index: 1; /* Ensures Leaflet controls don't overlap headers */
    }

    /* You can style the Leaflet tooltip to match your old marker-label */
    :global(.custom-tooltip) {
        background-color: rgba(255, 255, 255, 0.95);
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 16px;
        font-weight: bold;
        border: 1px solid #333;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
</style>