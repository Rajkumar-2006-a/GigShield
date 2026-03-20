/**
 * GigShield Fraud Detection Engine
 * Multi-signal AI system to detect GPS spoofing, coordinated fraud rings,
 * and distinguish genuine stranded gig workers from bad actors.
 *
 * This is the ADVERSARIAL DEFENSE core of the platform.
 */

// ─── Signal Weights for Fraud Scoring ────────────────────────────────────────
const FRAUD_SIGNAL_WEIGHTS = {
  // GPS & Location signals
  gps_accuracy_poor:           8,   // GPS accuracy > 100m (spoofing apps)
  location_unchanged_30min:    10,  // Exact same coordinates for 30+ min
  location_at_home:            15,  // GPS matches registered home address
  mock_location_flag:          20,  // Android mock location enabled
  multiple_devices_same_gps:   25,  // 5+ workers same GPS cluster
  vpn_detected:                12,  // VPN/proxy during claim submission
  no_movement_history:         8,   // No location trail in last 2 hours
  zone_mismatch:               10,  // GPS zone ≠ policy registered zone

  // Behavioral & Temporal signals
  claim_outside_working_hours:  5,  // Claim at 3AM, unusual
  speed_anomaly:               12,  // Device shows 0 km/h in traffic area
  accelerometer_idle:          10,  // No phone movement (sitting at home)
  battery_anomaly:              6,  // Battery at 98% (not working all day)
  screen_on_time_low:           5,  // Screen rarely on (not using delivery app)

  // Network & Device signals
  emulator_detected:            25, // Running on Android emulator
  root_access_detected:         18, // Rooted device (can install spoof apps)
  app_not_foreground:           8,  // Delivery app not in foreground
  sim_swap_recent:              10, // SIM changed in last 7 days
  shared_device_id:             20, // Device ID used by multiple profiles

  // Claim Pattern signals
  first_claim_within_7_days:    5,  // New user, immediate claim
  multiple_claims_same_event:   15, // Already claimed for this event today
  claim_pattern_repeating:      12, // Claims every event, every week
  claim_timing_too_fast:        8,  // Claim within 2 min of event trigger (bot)
  no_active_orders:             10, // 0 active orders but claiming income loss

  // Syndicate signals
  shared_telegram_metadata:     20, // Claim metadata matches known fraud group timing
  coordinated_submission_wave:  22, // 50+ claims within 5-min window from one zone
  referral_chain_fraud:          8,  // Referred by already-flagged worker
};

// ─── GPS Spoofing Detector ────────────────────────────────────────────────────
function detectGPSSpoofing(claimData) {
  const signals = [];
  let spoofScore = 0;

  const { location, device, workerHomeLocation, claimTimestamp } = claimData;

  // Check 1: GPS accuracy
  if (location.accuracy > 100) {
    signals.push({ signal: 'gps_accuracy_poor', value: location.accuracy, weight: FRAUD_SIGNAL_WEIGHTS.gps_accuracy_poor });
    spoofScore += FRAUD_SIGNAL_WEIGHTS.gps_accuracy_poor;
  }

  // Check 2: Location unchanged for 30 min
  if (location.unchangedMinutes >= 30) {
    signals.push({ signal: 'location_unchanged_30min', value: location.unchangedMinutes, weight: FRAUD_SIGNAL_WEIGHTS.location_unchanged_30min });
    spoofScore += FRAUD_SIGNAL_WEIGHTS.location_unchanged_30min;
  }

  // Check 3: GPS matches home address
  if (workerHomeLocation && distanceKm(location, workerHomeLocation) < 0.1) {
    signals.push({ signal: 'location_at_home', value: 'home_match', weight: FRAUD_SIGNAL_WEIGHTS.location_at_home });
    spoofScore += FRAUD_SIGNAL_WEIGHTS.location_at_home;
  }

  // Check 4: Mock location API enabled
  if (device.mockLocationEnabled) {
    signals.push({ signal: 'mock_location_flag', value: true, weight: FRAUD_SIGNAL_WEIGHTS.mock_location_flag });
    spoofScore += FRAUD_SIGNAL_WEIGHTS.mock_location_flag;
  }

  // Check 5: VPN detected
  if (device.vpnActive) {
    signals.push({ signal: 'vpn_detected', value: true, weight: FRAUD_SIGNAL_WEIGHTS.vpn_detected });
    spoofScore += FRAUD_SIGNAL_WEIGHTS.vpn_detected;
  }

  return { spoofScore, signals };
}

// ─── Behavioral Anomaly Detector ──────────────────────────────────────────────
function detectBehavioralAnomalies(claimData, workerHistory) {
  const signals = [];
  let behaviorScore = 0;

  const { device, claim, worker } = claimData;

  // No movement / accelerometer idle
  if (device.accelerometerMovement < 0.5) {
    signals.push({ signal: 'accelerometer_idle', weight: FRAUD_SIGNAL_WEIGHTS.accelerometer_idle });
    behaviorScore += FRAUD_SIGNAL_WEIGHTS.accelerometer_idle;
  }

  // Battery too high (not actively working)
  if (device.batteryPercent > 90) {
    signals.push({ signal: 'battery_anomaly', value: device.batteryPercent, weight: FRAUD_SIGNAL_WEIGHTS.battery_anomaly });
    behaviorScore += FRAUD_SIGNAL_WEIGHTS.battery_anomaly;
  }

  // Delivery app not in foreground
  if (!device.deliveryAppForeground) {
    signals.push({ signal: 'app_not_foreground', weight: FRAUD_SIGNAL_WEIGHTS.app_not_foreground });
    behaviorScore += FRAUD_SIGNAL_WEIGHTS.app_not_foreground;
  }

  // No active orders at claim time
  if (claim.activeOrders === 0) {
    signals.push({ signal: 'no_active_orders', weight: FRAUD_SIGNAL_WEIGHTS.no_active_orders });
    behaviorScore += FRAUD_SIGNAL_WEIGHTS.no_active_orders;
  }

  // Speed anomaly (device reports 0 km/h in delivery zone)
  if (device.speedKmh < 1 && !claim.weatherForceStop) {
    signals.push({ signal: 'speed_anomaly', value: device.speedKmh, weight: FRAUD_SIGNAL_WEIGHTS.speed_anomaly });
    behaviorScore += FRAUD_SIGNAL_WEIGHTS.speed_anomaly;
  }

  // Claim submitted too fast (within 90 sec of trigger - likely a bot)
  if (claim.secondsAfterTrigger < 90) {
    signals.push({ signal: 'claim_timing_too_fast', value: claim.secondsAfterTrigger, weight: FRAUD_SIGNAL_WEIGHTS.claim_timing_too_fast });
    behaviorScore += FRAUD_SIGNAL_WEIGHTS.claim_timing_too_fast;
  }

  // Repeating claim pattern
  const recentClaims = workerHistory.filter(c => {
    const daysAgo = (Date.now() - new Date(c.claimedAt).getTime()) / 86400000;
    return daysAgo <= 30;
  });
  if (recentClaims.length >= 4) {
    signals.push({ signal: 'claim_pattern_repeating', value: recentClaims.length, weight: FRAUD_SIGNAL_WEIGHTS.claim_pattern_repeating });
    behaviorScore += FRAUD_SIGNAL_WEIGHTS.claim_pattern_repeating;
  }

  return { behaviorScore, signals };
}

// ─── Fraud Ring / Syndicate Detector ─────────────────────────────────────────
function detectFraudRing(newClaim, recentClaims, allWorkers) {
  const signals = [];
  let ringScore = 0;

  const windowStart = Date.now() - 5 * 60 * 1000; // last 5 minutes
  const recentBurst = recentClaims.filter(c => new Date(c.claimedAt).getTime() > windowStart);

  // Coordinated submission wave
  if (recentBurst.length >= 50) {
    signals.push({
      signal: 'coordinated_submission_wave',
      value: recentBurst.length,
      weight: FRAUD_SIGNAL_WEIGHTS.coordinated_submission_wave,
      detail: `${recentBurst.length} claims filed in last 5 minutes from the same zone`,
    });
    ringScore += FRAUD_SIGNAL_WEIGHTS.coordinated_submission_wave;
  }

  // GPS clustering - 5+ workers at near-identical coordinates
  const locationClusters = findLocationClusters(recentBurst, 0.05); // 50m radius
  const suspiciousCluster = locationClusters.find(c => c.workerIds.length >= 5);
  if (suspiciousCluster) {
    signals.push({
      signal: 'multiple_devices_same_gps',
      value: suspiciousCluster.workerIds.length,
      weight: FRAUD_SIGNAL_WEIGHTS.multiple_devices_same_gps,
      detail: `${suspiciousCluster.workerIds.length} workers at identical GPS coordinates`,
    });
    ringScore += FRAUD_SIGNAL_WEIGHTS.multiple_devices_same_gps;
  }

  // Shared device ID across profiles
  const claimantWorker = allWorkers.find(w => w.id === newClaim.workerId);
  if (claimantWorker) {
    const sharedDevice = allWorkers.filter(w => w.deviceId === claimantWorker.deviceId && w.id !== claimantWorker.id);
    if (sharedDevice.length > 0) {
      signals.push({
        signal: 'shared_device_id',
        value: sharedDevice.length + 1,
        weight: FRAUD_SIGNAL_WEIGHTS.shared_device_id,
        detail: `Device ID shared across ${sharedDevice.length + 1} worker profiles`,
      });
      ringScore += FRAUD_SIGNAL_WEIGHTS.shared_device_id;
    }
  }

  return { ringScore, signals };
}

// ─── Master Fraud Scorer ──────────────────────────────────────────────────────
function computeFraudScore(claimData, workerHistory, recentClaims, allWorkers) {
  const gpsResult = detectGPSSpoofing(claimData);
  const behaviorResult = detectBehavioralAnomalies(claimData, workerHistory);
  const ringResult = detectFraudRing(claimData.claim, recentClaims, allWorkers);

  const totalScore = gpsResult.spoofScore + behaviorResult.behaviorScore + ringResult.ringScore;
  const allSignals = [...gpsResult.signals, ...behaviorResult.signals, ...ringResult.signals];

  // Map score to decision
  let decision, escalate;
  if (totalScore < 20) {
    decision = 'approved';
    escalate = false;
  } else if (totalScore < 50) {
    decision = 'soft_flag';  // APPROVE with enhanced monitoring
    escalate = false;
  } else if (totalScore < 75) {
    decision = 'flagged';    // Human review required
    escalate = true;
  } else {
    decision = 'rejected';   // High-confidence fraud
    escalate = true;
  }

  return {
    fraudScore: Math.min(totalScore, 100),
    decision,
    escalate,
    signals: allSignals,
    breakdown: {
      gpsScore: gpsResult.spoofScore,
      behaviorScore: behaviorResult.behaviorScore,
      ringScore: ringResult.ringScore,
    },
    explanation: generateExplanation(allSignals, decision),
  };
}

// ─── Honest Worker Protection Logic ─────────────────────────────────────────
/**
 * GigShield's "Benefit of Doubt" protocol for genuinely stranded workers.
 * A high fraud score doesn't immediately mean rejection — context matters.
 */
function applyHonestWorkerProtection(fraudResult, weatherReport, workerProfile) {
  const protections = [];

  // If GPS shows home address BUT weather confirms worker's zone is impassable
  if (fraudResult.signals.some(s => s.signal === 'location_at_home') &&
      weatherReport?.triggered &&
      workerProfile.monthsActive > 3) {
    protections.push({
      protection: 'weather_verified_zone_block',
      action: 'approve_with_note',
      reason: 'Worker in disrupted zone. Physical travel home is rational behavior during extreme weather.',
    });
  }

  // If network drop detected (not spoofing) — GPS gaps are expected
  if (fraudResult.signals.some(s => s.signal === 'gps_accuracy_poor') &&
      workerProfile.networkProvider === 'low_coverage_area') {
    protections.push({
      protection: 'network_gap_excuse',
      action: 'reduce_score',
      reason: 'GPS inaccuracy attributable to known low-coverage area during storm.',
    });
  }

  // Veteran worker first suspicious flag
  if (workerProfile.monthsActive > 12 && fraudResult.fraudScore < 60 &&
      workerProfile.previousFraudFlags === 0) {
    protections.push({
      protection: 'veteran_trust_buffer',
      action: 'soft_flag_only',
      reason: 'Established worker with clean history. Minor anomalies allowed in extreme conditions.',
    });
  }

  return protections;
}

// ─── Utility Functions ───────────────────────────────────────────────────────
function distanceKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat/2)*Math.sin(dLat/2) +
             Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*
             Math.sin(dLon/2)*Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}

function findLocationClusters(claims, radiusKm) {
  const clusters = [];
  const visited = new Set();
  for (let i = 0; i < claims.length; i++) {
    if (visited.has(i)) continue;
    const cluster = { center: claims[i].location, workerIds: [claims[i].workerId] };
    for (let j = i + 1; j < claims.length; j++) {
      if (!visited.has(j) && distanceKm(claims[i].location, claims[j].location) < radiusKm) {
        cluster.workerIds.push(claims[j].workerId);
        visited.add(j);
      }
    }
    if (cluster.workerIds.length > 1) clusters.push(cluster);
    visited.add(i);
  }
  return clusters;
}

function generateExplanation(signals, decision) {
  if (signals.length === 0) return 'No fraud signals detected. Claim approved automatically.';
  const topSignals = signals.sort((a,b) => b.weight - a.weight).slice(0,3);
  const signalDescriptions = {
    mock_location_flag: 'GPS mock location app detected on device',
    location_at_home: 'GPS coordinates match worker\'s registered home address',
    multiple_devices_same_gps: 'Multiple workers sharing identical GPS coordinates',
    coordinated_submission_wave: 'Mass coordinated claims submission detected',
    shared_device_id: 'Device is registered to multiple worker accounts',
    accelerometer_idle: 'No physical movement detected on device',
    no_active_orders: 'No active delivery orders at time of claim',
    claim_timing_too_fast: 'Claim submitted suspiciously fast after event trigger',
  };
  const desc = topSignals.map(s => signalDescriptions[s.signal] || s.signal).join('; ');
  return `Decision: ${decision.toUpperCase()}. Top signals: ${desc}.`;
}

export {
  computeFraudScore,
  detectGPSSpoofing,
  detectBehavioralAnomalies,
  detectFraudRing,
  applyHonestWorkerProtection,
  FRAUD_SIGNAL_WEIGHTS,
};
