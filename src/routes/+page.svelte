<script>
    import { browser } from '$app/environment';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation'; // SvelteKit's router
    import { streams, formatStreamName } from '$lib/data/streams';

    //import * as L from 'leaflet';

    let mapContainer;
    let L;

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
        streams.forEach(stream => {
            // Place marker using exact Lat/Lon (Leaflet handles the pixel math automatically)
            const marker = L.circleMarker([stream.lat, stream.lon], {
                radius: 6,
                color: '#000',
                weight: 2,
                fillColor: '#3388ff',
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