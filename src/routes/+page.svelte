<script>
    import { browser } from '$app/environment';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation'; // SvelteKit's router
    import { streamSites, wells, formatStreamName } from '$lib/data/streams';

    //import * as L from 'leaflet';

    let streamsMapContainer;
    let wellsMapContainer;
    let usdmMapContainer;
    let L;

    // // Place this inside your <script> block, above onMount
    // function getPercentileColor(percentile) {
    //     // Handle missing or invalid data
    //     if (percentile === null || percentile === undefined) return '#808080'; // Gray

    //     // USGS Percentile Classes
    //     if (percentile <= 10) return '#b12222'; // Dark Red: Much below normal / Severe Drought
    //     if (percentile <= 25) return '#ffa500'; // Orange: Below normal / Moderate Drought
    //     if (percentile <= 75) return '#00ff00'; // Green: Normal
    //     if (percentile <= 90) return '#40e0d0'; // Light Blue: Above normal
    //     return '#0000ff';                       // Dark Blue: Much above normal (>90%)
    // }

    function makeTriangleIcon(color) {
        return L.divIcon({
            className: 'triangle-marker',
            html: `
            <svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
                <path
                d="M11 2 L19 18 L3 18 Z"
                fill="${color}"
                stroke="#000000"
                stroke-width="1.5"
                stroke-linejoin="round"
                />
            </svg>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 18],
            popupAnchor: [0, -18]
        });
        }

    function initializeMap(container, isStreams, isWells) {
        
        //const cartoKey = import.meta.env.VITE_CARTO_API_KEY;
        const cartoKey = 'cb1_4kuv_1_2615f9dcebd41527138afc0f'
        const map = L.map(container, {scrollWheelZoom: false }).setView([42.8, -75.7], 6.25); // Centered on NY only

        L.tileLayer(`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=cb1_4kuv_1_2615f9dcebd41527138afc0f`, {
            attribution: '&copy; OpenStreetMap &copy; CARTO'
        }).addTo(map);

        // Fetch and filter county boundaries to NY only
        fetch('/geojson/Northeast_County_Boundaries.geojson')
            .then(response => response.json())
            .then(geoData => {
                const nyCounties = {
                    ...geoData,
                    features: geoData.features.filter(f => f.properties.STATEFP === '36') // Adjust property name as needed
                };
                L.geoJSON(nyCounties, {
                    style: {
                        color: '#D3D3D3',
                        weight: 1,
                        fillOpacity: 0,
                        interactive: false
                    }
                }).addTo(map);
            });
        // Add NY state boundary
        fetch('/geojson/us-states.geojson')
            .then(response => response.json())
            .then(stateData => {
                const nyState = stateData.features.find(f => f.properties.name === 'New York');
                if (nyState) {
                    L.geoJSON(nyState, {
                        style: {
                            color: '#000000',
                            weight: 2,
                            fillOpacity: 0,
                            interactive: false
                        }
                    }).addTo(map);
                }
            });

        const usgsColors = [
            '#ff0000', '#8b0000', '#ffa500', '#00ff00', '#00ffff', '#0000ff', '#000000'
        ];
 if (isStreams) {
            // Streams map
            fetch('/api/nrcc')
                .then(response => response.json())
                .then(jsonData => {
                    const apiStations = jsonData.data ?? [];
                    streamSites.forEach(stream => {
                        const apiData = apiStations.find(s => s.siteid === String(stream.usgs_id));
                        const color = apiData && typeof apiData.usgs === 'number' ? usgsColors[apiData.usgs] ?? '#808080' : '#808080';

                        const marker = L.circleMarker([stream.lat, stream.lon], {
                            radius: 7, color: '#000', weight: 1, fillColor: color, fillOpacity: 0.9
                        }).addTo(map);

                        marker.bindTooltip(formatStreamName(stream.name), { permanent: false, direction: 'right', className: 'custom-tooltip' });
                        marker.on('click', () => goto(`/streams/${stream.usgs_id}`));
                    });
                });
        } else if (isWells) {
            // Wells map
            fetch('/api/wells')
                .then(response => response.json())
                .then(jsonData => {
                    const wellStations = jsonData.data ?? [];
                    wells.forEach(well => {
                        const wellData = wellStations.find(s => String(s.siteid) === String(well.storageId));
                        const color = wellData && typeof wellData.usgs === 'number' ? usgsColors[wellData.usgs] ?? '#808080' : '#808080';

                        const marker = L.marker([well.lat, well.lon], { icon: makeTriangleIcon(color) }).addTo(map);
                        marker.bindTooltip(formatStreamName(well.name), { permanent: false, direction: 'right', className: 'custom-tooltip' });
                        marker.on('click', () => goto(`/groundwater/${well.storageId}`));
                    });
                });
        } 

        // Add legend
        const legend = L.control({ position: 'bottomright' });
        legend.onAdd = function () {
            const div = L.DomUtil.create('div', 'info legend');
            const labels = ['Low','≤10%', '11-25%', '26-75%', '76-90%', '>90%', 'High'];
            const colors = ['#ff0000','#8b0000',  '#ffa500', '#00ff00', '#00ffff', '#0000ff', '#000000'];
            div.innerHTML = '<h4 style="margin: 0 0 8px 0;">Percentile</h4>';
            labels.forEach((label, i) => {
                div.innerHTML += `<div style="display:flex; align-items:center; margin-bottom:4px;"><span style="display:inline-block; width:14px; height:14px; background:${colors[i]}; border:1px solid #333; border-radius:50%; margin-right:8px;"></span><span>${label}</span></div>`;
            });
            return div;
        };
        legend.addTo(map);

        return map;
    }
    onMount(async () => {
        if (!browser) return;
        
        // Only import Leaflet in the browser
        L = await import('leaflet').then(module => module.default);
        //const cartoKey = import.meta.env.VITE_CARTO_API_KEY;
        // const cartoKey = 'cb1_4kuv_1_2615f9dcebd41527138afc0f'
        // // Initialize the map
        // const map = L.map(streamsMapContainer).setView([42.5, -75.0], 6); // Centered on NY

        // // Add the base map tiles
        // L.tileLayer(`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${cartoKey}`, {
        //     attribution: '&copy; OpenStreetMap &copy; CARTO'
        // }).addTo(map);

        // // Get the county boundaries (GeoJSON) 
        // fetch('/geojson/Northeast_County_Boundaries.geojson')
        //         .then(response => response.json())
        //         .then(geoData => {
        //             // Add the state boundaries to the map
        //             L.geoJSON(geoData, {
        //                 style: {
        //                     color: '#D3D3D3',
        //                     weight: 1,
        //                     fillOpacity: 0,
        //                     interactive: false
        //                 }
        //             }).addTo(map);
        //         });

        // // get and filter stae boundaries for NY 
        // fetch('/geojson/us-states.geojson')
        //     .then(response => response.json())
        //     .then(stateData => {
        //         const nyState = stateData.features.find(f => f.properties.name === 'New York');
        //         if (nyState) {
        //             L.geoJSON(nyState, {
        //                 style: {
        //                     color: '#000000',
        //                     weight: 2,
        //                     fillOpacity: 0,
        //                     interactive: false
        //                 }
        //             }).addTo(map);
        //         }
        //     });
        //define usgs colors for different percentiles
        // const usgsColors = [
        //     '#8b0000', // 0: Record Low
        //     '#ff0000', // 1: <10%
        //     '#ffa500', // 2: 10-25%
        //     '#00ff00', // 3: 25-75%
        //     '#00ffff', // 4: 75-90%
        //     '#0000ff', // 5: >90%
        //     '#000000'  // 6: Record High
        // ];

        // // Option for USDM colors
        // // The 11-tier USDM (U.S. Drought Monitor) Groundwater Palette
        // const usdmColors = [
        //     '#730000', // 0: ≤2% (D4: Exceptional Drought - Dark Red)
        //     '#e60000', // 1: 2-5% (D3: Extreme Drought - Red)
        //     '#e69800', // 2: 5-10% (D2: Severe Drought - Orange)
        //     '#fcd37f', // 3: 10-20% (D1: Moderate Drought - Tan/Peach)
        //     '#ffff00', // 4: 20-30% (D0: Abnormally Dry - Yellow)
        //     '#ffffff', // 5: 30-70% (Normal - White)
        //     '#b4d79e', // 6: 70-80% (Slightly Wet - Light Green)
        //     '#50a050', // 7: 80-90% (Moderately Wet - Medium Green)
        //     '#00b0f0', // 8: 90-95% (Severely Wet - Light Blue)
        //     '#0000ff', // 9: 95-98% (Extremely Wet - Dark Blue)
        //     '#000080'  // 10: >98% (Exceptionally Wet - Navy)
        // ]; 
        // Fetch the json for stream data
        // fetch('/api/nrcc')
        //     .then(response => response.json())
        //     .then(jsonData => {
        //         // The JSON has a top-level "data" array based on what you found earlier
        //         const apiStations = jsonData.data ?? [];
            
        //         // Loop through your local streams data instead of calculating pixels
        //         streamSites.forEach(stream => {
        //             // Find the corresponding API data for this stream site
        //             const apiData = apiStations.find(s => s.siteid === String(stream.usgs_id));
        //             console.log('stream', stream.usgs_id, 'matched', apiData, 'usgs=', apiData?.usgs);
                    
        //             const color =
        //                 apiData && typeof apiData.usgs === 'number'
        //                 ? usgsColors[apiData.usgs] ?? '#808080'
        //                 : '#808080';

        //             // Place marker using exact Lat/Lon (Leaflet handles the pixel math automatically)
        //             const marker = L.circleMarker([stream.lat, stream.lon], {
        //                 radius: 7,
        //                 color: '#000',
        //                 weight: 1,
        //                 fillColor: color,
        //                 fillOpacity: 0.9
        //             }).addTo(map);

        //             // Replicate your marker-label functionality using a Leaflet Tooltip
        //             marker.bindTooltip(formatStreamName(stream.name), {
        //                 permanent: false, 
        //                 direction: 'right',
        //                 className: 'custom-tooltip'
        //             });

        //             // Replicate your link behavior using SvelteKit's router
        //             marker.on('click', () => {
        //                 goto(`/streams/${stream.usgs_id}`);
        //             });
        //                 // Loop through your local streams data instead of calculating pixels
        //         });
        //     })
        //     .catch(err => console.error("Failed to fetch NRCC JSON:", err));

        // // Fetch the wells data
        // fetch('/api/wells')
        //     .then(response => response.json())
        //     .then(jsonData => {
        //         const wellStations = jsonData.data ?? [];

        //         wells.forEach(well => {
        //             const wellData = wellStations.find(
        //                 s => String(s.siteid) === String(well.storageId)
        //             );
        //             console.log('well', well.storageId, 'matched', wellData, 'usgs=', wellData?.usgs);

        //             const color =
        //                 wellData && typeof wellData.usgs === 'number'
        //                 ? usgsColors[wellData.usgs] ?? '#808080'
        //                 : '#808080';

        //             // Place marker using exact Lat/Lon (Leaflet handles the pixel math automatically)
        //             const marker = L.marker([well.lat, well.lon], {
        //                 icon: makeTriangleIcon(color)
        //             }).addTo(map);

        //         // Replicate your marker-label functionality using a Leaflet Tooltip
        //         marker.bindTooltip(formatStreamName(well.name), {
        //             permanent: false, 
        //             direction: 'right',
        //             className: 'custom-tooltip'
        //         });

        //         // Replicate your link behavior using SvelteKit's router
        //         marker.on('click', () => {
        //             goto(`/groundwater/${well.storageId}`);
        //         });
        //         });
        //     })
        //     .catch(err => console.error("Failed to fetch wells JSON:", err));
        
        // // Add symbol legend for the map
        // const symbolLegend = L.control({ position: 'bottomright' });

        //     symbolLegend.onAdd = function () {
        //     const div = L.DomUtil.create('div', 'symbol-legend');

        //     div.innerHTML = `
        //         <div style="margin-bottom:8px; font-weight:bold;">Sites</div>
        //         <div style="display:flex; align-items:center; margin-bottom:6px;">
        //         <svg width="16" height="16" viewBox="0 0 16 16">
        //             <circle cx="8" cy="8" r="6" fill="#000000" stroke="#000" stroke-width="1.2"/>
        //         </svg>
        //         <span style="margin-left:8px;">7-day Streamflow</span>
        //         </div>
        //         <div style="display:flex; align-items:center;">
        //         <svg width="16" height="16" viewBox="0 0 16 16">
        //             <path d="M8 1 L15 14 L1 14 Z" fill="#000000" stroke="#000" stroke-width="1.2" />
        //         </svg>
        //         <span style="margin-left:8px;">Groundwater Status</span>
        //         </div>
        //     `;

        //     return div;
        //     };

        // symbolLegend.addTo(map);
        
        // // Add color legend for the map
        // const legend = L.control({ position: 'bottomright' });

        // legend.onAdd = function () {
        //     const div = L.DomUtil.create('div', 'info legend');
        //     const labels = ['≤10% (Much below normal)', '11-25% (Below normal)', '26-75% (Normal)', '76-90% (Above normal)', '>90% (Much above normal)'];
        //     const colors = ['#b12222', '#ffa500', '#00ff00', '#40e0d0', '#0000ff'];

        //     div.innerHTML = '<h4 style="margin: 0 0 8px 0;">Drought Percentile</h4>';
            
        //     for (let i = 0; i < labels.length; i++) {
        //         //div.innerHTML += `<i style="background:${colors[i]}"></i> ${labels[i]}<br>`;
        //         div.innerHTML += `
        //               <div style="display:flex; align-items:center; margin-bottom:4px;">
        //                 <span style="display:inline-block; width:14px; height:14px; background:${colors[i]}; border:1px solid #333; border-radius:50%; margin-right:8px;"></span>
        //                 <span>${labels[i]}</span>
        //             </div>
        //             `;
        //     }
        //         div.innerHTML += `
        //             <div style="display:flex; align-items:center;">
        //             <span style="display:inline-block; width:14px; height:14px; background:#808080; border:1px solid #333; border-radius:50%; margin-right:8px;"></span>
        //             <span>No Data</span>
        //             </div>
        //         `;            
        //     return div;
        // };

        // legend.addTo(map);
        // Cleanup on unmount
        initializeMap(streamsMapContainer, true, false);
        initializeMap(wellsMapContainer, false, true);
        return () => {
            StreamsMap.remove();
            WellsMap.remove();
        };
    });
    
</script>

<svelte:head>
    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
</svelte:head>

<div class="banner">
    <div class="banner-left">
        <img src="/images/dec_logo.png" alt="New York DEC Logo" class="banner-logo" />
    </div>
    <div class="banner-center">
        <h1 class="banner-title">New York Drought Prediction Dashboard</h1>
    </div>
    <div class="banner-right">
        <img src="/images/nrccLogoStackedT.png" alt="NRCC Logo" class="banner-logo" />
    </div>
</div>

<h2 class="page-subtitle">Please select a site to view forecasts</h2>
<!-- <div bind:this={mapContainer} class="map-container"></div> -->
<div class="maps-container">
    <div class="map-section">
        <h2>7-day Streamflow Status</h2>
        <div bind:this={streamsMapContainer} class="map-container"></div>
    </div>
    <div class="map-section">
        <h2>Groundwater Status</h2>
        <div bind:this={wellsMapContainer} class="map-container"></div>
    </div>
    <div class="map-section">
        <h2>USDM Status</h2>
        <img src="https://droughtmonitor.unl.edu/data/png/current/current_ny_text.png" alt="USDM Map" class="usdm-image" />
    </div>
        <div class="map-section">
        <h2>USDM Change in Status</h2>
        <img src="https://droughtmonitor.unl.edu/data/chng/png/current/current_ny_chng_1W.png" alt="USDM Map" class="usdm-image" />
    </div>
</div>
<style>
    .banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #f5f5dc;
        padding: 20px 30px;
        margin: 0;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    }

    .banner-left,
    .banner-right {
        flex: 0 0 auto;
    }

    .banner-center {
        flex: 1;
        text-align: center;
        padding: 0 30px;
    }

    .banner-logo {
        height: 100px;
        width: auto;
        object-fit: contain;
    }

    .banner-title {
        margin: 0;
        font-size: 46px;
        font-weight: bold;
        color: #333;
        letter-spacing: 0.5px;
    }

    .page-subtitle {
        text-align: center;
        margin: 15px 0 20px 0;
        color: #666;
        font-size: 32px;
    }
    .maps-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        width: 100%;
        padding: 20px;
        box-sizing: border-box;
    }


    .map-section h2 {
        margin: 0 0 10px 0;
        text-align: center;
        font-size: 22px;
    }

    .map-container {
        width: 100%;
        height: 500px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }
    .usdm-image {
        width: 100%;
        height: 500px;
        object-fit: contain;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }
    h1 {
        text-align: center;
        width: 100%;
    }

    :global(.custom-tooltip) {
        background-color: rgba(255, 255, 255, 0.95);
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 14px;
        font-weight: bold;
        border: 1px solid #333;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    :global(.legend) {
        background: rgba(255, 255, 255, 0.9);
        padding: 8px 10px;
        border-radius: 6px;
        box-shadow: 0 0 8px rgba(0, 0, 0, 0.2);
        color: #333;
        font-size: 12px;
    }

    :global(.triangle-marker) {
        background: transparent;
        border: none;
    }
</style>