/**
 * GigShield Risk Assessment Engine
 * AI-powered dynamic weekly premium calculation and predictive risk modeling
 */

// ─── City/Zone Risk Matrices ──────────────────────────────────────────────────
const CITY_BASE_RISK = {
  mumbai:    { flood: 0.85, rain: 0.90, heat: 0.20, aqi: 0.30, strike: 0.40 },
  delhi:     { flood: 0.20, rain: 0.30, heat: 0.95, aqi: 0.95, strike: 0.50 },
  bengaluru: { flood: 0.40, rain: 0.70, heat: 0.25, aqi: 0.20, strike: 0.25 },
  hyderabad: { flood: 0.50, rain: 0.60, heat: 0.80, aqi: 0.40, strike: 0.30 },
  chennai:   { flood: 0.60, rain: 0.75, heat: 0.85, aqi: 0.35, strike: 0.25 },
  pune:      { flood: 0.35, rain: 0.65, heat: 0.45, aqi: 0.30, strike: 0.20 },
};

// Monthly seasonal risk multipliers (1 = Jan, 12 = Dec)
const SEASONAL_MULTIPLIERS = [
  1.0,  // Jan
  1.0,  // Feb
  1.1,  // Mar
  1.3,  // Apr - heating up
  1.4,  // May - peak heat
  1.6,  // Jun - monsoon start
  1.8,  // Jul - peak monsoon
  1.7,  // Aug - monsoon
  1.5,  // Sep - monsoon end
  1.2,  // Oct - post monsoon
  1.1,  // Nov
  1.0,  // Dec
];

// Platform exposure factors
const PLATFORM_EXPOSURE = {
  zomato:  0.90,  // High order density, weather impacted
  swiggy:  0.88,
  zepto:   0.95,  // Hyperlocal, 10-min, premium
  amazon:  0.60,  // Can delay, lower urgency
  dunzo:   0.85,
  blinkit: 0.92,
};

// Vehicle risk factors
const VEHICLE_RISK = {
  bike:  1.0,
  cycle: 1.3,   // Most vulnerable
  foot:  1.2,
  auto:  0.8,
  car:   0.6,
};

// ─── Premium Calculator ────────────────────────────────────────────────────────
function calculateWeeklyPremium(inputs) {
  const {
    city,
    platform,
    weeklyEarnings,
    vehicleType,
    historicalClaimsCount = 0,
    kycStatus = 'verified',
  } = inputs;

  const month = new Date().getMonth(); // 0-indexed
  const seasonMultiplier = SEASONAL_MULTIPLIERS[month];
  const cityRisk = CITY_BASE_RISK[city.toLowerCase()] || { flood: 0.4, rain: 0.5, heat: 0.4, aqi: 0.3, strike: 0.3 };
  const platformFactor = PLATFORM_EXPOSURE[platform.toLowerCase()] || 0.80;
  const vehicleFactor = VEHICLE_RISK[vehicleType.toLowerCase()] || 1.0;

  // Composite city risk (weighted average)
  const avgCityRisk = (
    cityRisk.flood * 0.25 +
    cityRisk.rain  * 0.30 +
    cityRisk.heat  * 0.20 +
    cityRisk.aqi   * 0.15 +
    cityRisk.strike* 0.10
  );

  // Claims history loading
  const claimsLoading = 1 + (historicalClaimsCount * 0.08);

  // KYC discount
  const kycDiscount = kycStatus === 'verified' ? 0.95 : 1.0;

  // Base premium = 1.5% of weekly earnings
  const basePremium = weeklyEarnings * 0.015;

  // Final premium
  const premium = basePremium
    * avgCityRisk
    * seasonMultiplier
    * platformFactor
    * vehicleFactor
    * claimsLoading
    * kycDiscount;

  // Coverage = 3x weekly earnings, capped at ₹3000
  const coverage = Math.min(weeklyEarnings * 3, 3000);

  return {
    weeklyPremium: Math.round(premium),
    coverageAmount: coverage,
    breakdown: {
      basePremium: Math.round(basePremium),
      cityRiskScore: Math.round(avgCityRisk * 100),
      seasonMultiplier,
      platformFactor,
      vehicleFactor,
      claimsLoading,
      kycDiscount,
    },
    policyTiers: getPolicyTiers(weeklyEarnings),
  };
}

function getPolicyTiers(weeklyEarnings) {
  return [
    {
      name: 'Basic Shield',
      weeklyPremium: Math.round(weeklyEarnings * 0.008),
      coverage: Math.min(weeklyEarnings * 1.5, 1000),
      triggers: ['extreme_rain', 'flood_alert'],
      color: '#4CAF50',
    },
    {
      name: 'Full Shield',
      weeklyPremium: Math.round(weeklyEarnings * 0.015),
      coverage: Math.min(weeklyEarnings * 3, 3000),
      triggers: ['extreme_rain', 'flood_alert', 'extreme_heat', 'severe_pollution', 'strike'],
      color: '#2196F3',
      recommended: true,
    },
    {
      name: 'Elite Shield',
      weeklyPremium: Math.round(weeklyEarnings * 0.025),
      coverage: Math.min(weeklyEarnings * 5, 5000),
      triggers: ['extreme_rain', 'flood_alert', 'extreme_heat', 'severe_pollution', 'strike', 'curfew', 'high_wind'],
      color: '#9C27B0',
    },
  ];
}

// ─── Worker Risk Score ────────────────────────────────────────────────────────
function computeWorkerRiskScore(worker, claimHistory, locationData) {
  let score = 50; // baseline

  // Zone risk
  const cityRisk = CITY_BASE_RISK[worker.city?.toLowerCase()];
  if (cityRisk) score += (Object.values(cityRisk).reduce((a,b)=>a+b,0)/5) * 20;

  // Claims history
  score += claimHistory.length * 3;
  score -= claimHistory.filter(c => c.status === 'rejected').length * 8;

  // Time on platform (trust)
  const monthsActive = worker.monthsActive || 1;
  score -= Math.min(monthsActive * 0.5, 10);

  // KYC boost
  if (worker.kycStatus === 'verified') score -= 5;

  // Cap
  return Math.max(0, Math.min(100, Math.round(score)));
}

export { calculateWeeklyPremium, computeWorkerRiskScore, getPolicyTiers, CITY_BASE_RISK, SEASONAL_MULTIPLIERS };
