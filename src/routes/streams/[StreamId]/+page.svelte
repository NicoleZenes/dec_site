<script>
// @ts-nocheck this defines logic and data for the Svelte component. It imports necessary functions and data, manages state, and handles events.

    import { getStreamById, streams, getForecastFileName, getAvailableDates, formatStreamName } from '$lib/data/streams';
    import { page } from '$app/stores';
    import { base } from '$app/paths';

    let streamId = $derived($page.params.StreamId);
    let stream = $derived(streamId ? getStreamById(streamId) : undefined);

    // Get available dates for the dropdown
    const availableDates = getAvailableDates();
    
    // Selected date state (defaults to today)
    let selectedDate = $state(availableDates[0]);
    
    // Construct the image path based on selected date
    let forecastImagePath = $derived(
        stream ? `/images/forecasts/${stream.usgs_id}/${getForecastFileName(stream.usgs_id, selectedDate)}` : ''
    );

    function handleImageError(event) {
        console.error('Image failed to load', event);
        const img = event.target;
        img.src = '/images/forecasts/placeholder.png';
        img.alt = 'Forecast not available';
    }
</script>

{#if stream}
<!--This is called the template section of the Svelte component. It defines the HTML structure and binds data to it.-->
   <div class="forecast-page">
        <nav class="tabs">
          <a class="tab" href="{base}/streams/{stream.usgs_id}">Forecast</a>
          <a class="tab" href="{base}/streams/{stream.usgs_id}/precipitation">Precipitation Comparison</a>
          <a class="tab" href="{base}/streams/{stream.usgs_id}/performance">Performance</a>
        </nav>

        <h1>{formatStreamName(stream.name)}</h1>
        <p>USGS ID: {stream.usgs_id}</p>
        
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
        <div class="forecast-image">
            <img 
                src={forecastImagePath} 
                alt="Forecast for {stream.name} on {selectedDate}"
                onerror={handleImageError}
            />
        </div>
        
        <a href="{base}/" class="back-button">← Back to Map</a>
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
    
    .forecast-image {
        margin: 30px 0;
        width: 100%;
        max-width: 100%;
    }
    
    .forecast-image img {
        max-width: 100%;
        height: auto;
        max-width: 100%;
        display: block;
        border: 1px solid #ddd;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
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
</style>
