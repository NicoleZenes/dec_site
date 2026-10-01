<script>
    import { base } from '$app/paths';
    import ny_map from '$lib/assets/ny_stream_gauges_map.png';
    import { latLonToPixel } from '$lib/utils/mapUtils';
    import { streams, formatStreamName } from '$lib/data/streams';

    // Reactive state variables to hold the current pixel dimensions
    let currentWidth = $state(0);
    let currentHeight = $state(0);

    // Loop through the streams data to convert lat/lon to pixel coordinates
    // Recalculate pixel coordinates whenever the image dimensions change
    let pixelCoordinates = $derived.by(() => {
        if (currentWidth === 0 || currentHeight === 0) return [];
        return streams.map(stream => {
            const { x, y } = latLonToPixel(stream.lat, stream.lon, currentWidth, currentHeight);
            return { ...stream, x, y };
        });
    });
</script>

<h1>Welcome to the streamflow forecast website. Please select a stream site from the map below.</h1>


<div class="image-container">
    <img 
        src={ny_map} 
        alt="New York Stream Gauges Map" 
        bind:clientWidth={currentWidth}
        bind:clientHeight={currentHeight}
    />
        <!-- Loop through streams and render markers -->
    {#each pixelCoordinates as stream (stream.usgs_id)}
        <a 
            class="marker" 
            style="left: {stream.x}px; top: {stream.y}px;"
            title={formatStreamName(stream.name)}
            href="{base}/streams/{stream.usgs_id}"
        >
            <span class="marker-dot"></span>
            <span class="marker-label">{formatStreamName(stream.name)}</span>
      
        </a>
    {/each}
</div>

<style> 
    .image-container {
    width:80vw;
    aspect-ratio: 3097 / 2970;  /* Original image proportions */
    position: relative;
    border: 2px solid #f80202;  /* Optional: for visual debugging */
    }
    img {
    width:100%;
    height:100%;
    object-fit: contain;
    }

    .marker {
        position: absolute;
        cursor: pointer;
        display: block;
        text-decoration: none;
        transform: translate(-50%, -50%);
        z-index: 10;
    }

    .marker-dot {
        position: absolute;
        width: 12px;
        height: 12px;
        background-color: rgb(0, 5, 1);
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
        left: 0;
        top: 0;
    }

    .marker-label {
        position: absolute;
        left: 20px;
        top: -8px;
        background-color: rgba(255, 255, 255, 0.95);
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 20px;
        font-weight: bold;
        white-space: nowrap;
        border: 1px solid #333;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .marker:hover .marker-label {
        background-color: rgba(255, 255, 200, 1);
    }
</style>
