<script lang="ts">
    import { page } from '$app/state';
    import { getStreamById, formatStreamName, getAvailableDates, precipOptions, getPrecipFileName, getPrecipjson } from '$lib/data/streams';
    import { onMount } from 'svelte';
    // import Chart from 'chart.js/auto';
    import { browser } from '$app/environment';

    let streamId = $derived(page.params.StreamId);
    let stream = $derived(streamId ? getStreamById(streamId) : undefined);

    // Get available dates for the dropdown
    const availableDates = getAvailableDates();

    // Selected date state (defaults to today)
    let selectedDate = $state(availableDates[0]);

    // Selected precipitation option state (defaults to the first option)
    let selectedPrecipOption = $state(precipOptions[0].key);



    // function handleImageError(event: Event) {
    //     console.error('Image failed to load', event);
    //     const img = event.target as HTMLImageElement;
    //     img.src = '/images/forecasts/placeholder.png';
    //     img.alt = 'Forecast not available';
    // }

    let imageVariant = $state('standard'); // standard | simplified | placeholder

    let legendImagePath = $derived(
        imageVariant === 'simplified'
            ? '/images/legends/nrcc_only_streamflow_percent_with_description.png'
            : '/images/legends/combo_streamflow_percent_with_description.png'
    );

    let standardFile = $derived(
    stream ? getPrecipFileName(stream.usgs_id, selectedPrecipOption, selectedDate) : ''
    );

    let simplifiedFile = $derived(
        stream
            ? stream.usgs_id + '_forecast_figure_combination_2_weeks_' + selectedDate + '_control_streamflow_only_no_legend.png'
            : ''
    );

        // Construct the image path based on selected date
    let forecastImagePath = $derived(
        !stream
            ? ''
            : imageVariant === 'simplified'
            ? '/images/forecasts/' + stream.usgs_id + '/' + simplifiedFile
            : imageVariant === 'placeholder'
                ? '/images/forecasts/placeholder.png'
                : '/images/forecasts/' + stream.usgs_id + '/' + standardFile
    );

    function handleImageError(event: Event) {
        const img = event.target as HTMLImageElement;
        if (imageVariant === 'standard') {
            imageVariant = 'simplified';
            return;
        }
        imageVariant = 'placeholder';
        img.alt = 'Forecast not available';
    }

    $effect(() => {
      selectedPrecipOption;
      selectedDate;
      imageVariant = 'standard';
  });
    // Adding overlay for dynamic percentages
    let overlayPoints = $state([]);
    let overlayError = $state('');
    let overlayZones = $state([]);
    let hoveredZone = $state(null);
    let tooltipX = $state(0);
    let tooltipY = $state(0);

    // Overlay json path - needs to change with the precipitation option
    let overlayDataPath = $derived(
    stream
        ? '/overlays/' + stream.usgs_id + '_nz_forecast_' + selectedDate.replace(/-/g, '') + '_' + selectedPrecipOption + '.json'
        : ''
    );

      // load JSON whenever the stream/date/precipitation option changes (this will be scenario in the precipitation page)
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

    function getCategoryWord(category: string): string {
    const categoryMap: Record<string, string> = {
        'More': 'increase',
        'Less': 'decrease',
        'Same': 'persist'
    };
    return categoryMap[category] || category.toLowerCase();
    }

    function getForecastWord(category: string): string {
    const categoryMap: Record<string, string> = {
        '7-day': '7 days',
        '14-day': '14 days'
    };
    return categoryMap[category] || category.toLowerCase();
    }

    function getDischargeText(category: string, minCfs: number, maxCfs: number): string {
      switch (category) {
          case 'Less':
              return `with discharge rates of <strong>${maxCfs.toFixed(2)} cfs</strong> or less`;
          case 'More':
              return `with discharge rates of <strong>${minCfs.toFixed(2)} cfs</strong> or more`;
          case 'Same':
          default:
              return `with discharge rates of <strong>${minCfs.toFixed(2)} cfs</strong> to <strong>${maxCfs.toFixed(2)} cfs</strong>`;
      }
    }

    // Add pie charts
    const categoryColors = {
      "Less": "#964B00", // brown
      "Same": "#3BB143", // green
      "More": "#0072B2"  // blue
    };
    const categoryLabels = {
      'More': 'Increase',
      'Same': 'Persist',
      'Less': 'Decrease'
    };
    // Canvas references for Chart.js
    let canvas7Day = $state(null);
    let canvas14Day = $state(null);
    let chart7Day = null;
    let chart14Day = null;

    function getChartConfig(forecastPeriod) {
      // Filter points for the given forecast period
      const points = overlayPoints.filter(p => p.forecast === forecastPeriod);
      // Extract labels and data for the chart
      const labels = points.map(p => categoryLabels[p.category] || p.category);  // Map to human-readable labels
      const data = points.map(p => p.probability);
      const bgColors = labels.map(label => categoryColors[Object.keys(categoryLabels).find(key => categoryLabels[key] === label)]);

    // Return the complete Chart.js config
      return {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: bgColors,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { 
              position: 'bottom',
            labels: {
              font: {
                size: 14
              }
            }
            },
            title: { display: true, text: `${forecastPeriod} Forecast`, font: { size: 16 } }
          },
          tooltip: {
            bodyFont: {
              size: 14
            }
          }
        }
      };
    }

$effect(() => {
    if (!browser) return;  // Only run on client
    
    // Watch for changes to overlayPoints
    overlayPoints;
    
    // Import Chart.js only when needed
    import('chart.js/auto').then(({ default: Chart }) => {
      if (!canvas7Day || !canvas14Day) {
          console.warn('Canvas elements not ready:', { canvas7Day, canvas14Day });
          return;
      }
      
      if (overlayPoints.length === 0) {
          console.warn('No overlay points loaded yet');
          return;
      }

    try {
        // Debug: log what we're trying to render
        const config7Day = getChartConfig('7-day');
        const config14Day = getChartConfig('14-day');
        
        console.log('7-day config:', config7Day);
        console.log('14-day config:', config14Day);
        
        // Validate we have data
        if (config7Day.data.labels.length === 0 || config14Day.data.labels.length === 0) {
            console.warn('Empty chart data - no points matched forecast periods');
            return;
        }

        chart7Day?.destroy();
        chart14Day?.destroy();
        
        chart7Day = new Chart(canvas7Day, config7Day);
        chart14Day = new Chart(canvas14Day, config14Day);
        console.log('Charts created successfully');
        
    } catch (error) {
        console.error('Chart initialization error:', error);
    }
  });
});
  
let forecastJson = $state(null);
let forecastSources = $state([]);
let forecastError = $state('');

$effect(() => {
  if (!stream) {
    forecastJson = null;
    forecastSources = [];
    return;
  }

  let cancelled = false;

  (async () => {
    try {
      forecastError = '';
      const data = await getPrecipjson(stream.usgs_id, selectedDate);
      if (!cancelled) {
        forecastJson = data;
        // Extract the array of forecast sources
        forecastSources = Array.isArray(data) ? data : data.data || [];
      }
    } catch (err) {
      if (!cancelled) {
        forecastError = 'Failed to load precipitation forecast data';
        forecastJson = null;
        forecastSources = [];
      }
    }
  })();

  return () => {
    cancelled = true;
  };
});

function getForecastTypeLabel(forecastType: string): string {
  const typeMap: Record<string, string> = {
    'wpc': 'WPC',
    'p10': 'ECMWF P10',
    'p90': 'ECMWF P90',
    'mean': 'ECMWF Mean',
    'control': 'ECMWF Control'
  };
  return typeMap[forecastType] || forecastType.toUpperCase();
}

let forecastByType = $derived.by(() => {
  if (!forecastSources.length) return {};
  
  const grouped = {};
  forecastSources.forEach(item => {
    if (!grouped[item.forecast_type]) {
      grouped[item.forecast_type] = {};
    }
    grouped[item.forecast_type][item.period] = item;
  });
  
    // Combine WPC (7-day) with Control (14-day)
  const combined = [];
  if (grouped['wpc'] || grouped['control']) {
    combined.push({
      label: 'WPC/CFS',
      key: 'wpc_control',
      '7-day': grouped['wpc']?.['7-day'],
      '14-day': grouped['control']?.['14-day']
    });
  }
  
  // Add other forecast types
  ['p10', 'p90', 'mean', 'control'].forEach(type => {
    if (grouped[type]) {
      combined.push({
        label: getForecastTypeLabel(type),
        key: type,
        '7-day': grouped[type]?.['7-day'],
        '14-day': grouped[type]?.['14-day']
      });
    }
  });
  
  return combined;
});
</script>

{#if stream}
  <div class="precip-forecast-page">
    <nav class="tabs">
        <a class="tab" href="/streams/{streamId}">Forecast</a>
        <a class="tab" href="/streams/{streamId}/precipitation">Precipitation Comparison</a>
        <a class="tab" href="/streams/{streamId}/performance">Performance</a>
    </nav>
    <h1>{formatStreamName(stream.name)} — Precipitation forecast comparison</h1>

  <div class="dashboard-container">
    <!-- Left Side: Table -->
    <!-- <div class="table-panel">
      <h2>Precipitation Forecast</h2> 
        <img
          src="/images/table_placeholder.png"
          alt="Placeholder comparison table"
          class="table-placeholder"
        />
      </div> -->
      <div class="table-container">
        {#if forecastJson}
          <h2>Precipitation Forecast</h2>
          <p>Forecast Date: {selectedDate}</p>

          {#if forecastSources.length > 0}
            <table>
              <thead>
                <tr>
                  <th>Forecast Source</th>
                  <th>7-day Precipitation</th>
                  <th>14-day Precipitation</th>
                </tr>
              </thead>
              <tbody>
                {#each forecastByType as row}
                <tr class:highlighted={row.key === selectedPrecipOption || 
                                      (row.key === 'wpc_control' && (selectedPrecipOption === 'wpc' || selectedPrecipOption === 'control'))}>
                  <td>{row.label}</td>
                  <td>
                    {#if row['7-day']}
                      {row['7-day'].precip_mm.toFixed(2)} mm / {row['7-day'].precip_inches.toFixed(2)} in
                    {:else}
                      N/A
                    {/if}
                  </td>
                  <td>
                    {#if row['14-day']}
                      {row['14-day'].precip_mm.toFixed(2)} mm / {row['14-day'].precip_inches.toFixed(2)} in
                    {:else}
                      N/A
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
            </table>
          {:else}
            <p>No forecast data available</p>
          {/if}
        {:else}
          <p>Loading forecast data...</p>
        {/if}
      </div> <!-- Close table-container -->
    
    <!-- Right Side: Pie Charts -->
    <div class="charts-section">
      <h2>Streamflow Trajectory Probability</h2>
      <div class="charts-wrapper">
        <div class="chart-container">
          <canvas bind:this={canvas7Day}></canvas>
        </div>
        <div class="chart-container">
          <canvas bind:this={canvas14Day}></canvas>
        </div>
      </div>
    </div>
  </div> <!-- Close dashboard-container -->

    <div class="controls-panel">
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
    </div>

    <!-- Forecast image -->
    <!-- <div class="forecast-figure">
      <img 
          src={forecastImagePath} 
          alt="Forecast for {stream.name} on {selectedDate} using {selectedPrecipOption} precipitation forecast"
          onerror={handleImageError}
          class="forecast-image"
      />
        <img
          src="/images/legends/combo_streamflow_percent_with_description.png"
          alt="Forecast legend"
          class="legend-image"
      />
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
                    According to the NRCC model, there is a <strong>{hoveredZone.probability.toFixed(1)}%</strong> chance 
                    streamflow will {getCategoryWord(hoveredZone.category)} in {getForecastWord(hoveredZone.forecast)} 
                    {@html getDischargeText(hoveredZone.category, hoveredZone.discharge_min_cfs, hoveredZone.discharge_max_cfs)}.
                    <!-- with discharge rates of <strong>{hoveredZone.discharge_min_cfs.toFixed(2)} cfs</strong> to <strong>{hoveredZone.discharge_max_cfs.toFixed(2)} cfs</strong>. -->
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
  <a href="/streams/{streamId}" class="back-button">← Back to Stream</a>
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

    
    h1 {
        font-size: 24px;
        margin-bottom: 10px;
    }
/*     
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
    
    .forecast-figure {
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
    } */
    .precip-forecast-page {
    max-width: 100%;
    margin: 0 auto;
    padding: 5px 20px 5px 20px;
  }

.dashboard-container {
    display: flex;
    flex-wrap: wrap;
    gap: 40px;
    font-family: sans-serif;
    max-width: 100%;
    margin: 20px 0;
    padding: 0 20px;  /* Add horizontal padding instead */
  }

  /* .table-panel {
    flex: 1;
    min-width: 300px;
  } */
  .charts-section {
    flex: 1;
    min-width: 300px;
    display: flex;
    flex-direction: column;
  }

  .charts-wrapper {
    display: flex;
    gap: 20px;
    justify-content: space-around;
  }

  /* Keeps the pie charts constrained so they don't blow up in size */
  .chart-container {
    width: 350px;
    height: 350px;
    font-size: 14px;
  }

  /* .table-placeholder {
    display: block;
    width: min(100%, 700px);
    height: auto;
    border: 1px solid #d9d9d9;
    border-radius: 8px;
    background: white;
  } */
  .controls-panel {
    display: flex;
    flex-wrap: wrap;
    gap: 16px 24px;
    align-items: center;
    margin-bottom: 16px;
  }

.date-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}

.date-selector label {
  font-weight: bold;
}

.date-selector select {
  padding: 8px 12px;
  font-size: 16px;
  border: 2px solid #ccc;
  border-radius: 4px;
}

.table-container table tbody tr.highlighted {
  background-color: #fff3cd;
  font-weight: 500;
}

.table-container table tbody tr.highlighted:hover {
  background-color: #ffe69c;
}
/* 
.forecast-figure {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 1000px;
} */
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
       
    .forecast-legend {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 100%;
        margin: 20px 0;
        padding: 0 0;
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


    .forecast-image-wrap {
    position: relative;
    width: 100%;      /* Changed from min(98vw, 1800px) */
    margin: 20px 0;   /* Removed auto centering */
    padding: 0 20px;  /* Add horizontal padding */
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
    font-size: 18px;
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
