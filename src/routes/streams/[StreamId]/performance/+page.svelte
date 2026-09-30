<script lang="ts">
    import { getStreamById, formatStreamName } from '$lib/data/streams';
    import { page } from '$app/stores';

    let streamId = $derived($page.params.StreamId);
    let stream = $derived(streamId ? getStreamById(streamId) : undefined);

    function handleImageError(event: Event) {
    console.error('Image failed to load', event);
    const img = event.target as HTMLImageElement;
    img.src = '/images/forecasts/placeholder.png';
    img.alt = 'Forecast not available';
}
</script>

{#if stream}
    <div class="performance-page">
         <nav class="tabs">
          <a class="tab" href="/streams/{stream.usgs_id}">Forecast</a>
          <a class="tab" href="/streams/{stream.usgs_id}/precipitation">Precipitation Comparison</a>
          <a class="tab" href="/streams/{stream.usgs_id}/performance">Performance</a>
      </nav>

        <h1>{formatStreamName(stream.name)} - Past Performance</h1>
        <p>USGS ID: {stream.usgs_id}</p>
        
        <!-- Past performance image -->
        <div class="performance-image">
            <img 
                src={`/images/performance/${stream.usgs_id}_past_performance.png`}
                alt="Past performance for {formatStreamName(stream.name)}"
                onerror={handleImageError}
            />
        </div>
        
        <div class="navigation">
            <a href="/streams/{stream.usgs_id}" class="nav-button">← View Forecast</a>
            <a href="/" class="nav-button">← Back to Map</a>
        </div>
    </div>
{:else}
    <p>Stream not found</p>
{/if}

<style>
    /* ADD THIS SECTION */
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
    
    .performance-page {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
    }
    
    h1 {
        font-size: 24px;
        margin-bottom: 10px;
    }
    
    .performance-image {
        margin: 30px 0;
        width: 100%;
    }
    
    .performance-image img {
        width: 100%;
        height: auto;
        max-width: 100%;
        display: block;
        border: 1px solid #ddd;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .navigation {
        display: flex;
        gap: 10px;
        margin-top: 20px;
    }
    
    .nav-button {
        display: inline-block;
        padding: 10px 20px;
        background-color: #0066cc;
        color: white;
        text-decoration: none;
        border-radius: 4px;
    }
    
    .nav-button:hover {
        background-color: #0052a3;
    }
</style>