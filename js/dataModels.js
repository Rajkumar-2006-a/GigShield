/**
 * GigShield Data Models
 * Core data structures for the parametric insurance platform
 */

// Worker Registration Model
const WorkerModel = {
  id: null,
  name: '',
  phone: '',
  platform: '', // 'zomato','swiggy','zepto','amazon','dunzo','blinkit'
  city: '',
  zone: '',
  weeklyEarnings: 0,          // avg weekly earnings in INR
  vehicleType: '',             // 'bike','cycle','foot'
  registeredAt: null,
  currentPolicyId: null,
  riskScore: 0,                // 0–100 (AI computed)
  verifiedDeviceId: null,      // Hardware fingerprint for anti-spoofing
  kycStatus: 'pending',        // pending | verified | flagged
};

// Weekly Policy Model
const PolicyModel = {
  id: null,
  workerId: null,
  weekStart: null,
  weekEnd: null,
  premiumAmount: 0,           // In INR (weekly)
  coverageAmount: 0,          // Max payout in INR
  status: 'active',           // active | expired | suspended
  triggerThresholds: {
    aqi: 300,                 // AQI above this triggers
    windSpeed: 45,            // km/h
    rainfallMM: 50,           // mm/3hr
    tempCelsius: 44,          // extreme heat
    floodAlert: true,
    strikeAlert: true,
  },
};

// Claim Model
const ClaimModel = {
  id: null,
  policyId: null,
  workerId: null,
  triggerEvent: '',            // 'extreme_rain','heat','flood','strike','aqi'
  claimedAt: null,
  locationAtClaim: { lat: 0, lng: 0 },
  deviceId: null,
  networkProvider: '',
  batteryLevel: 0,
  appVersion: '',
  activeOrders: 0,            // Orders active at time of claim
  payoutAmount: 0,
  status: 'pending',          // pending | approved | flagged | rejected | paid
  fraudScore: 0,              // 0–100 (AI computed)
  fraudFlags: [],             // Array of specific fraud signals detected
  reviewNotes: '',
};

// Fraud Syndicate Tracker
const FraudRingModel = {
  id: null,
  detectedAt: null,
  memberWorkerIds: [],
  commonTelegramGroup: null,  // detected via metadata pattern
  locationCluster: null,      // GPS cluster pattern
  coordinated: false,
  claimsInvolved: [],
  totalExposure: 0,           // INR amount at risk
  status: 'investigating',    // investigating | confirmed | cleared
};

// Disruption Event Model (from external APIs)
const DisruptionEvent = {
  id: null,
  type: '',                   // 'weather','strike','flood','pollution','curfew'
  severity: '',               // 'low','moderate','high','extreme'
  affectedZones: [],
  startTime: null,
  expectedEnd: null,
  apiSource: '',
  verified: false,
  triggerPayouts: false,
  affectedWorkerCount: 0,
};

// Weekly Premium Calculation Inputs
const PremiumInputs = {
  city: '',
  zone: '',
  platform: '',
  weeklyEarnings: 0,
  historicalClaimsCount: 0,
  riskScore: 0,
  seasonRiskMultiplier: 1.0,  // monsoon = 1.5, summer = 1.3, etc.
  vehicleType: '',
};

export {
  WorkerModel,
  PolicyModel,
  ClaimModel,
  FraudRingModel,
  DisruptionEvent,
  PremiumInputs,
};
