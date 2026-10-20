<script>
// @ts-nocheck this defines logic and data for the Svelte component. It imports necessary functions and data, manages state, and handles events.

    import { getStreamById, streams, getForecastFileName, getAvailableDates, formatStreamName } from '$lib/data/streams';
    import { page } from '$app/state';

    let streamId = $derived(page.params.StreamId);
    let stream = $derived(streamId ? getStreamById(streamId) : undefined);

    // Get available dates for the dropdown
    const availableDates = getAvailableDates();
    
    // Selected date state (defaults to today)
    let selectedDate = $state(availableDates[0]);
    
    // Construct the image path based on selected date
    // let forecastImagePath = $derived(
    //     stream ? `/images/forecasts/${stream.usgs_id}/${getForecastFileName(stream.usgs_id, selectedDate)}` : ''
    // );

    let imageVariant = $state('standard'); // standard | simplified | placeholder

    // Logic for beta testing to load NRCC simplified forecast if combo is not found and sub the legend
    let standardFile = $derived(
    stream ? getForecastFileName(stream.usgs_id, selectedDate) : ''
    );

    let simplifiedFile = $derived(
    stream
        ? stream.usgs_id + '_forecast_figure_combination_2_weeks_' + selectedDate + '_control_streamflow_only_no_legend.png'
        : ''
    );

    let forecastImagePath = $derived(
    !stream
        ? ''
        : imageVariant === 'simplified'
        ? '/images/forecasts/' + stream.usgs_id + '/' + simplifiedFile
        : imageVariant === 'placeholder'
            ? '/images/forecasts/placeholder.png'
            : '/images/forecasts/' + stream.usgs_id + '/' + standardFile
    );

    let legendImagePath = $derived(
    imageVariant === 'simplified'
        ? '/images/legends/nrcc_only_streamflow_percent_with_description.png'
        : '/images/legends/combo_streamflow_percent_with_description.png'
    );

    $effect(() => {
    streamId;
    selectedDate;
    imageVariant = 'standard';
    });

    function handleImageError(event) {
    const img = event.target;
    if (imageVariant === 'standard') {
        imageVariant = 'simplified';
        return;
    }
    imageVariant = 'placeholder';
    img.alt = 'Forecast not available';
    }

    // function handleImageError(event) {
    //     console.error('Image failed to load', event);
    //     const img = event.target;
    //     img.src = '/images/forecasts/placeholder.png';
    //     img.alt = 'Forecast not available';
    // }

    // Adding overlay for dynamic percentages
    let overlayPoints = $state([]);
    let overlayError = $state('');
    let overlayZones = $state([]);
    let hoveredZone = $state(null);
    let tooltipX = $state(0);
    let tooltipY = $state(0);

    // Overlay json path
    let overlayDataPath = $derived(
    stream
        ? '/overlays/' + stream.usgs_id + '_forecast_overlay_' + selectedDate + '.json'
        : ''
    );

    // load JSON whenever the stream/date changes (this will be scenario in the precipitation page)
    $effect(() => {
    const path = overlayDataPath;
    if (!path) {
        overlayPoints = [];
        overlayError = '';
        return;
    }

    let cancelled = false;

    (async () => {
        try {
        overlayError = '';
        const response = await fetch(path);
        if (!response.ok) {
            if (!cancelled) overlayPoints = [];
            return;
        }

        const data = await response.json();
        if (!cancelled) {
            //overlayPoints = Array.isArray(data) ? data : (data.points ?? []);
            const normalized = normalizeOverlayData(data);
            overlayPoints = normalized.points;
            overlayZones = normalized.zones;
        }
        } catch (err) {
        if (!cancelled) {
            overlayPoints = [];
            overlayError = 'Overlay JSON failed to load';
        }
        }
    })();

    return () => {
        cancelled = true;
    };
    });

    function firstVal(v) {
    return Array.isArray(v) ? v[0] : v;
    }

    function toNum(v) {
    const n = Number(firstVal(v));
    return Number.isFinite(n) ? n : 0;
    }

    function toStr(v) {
    const s = firstVal(v);
    return s == null ? '' : String(s);
    }

    function normalizeOverlayData(raw) {
    const pointsRaw = Array.isArray(raw?.points) ? raw.points : [];
    const zonesRaw = Array.isArray(raw?.zones) ? raw.zones : [];

    const points = pointsRaw.map((p) => ({
    category: toStr(p.category),
    probability: toNum(p.probability),
    x_pos: toNum(p.x_pos),
    y_pos: toNum(p.y_pos),
    forecast: toStr(p.forecast)
    }));

    const zones = zonesRaw.map((z) => ({
    id: toStr(z.id),
    forecast: toStr(z.forecast),
    category: toStr(z.category),
    probability: toNum(z.probability),
    discharge_min_cfs: toNum(z.discharge_min_cfs),
    discharge_max_cfs: toNum(z.discharge_max_cfs),
    rect: {
    x: toNum(z.rect?.x),
    y: toNum(z.rect?.y),
    w: toNum(z.rect?.w),
    h: toNum(z.rect?.h)
    }
    }));

    return {
    template_version: toStr(raw?.template_version),
    points,
    zones
    };
    }
</script>

{#if stream}
<!--This is called the template section of the Svelte component. It defines the HTML structure and binds data to it.-->
   <div class="forecast-page">
        <nav class="tabs">
          <a class="tab" href="/streams/{streamId}">Forecast</a>
          <a class="tab" href="/streams/{streamId}/precipitation">Precipitation Comparison</a>
          <a class="tab" href="/streams/{streamId}/performance">Performance</a>
        </nav>

        <h1>{formatStreamName(stream.name)}</h1>
        <p>USGS ID: {streamId}</p>
        
        <!-- Date selector dropdown -->
        <div class="date-selector">
            <label for="date-select">Select Forecast Date:</label>
            <select id="date-select" bind:value={selectedDate}>
                {#each availableDates as date}
                    <option value={date}>{date}</option>
                {/each}
            </select>
        </div>
        
        <!-- Forecast image -->
        <!-- <div class="forecast-image">
            <img 
                src={forecastImagePath} 
                alt="Forecast for {stream.name} on {selectedDate}"
                onerror={handleImageError}
            />
            <img src="/images/legends/combo_streamflow_percent_with_description.png" alt="Forecast legend" class="legend-image" />
        </div> -->
        <!-- <div class="forecast-figure">
            <img src={forecastImagePath} alt="Forecast for {stream.name}" class="forecast-image" />
            <img src="/images/legends/combo_streamflow_percent_with_description.png" alt="Forecast legend" class="legend-image" />
        </div> -->
        <div class="forecast-image-wrap">
            <img
                src={forecastImagePath}
                alt="Forecast for {stream.name}"
                class="forecast-image"
                onerror={handleImageError}
            />

            {#if overlayPoints.length > 0 && imageVariant !== 'placeholder'}
                <div class="probability-overlay" aria-hidden="true">
                {#each overlayPoints as point}
                    <div
                    class="probability-label"
                    style={"left:" + point.x_pos + "%; top:" + point.y_pos + "%;"}
                    title={point.category + ": " + point.probability + "%"}
                    >
                    {Math.round(point.probability)}%
                    </div>
                {/each}
                </div>
            {/if}
            {#if overlayZones.length > 0 && imageVariant !== 'placeholder'}
                <div class="hotspot-layer" aria-hidden="true">
                    {#each overlayZones as zone}
                    <div
                        class="hotspot"
                        role="button"
                        tabindex="0"
                        style={
                        "left:" + zone.rect.x + "%; " +
                        "top:" + zone.rect.y + "%; " +
                        "width:" + zone.rect.w + "%; " +
                        "height:" + zone.rect.h + "%;"
                        }
                        onmouseenter={(e) => {
                        hoveredZone = zone;
                        const rect = e.currentTarget.getBoundingClientRect();
                        tooltipX = rect.left + rect.width / 2;
                        tooltipY = rect.top - 12;
                        }}
                        onmouseleave={() => {
                        hoveredZone = null;
                        }}
                    >
                    </div>
                    {/each}
                </div>
                {/if}
                {#if hoveredZone}
                <div
                    class="tooltip"
                    style={"left:" + tooltipX + "px; top:" + tooltipY + "px;"}
                >
                    <div class="tooltip-content">
                    According to our model, there is a <strong>{hoveredZone.probability.toFixed(1)}%</strong> chance 
                    streamflow will {hoveredZone.category.toLowerCase()} next {hoveredZone.forecast} 
                    with discharge rates of <strong>{hoveredZone.discharge_min_cfs.toFixed(2)} cfs</strong> to <strong>{hoveredZone.discharge_max_cfs.toFixed(2)} cfs</strong>.
                    </div>
                </div>
                {/if}
            </div>

        <div class="forecast-legend">
            <!-- <img
                src={forecastImagePath}
                alt="Forecast for {stream.name}"
                class="forecast-image"
                onerror={handleImageError}
            /> -->
            <img
                src={legendImagePath}
                alt="Forecast legend"
                class="legend-image"
            />
        </div>

        <a href="/" class="back-button">← Back to Map</a>
    </div>
{:else}
    <p>Stream not found</p>
{/if}


<style>
    .forecast-page {
        max-width: none;
        width: min(98vw, 1900px);
        margin: 0 auto;
        padding: 12px 16px 20px;
    }
    
    h1 {
        font-size: 24px;
        margin-bottom: 10px;
    }
    
    .date-selector {
        margin: 20px 0;
    }
    
    .date-selector label {
        margin-right: 10px;
        font-weight: bold;
    }
    
    .date-selector select {
        padding: 8px 12px;
        font-size: 16px;
        border: 2px solid #ccc;
        border-radius: 4px;
    }
    
    .forecast-legend {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 1200px;
        margin: 0 auto;
    }

    .forecast-image {
        width: 100%;
        height: auto;
        display: block;
        margin: 0 auto;
    }

    .legend-image {
        width: min(98vw, 1800px);
        height: auto;
        display: block;
        margin: 0 auto;
    }
    
    .back-button {
        display: inline-block;
        padding: 10px 20px;
        background-color: #0066cc;
        color: white;
        text-decoration: none;
        border-radius: 4px;
        margin-top: 20px;
    }
    
    .back-button:hover {
        background-color: #0052a3;
    }

    .tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
    border-bottom: 2px solid #ccc;
    }

    .tab {
        padding: 8px 16px;
        background: #f0f0f0;
        border-radius: 4px 4px 0 0;
        text-decoration: none;
        color: inherit;
    }

    .tab:hover {
        background: #e0e0e0;
    }

    .forecast-image-wrap {
    position: relative;
    width: min(98vw, 1800px);
    margin: 0 auto;
    }

    .probability-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    }

    .probability-label {
    position: absolute;
    transform: translate(-50%, -50%);
    font-weight: 700;
    font-size: clamp(14px, 1.7vw, 24px);
    color: #111;
    text-shadow:
        -1px -1px 0 #fff,
        1px -1px 0 #fff,
        -1px  1px 0 #fff,
        1px  1px 0 #fff;
    white-space: nowrap;
    }

    .hotspot-layer {
    position: absolute;
    inset: 0;
    }

    .hotspot {
    position: absolute;
    cursor: pointer;
    }

    .hotspot:hover {
    background: rgba(0, 0, 255, 0.05);
    outline: 2px solid rgba(0, 0, 255, 0.3);
    }

    .tooltip {
    position: fixed;
    background: rgba(0, 0, 0, 0.92);
    color: #fff;
    padding: 12px 16px;
    border-radius: 6px;
    font-size: 14px;
    max-width: 320px;
    z-index: 1000;
    transform: translate(-50%, -100%);
    pointer-events: none;
    line-height: 1.5;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .tooltip-content {
    white-space: normal;
    }
</style>
