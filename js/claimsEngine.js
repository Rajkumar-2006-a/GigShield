/**
 * GigShield Claims Engine
 * Parametric automation: trigger monitoring → auto-claim initiation → instant payout
 */

import { getDisruptionReport } from './weatherService.js';
import { computeFraudScore, applyHonestWorkerProtection } from './fraudDetection.js';

// ─── Payout Rules ─────────────────────────────────────────────────────────────
const PAYOUT_RULES = {
  extreme_rain:      { percentOfCoverage: 100, minHours: 3 },
  flood_alert:       { percentOfCoverage: 100, minHours: 2 },
  extreme_heat:      { percentOfCoverage:  80, minHours: 4 },
  severe_pollution:  { percentOfCoverage:  60, minHours: 6 },
  strike:            { percentOfCoverage:  80, minHours: 2 },
  curfew:            { percentOfCoverage: 100, minHours: 1 },
  high_wind:         { percentOfCoverage:  70, minHours: 2 },
};

// ─── Auto-Claim Initiator ────────────────────────────────────────────────────
async function checkAndInitiateClaims(activeWorkers, allPolicies, allClaims, allWorkers) {
  const results = [];

  for (const worker of activeWorkers) {
    const policy = allPolicies.find(p =>
      p.workerId === worker.id && p.status === 'active'
    );
    if (!policy) continue;

    const report = await getDisruptionReport(worker.city, worker.zone, policy.triggerThresholds);
    if (!report.triggered) continue;

    // Check if claim already filed for this event today
    const today = new Date().toDateString();
    const alreadyClaimed = allClaims.some(c =>
      c.workerId === worker.id &&
      new Date(c.claimedAt).toDateString() === today &&
      report.weatherTriggers.some(t => t.type === c.triggerEvent)
    );
    if (alreadyClaimed) continue;

    // Auto-initiate parametric claim
    const claim = createParametricClaim(worker, policy, report);
    results.push({ worker, policy, claim, report });
  }

  return results;
}

function createParametricClaim(worker, policy, disruptionReport) {
  const trigger = disruptionReport.weatherTriggers[0] || { type: disruptionReport.socialEvents[0]?.type };
  const rule = PAYOUT_RULES[trigger.type] || { percentOfCoverage: 50, minHours: 2 };
  const payoutAmount = Math.round((policy.coverageAmount * rule.percentOfCoverage) / 100);

  return {
    id: `CLM-${Date.now()}-${worker.id.slice(0,6)}`,
    policyId: policy.id,
    workerId: worker.id,
    triggerEvent: trigger.type,
    triggerSeverity: trigger.severity,
    claimedAt: new Date().toISOString(),
    payoutAmount,
    status: 'pending_verification',
    autoInitiated: true,
    disruptionReport,
    fraudScore: null,
    fraudResult: null,
  };
}

// ─── Claim Verifier & Payout Processor ───────────────────────────────────────
async function verifyClaim(claim, claimData, workerHistory, recentClaims, allWorkers, weatherReport, workerProfile) {
  // Run fraud detection
  const fraudResult = computeFraudScore(claimData, workerHistory, recentClaims, allWorkers);

  // Apply honest worker protections
  const protections = applyHonestWorkerProtection(fraudResult, weatherReport, workerProfile);

  let finalDecision = fraudResult.decision;
  let adjustedScore = fraudResult.fraudScore;

  // Apply protections that reduce score
  for (const p of protections) {
    if (p.action === 'reduce_score') adjustedScore = Math.max(0, adjustedScore - 15);
    if (p.action === 'approve_with_note') finalDecision = 'approved';
    if (p.action === 'soft_flag_only' && finalDecision === 'flagged') finalDecision = 'soft_flag';
  }

  const updatedClaim = {
    ...claim,
    fraudScore: adjustedScore,
    fraudResult: { ...fraudResult, decision: finalDecision },
    protectionsApplied: protections,
    status: finalDecision === 'approved' ? 'approved' :
            finalDecision === 'soft_flag' ? 'approved_monitored' :
            finalDecision === 'flagged' ? 'under_review' : 'rejected',
    verifiedAt: new Date().toISOString(),
  };

  return updatedClaim;
}

// ─── Payout Processor ─────────────────────────────────────────────────────────
async function processPayout(claim, workerBankDetails) {
  if (!['approved', 'approved_monitored'].includes(claim.status)) {
    return { success: false, reason: 'Claim not approved for payout' };
  }

  // In production: integrate with payment gateway (Razorpay / NPCI UPI)
  // For demo: simulate instant UPI transfer
  const payoutRecord = {
    claimId: claim.id,
    workerId: claim.workerId,
    amount: claim.payoutAmount,
    method: 'UPI',
    upiId: workerBankDetails?.upiId || 'worker@upi',
    transactionId: `TXN-${Date.now()}`,
    processedAt: new Date().toISOString(),
    status: 'success',
    estimatedArrival: 'Instant (within 2 minutes)',
  };

  return { success: true, payout: payoutRecord };
}

// ─── Claims Summary ────────────────────────────────────────────────────────────
function getClaimStats(claims) {
  return {
    total: claims.length,
    approved: claims.filter(c => c.status === 'approved').length,
    pending: claims.filter(c => c.status === 'pending_verification').length,
    flagged: claims.filter(c => c.status === 'under_review').length,
    rejected: claims.filter(c => c.status === 'rejected').length,
    totalPayoutINR: claims
      .filter(c => ['approved','approved_monitored'].includes(c.status))
      .reduce((sum, c) => sum + c.payoutAmount, 0),
    fraudSavedINR: claims
      .filter(c => c.status === 'rejected')
      .reduce((sum, c) => sum + c.payoutAmount, 0),
  };
}

export { checkAndInitiateClaims, verifyClaim, processPayout, getClaimStats, createParametricClaim, PAYOUT_RULES };
