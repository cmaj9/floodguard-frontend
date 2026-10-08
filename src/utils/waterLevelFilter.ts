import { format } from 'date-fns';
import type { WaterLevelReading, Station, TimeRange } from '../types';

/**
 * 3-Layer Intelligent Hydrological Filter
 *
 * Layer 1: Deduplication & Burst Throttling (ตัดข้อมูลซ้ำจากบั๊ค/การทดสอบโหนด)
 * Layer 2: Adaptive Glitch Filter with Temporal Persistence (แยกแยะบั๊ค vs น้ำขึ้นฉับพลันจริง)
 * Layer 3: Time-Window Resampling & Offline Gap Line Break (เกลี่ยข้อมูลตามช่วงเวลาและตัดเส้นช่วงออฟไลน์)
 */

/**
 * Layer 1: Deduplicate rapid duplicate pings and firmware reboot bursts
 */
export function deduplicateAndThrottle(readings: WaterLevelReading[]): WaterLevelReading[] {
  if (readings.length <= 1) return readings;

  const sorted = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const clean: WaterLevelReading[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const curr = sorted[i];
    const currTime = new Date(curr.timestamp).getTime();

    if (clean.length === 0) {
      clean.push(curr);
      continue;
    }

    const prev = clean[clean.length - 1];
    const prevTime = new Date(prev.timestamp).getTime();
    const dtSeconds = (currTime - prevTime) / 1000;

    // 1. Throttling bursts: if transmission arrives in < 5 seconds (rapid loop bug / boot loop)
    if (dtSeconds < 5) {
      continue; // Skip duplicate burst
    }

    // 2. Exact identical level/distance within < 60 seconds
    const isIdentical =
      Math.abs(curr.level - prev.level) < 0.001 &&
      (curr.rawDistance == null || prev.rawDistance == null || Math.abs(curr.rawDistance - prev.rawDistance) < 0.001);

    if (isIdentical && dtSeconds < 60) {
      continue; // Skip rapid identical duplicate
    }

    clean.push(curr);
  }

  return clean;
}

/**
 * Helper to compute median of a number array
 */
function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Layer 2: Adaptive Glitch Filter with Temporal Persistence Rule
 *
 * Crucial Rule:
 * - If level jumps and IMMEDIATELY drops back on the next single point = GLITCH/BUG (remove/replace with local median)
 * - If level jumps and STAYS ELEVATED across consecutive points = REAL WATER SURGE / FLASH FLOOD (preserve 100%)
 */
export function filterGlitchesWithPersistence(readings: WaterLevelReading[]): WaterLevelReading[] {
  if (readings.length <= 2) return readings;

  const n = readings.length;
  const result: WaterLevelReading[] = [];

  for (let i = 0; i < n; i++) {
    const curr = readings[i];
    const currVal = curr.level;

    // Boundary points keep original
    if (i === 0 || i === n - 1) {
      result.push(curr);
      continue;
    }

    const prev = readings[i - 1];
    const next = readings[i + 1];

    // Compute local window median and MAD (window size 5 to 7)
    const winStart = Math.max(0, i - 3);
    const winEnd = Math.min(n, i + 4);
    const windowVals = readings.slice(winStart, winEnd).map((r) => r.level);
    const winMedian = median(windowVals);
    const deviations = windowVals.map((v) => Math.abs(v - winMedian));
    const mad = median(deviations);

    // Adaptive scale: 3 * 1.4826 * MAD, with minimum noise floor of 0.06m (6cm) to allow natural calm water
    const adaptiveThreshold = Math.max(0.06, 3.0 * 1.4826 * mad);

    const jumpFromPrev = currVal - prev.level;
    const jumpToNext = currVal - next.level;

    // Check if this point is an impulse needle (rises then drops, or drops then rises)
    const isPeakNeedle = jumpFromPrev > adaptiveThreshold && jumpToNext > adaptiveThreshold;
    const isValleyNeedle = jumpFromPrev < -adaptiveThreshold && jumpToNext < -adaptiveThreshold;
    const isIsolatedNeedle = isPeakNeedle || isValleyNeedle;

    // Check Temporal Persistence:
    // If it's a real sudden flood, point i+1 (and i+2 if available) will STAY HIGH!
    let isSustainedRise = false;
    if (i < n - 2) {
      const nextNext = readings[i + 2];
      // If next point is close to current point (staying elevated), or continuing upward
      const nextSustained = Math.abs(next.level - currVal) < Math.abs(jumpFromPrev) * 0.5;
      const nextNextSustained = Math.abs(nextNext.level - currVal) < Math.abs(jumpFromPrev) * 0.6;
      if (nextSustained || nextNextSustained) {
        isSustainedRise = true;
      }
    } else {
      // If at end of array and next point stays high
      if (Math.abs(next.level - currVal) < Math.abs(jumpFromPrev) * 0.5) {
        isSustainedRise = true;
      }
    }

    if (isIsolatedNeedle && !isSustainedRise) {
      // THIS IS A SENSOR GLITCH / CLOUD OF MULTIPATH ECHO
      // Replace with local median or smooth interpolation between neighbors
      const smoothedLevel = Number(winMedian.toFixed(3));
      result.push({
        ...curr,
        level: smoothedLevel,
        minLevel: smoothedLevel,
        maxLevel: smoothedLevel,
      });
    } else {
      // THIS IS REAL WATER (or legitimate persistent trend) - PRESERVE 100%!
      result.push(curr);
    }
  }

  return result;
}

/**
 * Layer 3: Time-Window Resampling & Offline Gap Line Breaking
 *
 * Offline Gap Thresholds:
 * - hourly: > 30 minutes
 * - daily: > 2 hours
 * - weekly: > 6 hours
 */
export function resampleAndBreakGaps(
  readings: WaterLevelReading[],
  timeRange: TimeRange,
  _station?: Station
): WaterLevelReading[] {
  if (readings.length === 0) return [];

  // Determine gap threshold in milliseconds
  let gapThresholdMs = 2 * 60 * 60 * 1000; // default 2 hours
  if (timeRange === 'hourly') {
    gapThresholdMs = 30 * 60 * 1000; // 30 minutes
  } else if (timeRange === 'daily') {
    gapThresholdMs = 2 * 60 * 60 * 1000; // 2 hours
  } else if (timeRange === 'weekly') {
    gapThresholdMs = 6 * 60 * 60 * 1000; // 6 hours
  }

  // Determine binning interval in milliseconds (for daily/weekly smoothing)
  let binIntervalMs = 0;
  if (timeRange === 'daily') {
    binIntervalMs = 15 * 60 * 1000; // 15-minute bins for daily
  } else if (timeRange === 'weekly') {
    binIntervalMs = 60 * 60 * 1000; // 1-hour bins for weekly
  }

  // 1. Optional Time Binning for daily/weekly to eliminate barcode noise
  let binned: WaterLevelReading[] = [];

  if (binIntervalMs > 0) {
    const bins = new Map<number, WaterLevelReading[]>();

    readings.forEach((r) => {
      const t = new Date(r.timestamp).getTime();
      const binKey = Math.floor(t / binIntervalMs) * binIntervalMs;
      if (!bins.has(binKey)) bins.set(binKey, []);
      bins.get(binKey)!.push(r);
    });

    const sortedBinKeys = [...bins.keys()].sort((a, b) => a - b);

    sortedBinKeys.forEach((binKey) => {
      const items = bins.get(binKey)!;
      if (items.length === 1) {
        binned.push(items[0]);
        return;
      }

      // Compute median level of the bin
      const levels = items.map((it) => it.level);
      const binMedianLevel = Number(median(levels).toFixed(3));
      const minL = Math.min(...levels);
      const maxL = Math.max(...levels);

      // Representative reading is the median item or middle item
      const midItem = items[Math.floor(items.length / 2)];

      binned.push({
        ...midItem,
        timestamp: new Date(binKey + binIntervalMs / 2).toISOString(),
        level: binMedianLevel,
        minLevel: minL,
        maxLevel: maxL,
        count: items.length,
      });
    });
  } else {
    binned = readings;
  }

  // 2. Offline Gap Breaking (inserting null level to break Recharts line across offline periods)
  const finalResult: WaterLevelReading[] = [];

  for (let i = 0; i < binned.length; i++) {
    const curr = binned[i];
    const currTime = new Date(curr.timestamp).getTime();

    if (i > 0) {
      const prev = binned[i - 1];
      const prevTime = new Date(prev.timestamp).getTime();
      const deltaMs = currTime - prevTime;

      // If gap exceeds threshold, insert break marker
      if (deltaMs > gapThresholdMs) {
        // Insert a null-level point just after prevTime to break the line
        const gapTime = new Date(prevTime + Math.min(deltaMs / 2, 60 * 1000)).toISOString();
        finalResult.push({
          timestamp: gapTime,
          level: (null as unknown) as number, // Breaks Recharts line cleanly
          stationId: curr.stationId,
          minLevel: 0,
          maxLevel: 0,
          count: 0,
          label: format(new Date(gapTime), 'dd/MM HH:mm'),
        });
      }
    }

    finalResult.push(curr);
  }

  return finalResult;
}

/**
 * Main 3-Layer Intelligent Filter Entrypoint
 */
export function applyWaterLevelFilter(
  readings: WaterLevelReading[],
  timeRange: TimeRange,
  station?: Station
): WaterLevelReading[] {
  if (!readings || readings.length === 0) return [];

  // Layer 1: Throttling bursts & duplicates
  const deduped = deduplicateAndThrottle(readings);

  // Layer 2: Adaptive Hampel Outlier with Persistence Rule
  const cleanGlitches = filterGlitchesWithPersistence(deduped);

  // Layer 3: Time-Window Resampling & Offline Gap Breaks
  const finalFiltered = resampleAndBreakGaps(cleanGlitches, timeRange, station);

  return finalFiltered;
}

export interface NodeOutage {
  id: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  formattedDuration: string;
  startBattery?: { percent?: number; voltage?: number };
  endBattery?: { percent?: number; voltage?: number };
  reason: 'battery_depleted' | 'signal_lost' | 'unknown';
  reasonText: string;
}

/**
 * ตรวจจับช่วงเวลาที่โหนดขาดการเชื่อมต่อ (Outage Detection) เกินกว่าเกณฑ์ Offline Gap
 */
export function detectOutages(
  readings: WaterLevelReading[],
  timeRange: TimeRange
): NodeOutage[] {
  if (!readings || readings.length <= 1) return [];

  // กำหนดเกณฑ์เวลาออฟไลน์ตาม TimeRange (สอดคล้องกับ resampleAndBreakGaps)
  let gapThresholdMs = 2 * 60 * 60 * 1000;
  if (timeRange === 'hourly') {
    gapThresholdMs = 30 * 60 * 1000; // 30 นาที
  } else if (timeRange === 'daily') {
    gapThresholdMs = 2 * 60 * 60 * 1000; // 2 ชั่วโมง
  } else if (timeRange === 'weekly') {
    gapThresholdMs = 6 * 60 * 60 * 1000; // 6 ชั่วโมง
  }

  // กรองจุดหลอกที่เป็น null ออกและเรียงลำดับเวลา
  const realReadings = readings
    .filter((r) => r.level !== null && typeof r.level === 'number' && !isNaN(r.level))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const outages: NodeOutage[] = [];

  for (let i = 1; i < realReadings.length; i++) {
    const prev = realReadings[i - 1];
    const curr = realReadings[i];
    const prevT = new Date(prev.timestamp).getTime();
    const currT = new Date(curr.timestamp).getTime();
    const deltaMs = currT - prevT;

    if (deltaMs > gapThresholdMs) {
      const durationMinutes = Math.round(deltaMs / (60 * 1000));
      const hours = Math.floor(durationMinutes / 60);
      const mins = durationMinutes % 60;
      const formattedDuration =
        hours > 0 ? `${hours} ชม. ${mins > 0 ? `${mins} นาที` : ''}` : `${mins} นาที`;

      const prevBattPct = prev.batteryPercent;
      const prevBattV = prev.batteryVoltage;
      const isBattLow =
        (prevBattPct != null && prevBattPct <= 20) ||
        (prevBattV != null && prevBattV <= 11.5);

      let reason: 'battery_depleted' | 'signal_lost' | 'unknown' = 'unknown';
      let reasonText = '';

      if (isBattLow) {
        reason = 'battery_depleted';
        reasonText = `แบตเตอรี่หมดประจุ (${prevBattPct ?? 0}%${prevBattV ? ` · ${prevBattV.toFixed(2)}V` : ''})`;
      } else {
        reason = 'signal_lost';
        reasonText = 'ขาดการเชื่อมต่อสัญญาณวิทยุ';
      }

      outages.push({
        id: `outage-${prevT}-${currT}`,
        startTime: prev.timestamp,
        endTime: curr.timestamp,
        durationMinutes,
        formattedDuration,
        startBattery: {
          percent: prev.batteryPercent != null ? Number(prev.batteryPercent) : undefined,
          voltage: prev.batteryVoltage != null ? Number(prev.batteryVoltage) : undefined,
        },
        endBattery: {
          percent: curr.batteryPercent != null ? Number(curr.batteryPercent) : undefined,
          voltage: curr.batteryVoltage != null ? Number(curr.batteryVoltage) : undefined,
        },
        reason,
        reasonText,
      });
    }
  }

  // เรียงลำดับจากเหตุการณ์ล่าสุดไปหาอดีต
  return outages.sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );
}

