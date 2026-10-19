<script lang="ts">
    import { page } from '$app/state';
    import { wells, formatStreamName, getAvailableDates, precipOptions } from '$lib/data/streams';

    let groundId = $derived(page.params.GroundId);
    let groundwater = $derived(groundId ? wells.find(w => w.storageId === groundId) : undefined);

    // Get available dates for the dropdown
    const availableDates = getAvailableDates();

    // Selected date state (defaults to today)
    let selectedDate = $state(availableDates[0]);

  // Selected precipitation option state (defaults to the first option)
    let selectedPrecipOption = $state(precipOptions[0].key);

    // Construct the image path based on selected date
    // let forecastImagePath = $derived(
    //     groundwater ? `/images/forecasts/${groundwater.usgs_id}/${groundwater.storageId}_forecast_figure_combination_2_weeks_${selectedDate}_${selectedPrecipOption}.png` : ''
    // );
    let forecastImagePath = $derived(
    groundwater
        ? `/images/forecasts/${groundwater.storageId}/${groundwater.storageId}_forecast_figure_combination_2_weeks_${selectedDate}_${selectedPrecipOption}.png`
        : ''
    );
    function handleImageError(event: Event) {
        console.error('Image failed to load', event);
        const img = event.target as HTMLImageElement;
        img.src = '/images/forecasts/placeholder.png';
        img.alt = 'Forecast not available';
    }
</script>

{#if groundwater}
   <div class="precip-forecast-page">
     <nav class="tabs">
          <a class="tab" href="/groundwater/{groundId}">Forecast</a>
          <a class="tab" href="/groundwater/{groundId}/precipitation">Precipitation Comparison</a>
          <a class="tab" href="/groundwater/{groundId}/performance">Performance</a>
      </nav>
      <h1>{formatStreamName(groundwater.name)} — Precipitation forecast comparison</h1>

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
                alt="Forecast for {groundwater.name} on {selectedDate} using {selectedPrecipOption} precipitation forecast"
                onerror={handleImageError}
            />
        </div>
        
        <a href="/" class="back-button">← Back to Map</a>
        <a href="/groundwater/{groundId}" class="back-button">← Back to Stream</a>
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
