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

        // Initialize the map
        const map = L.map(mapContainer).setView([42.5, -75.0], 6); // Centered on NY

        // Add the base map tiles
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO'
        }).addTo(map);

        // Loop through your local streams data instead of calculating pixels
        streamSites.forEach(stream => {
            // Place marker using exact Lat/Lon (Leaflet handles the pixel math automatically)
            const marker = L.circleMarker([stream.lat, stream.lon], {
                radius: 7,
                color: '#000',
                weight: 1,
                fillColor: getPercentileColor(stream.percentile),
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

        wells.forEach(well => {
            // Place marker using exact Lat/Lon (Leaflet handles the pixel math automatically)
            const marker = L.circleMarker([well.lat, well.lon], {
                radius: 7,
                color: '#000',
                weight: 1,
                fillColor: getPercentileColor(well.percentile),
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