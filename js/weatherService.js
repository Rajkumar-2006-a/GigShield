/**
 * GigShield Weather Service
 * Real-time disruption monitoring using weather, AQI and event APIs
 * Supports live APIs + mock fallback for demo/development
 */

// ─── Mock Data for Demo ──────────────────────────────────────────────────────
const MOCK_WEATHER_DATA = {
  mumbai: {
    zone_bandra: { temp: 38, rainfall_mm_3hr: 65, wind_kmh: 52, aqi: 142, flood_alert: true, status: 'EXTREME_RAIN' },
    zone_andheri: { temp: 37, rainfall_mm_3hr: 45, wind_kmh: 40, aqi: 138, flood_alert: false, status: 'HEAVY_RAIN' },
    zone_thane: { temp: 39, rainfall_mm_3hr: 20, wind_kmh: 28, aqi: 160, flood_alert: false, status: 'NORMAL' },
  },
  delhi: {
    zone_south: { temp: 46, rainfall_mm_3hr: 0, wind_kmh: 15, aqi: 412, flood_alert: false, status: 'EXTREME_HEAT_AQI' },
    zone_north: { temp: 45, rainfall_mm_3hr: 0, wind_kmh: 12, aqi: 380, flood_alert: false, status: 'EXTREME_HEAT' },
    zone_east: { temp: 44, rainfall_mm_3hr: 0, wind_kmh: 18, aqi: 310, flood_alert: false, status: 'HIGH_AQI' },
  },
  bengaluru: {
    zone_central: { temp: 32, rainfall_mm_3hr: 30, wind_kmh: 25, aqi: 95, flood_alert: false, status: 'MODERATE_RAIN' },
    zone_outer: { temp: 33, rainfall_mm_3hr: 55, wind_kmh: 35, aqi: 88, flood_alert: true, status: 'EXTREME_RAIN' },
  },
};

const MOCK_SOCIAL_EVENTS = {
  mumbai: [
    { type: 'strike', description: 'Truck drivers\' strike blocking NH-48', zones: ['zone_bandra','zone_andheri'], severity: 'high', active: true },
  ],
  delhi: [
    { type: 'curfew', description: 'Section 144 in Connaught Place area', zones: ['zone_central'], severity: 'moderate', active: false },
  ],
  bengaluru: [],
};

// ─── Weather Condition Evaluator ─────────────────────────────────────────────
function evaluateWeatherTrigger(weatherData, thresholds) {
  const triggers = [];

  if (weatherData.rainfall_mm_3hr >= thresholds.rainfallMM) {
    triggers.push({
      type: 'extreme_rain',
      value: weatherData.rainfall_mm_3hr,
      threshold: thresholds.rainfallMM,
      severity: weatherData.rainfall_mm_3hr >= 80 ? 'extreme' : 'high',
    });
  }

  if (weatherData.temp >= thresholds.tempCelsius) {
    triggers.push({
      type: 'extreme_heat',
      value: weatherData.temp,
      threshold: thresholds.tempCelsius,
      severity: weatherData.temp >= 47 ? 'extreme' : 'high',
    });
  }

  if (weatherData.aqi >= thresholds.aqi) {
    triggers.push({
      type: 'severe_pollution',
      value: weatherData.aqi,
      threshold: thresholds.aqi,
      severity: weatherData.aqi >= 400 ? 'hazardous' : 'very_unhealthy',
    });
  }

  if (weatherData.wind_kmh >= thresholds.windSpeed) {
    triggers.push({
      type: 'high_wind',
      value: weatherData.wind_kmh,
      threshold: thresholds.windSpeed,
      severity: weatherData.wind_kmh >= 60 ? 'extreme' : 'high',
    });
  }

  if (weatherData.flood_alert && thresholds.floodAlert) {
    triggers.push({
      type: 'flood_alert',
      value: 1,
      threshold: 1,
      severity: 'high',
    });
  }

  return triggers;
}

// ─── Public API ───────────────────────────────────────────────────────────────
async function getWeatherForZone(city, zone) {
  // In production: call OpenWeatherMap or IMD API
  // For demo: return mock data
  const cityData = MOCK_WEATHER_DATA[city.toLowerCase()];
  if (!cityData) return null;
  const zoneKey = zone.toLowerCase().replace(' ', '_');
  return cityData[zoneKey] || Object.values(cityData)[0];
}

async function getSocialEventsForCity(city) {
  return MOCK_SOCIAL_EVENTS[city.toLowerCase()] || [];
}

async function getDisruptionReport(city, zone, policyThresholds) {
  const weather = await getWeatherForZone(city, zone);
  const socialEvents = await getSocialEventsForCity(city);

  const activeZoneEvents = socialEvents.filter(e =>
    e.active && (e.zones.includes(zone) || e.zones.length === 0)
  );

  if (!weather) return { triggered: false, triggers: [], events: [] };

  const weatherTriggers = evaluateWeatherTrigger(weather, policyThresholds);
  const triggered = weatherTriggers.length > 0 || activeZoneEvents.length > 0;

  return {
    triggered,
    weather,
    weatherTriggers,
    socialEvents: activeZoneEvents,
    timestamp: new Date().toISOString(),
    city,
    zone,
  };
}

// ─── Continuous Monitoring ────────────────────────────────────────────────────
function startMonitoring(city, zone, thresholds, onTrigger, intervalMs = 30000) {
  const check = async () => {
    const report = await getDisruptionReport(city, zone, thresholds);
    if (report.triggered) {
      onTrigger(report);
    }
  };
  check();
  return setInterval(check, intervalMs);
}

export { getWeatherForZone, getSocialEventsForCity, getDisruptionReport, startMonitoring, evaluateWeatherTrigger };
