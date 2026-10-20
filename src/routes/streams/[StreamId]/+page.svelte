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
            overlayPoints = Array.isArray(data) ? data : (data.points ?? []);
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
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
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
        width: min(100%, 1000px);
        height: auto;
        display: block;
        margin: 0 auto;
    }

    .legend-image {
        width: min(100%, 1000px);
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
    width: min(100%, 1000px);
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
</style>
