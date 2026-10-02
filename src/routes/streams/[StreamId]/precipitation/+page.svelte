<script lang="ts">
    import { page } from '$app/stores';
    import { base } from '$app/paths'    
    import { getStreamById, formatStreamName, getAvailableDates, precipOptions, getPrecipFileName } from '$lib/data/streams';

    let streamId = $derived($page.params.StreamId);
    let stream = $derived(streamId ? getStreamById(streamId) : undefined);

    // Get available dates for the dropdown
    const availableDates = getAvailableDates();

    // Selected date state (defaults to today)
    let selectedDate = $state(availableDates[0]);

  // Selected precipitation option state (defaults to the first option)
    let selectedPrecipOption = $state(precipOptions[0].key);

        // Construct the image path based on selected date
    let forecastImagePath = $derived(
        stream ? `${base}/images/forecasts/${stream.usgs_id}/${getPrecipFileName(stream.usgs_id, selectedPrecipOption, selectedDate)}` : ''
    );

    function handleImageError(event: Event) {
        console.error('Image failed to load', event);
        const img = event.target as HTMLImageElement;
        img.src = '{base}/images/forecasts/placeholder.png';
        img.alt = 'Forecast not available';
    }
</script>

{#if stream}
   <div class="precip-forecast-page">
     <nav class="tabs">
          <a class="tab" href="{base}/streams/{streamId}">Forecast</a>
          <a class="tab" href="{base}/streams/{streamId}/precipitation">Precipitation Comparison</a>
          <a class="tab" href="{base}/streams/{streamId}/performance">Performance</a>
      </nav>
      <h1>{formatStreamName(stream.name)} — Precipitation forecast comparison</h1>

        <!-- Date selector dropdown -->
        <div class="date-selector">
            <label for="date-select">Select Forecast Date:</label>
            <select id="date-select" bind:value={selectedDate}>
                {#each availableDates as date}
                    <option value={date}>{date}</option>
                {/each}
            </select>
        </div>

        <!-- Precipitation option selector dropdown -->
        <div class="date-selector">
            <label for="precip-select">Select Precipitation Option:</label>
            <select id="precip-select" bind:value={selectedPrecipOption}>
                {#each precipOptions as option}
                    <option value={option.key}>{option.label}</option>
                {/each}
            </select>
        </div>

        <!-- Forecast image -->
        <div class="forecast-image">
            <img 
                src={forecastImagePath} 
                alt="Forecast for {stream.name} on {selectedDate} using {selectedPrecipOption} precipitation forecast"
                onerror={handleImageError}
            />
        </div>
        
        <a href="{base}/" class="back-button">← Back to Map</a>
        <a href="{base}/streams/{streamId}" class="back-button">← Back to Stream</a>
    </div>
{:else}
    <p>Stream not found</p>
{/if}


<style>
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
    .precip-forecast-page {
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
</style>
