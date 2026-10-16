import Papa from 'papaparse';
import { format } from 'date-fns';
import type { WaterLevelReading, Station, TimeRange } from '../types';

export function exportWaterLevelCSV(
  readings: WaterLevelReading[],
  station: Station,
  timeRange: TimeRange
) {
  // Filter out gap-breaking markers inserted for chart disconnection (level === null or count === 0)
  const validReadings = readings.filter(
    (r) => r.level !== null && r.level !== undefined && !isNaN(Number(r.level))
  );

  const rows = validReadings.map((r) => {
    let timeValue = String(r.timestamp);

    try {
      const d = new Date(r.timestamp);
      if (!isNaN(d.getTime())) {
        timeValue = format(d, 'dd/MM/yyyy HH:mm:ss');
      }
    } catch {
      timeValue = String(r.timestamp);
    }

    const refName = station.referencePointName || 'จุดอ้างอิง';
    const sToRef = station.sensorToRefDistance;

    const val = r.level;
    const hasCrit = station.criticalLevel !== undefined && station.criticalLevel !== null;
    const hasWarn = station.warningLevel !== undefined && station.warningLevel !== null;

    let statusText = 'ปกติ';
    if (val != null) {
      if (hasCrit && val >= station.criticalLevel!) {
        statusText = 'วิกฤต';
      } else if (hasWarn && val >= station.warningLevel!) {
        statusText = 'เฝ้าระวัง';
      }
    }

    const blindZoneText = r.isBlindZone ? 'อยู่ในระยะจุดบอด (Blind Zone)' : 'ปกติ';

    return {
      'วันที่และเวลาตรวจวัด': timeValue,
      'รหัสสถานี': station.id,
      'ชื่อสถานี': station.name,
      'ตำแหน่ง/สถานที่': station.location || station.province || '-',
      'จุดอ้างอิง': refName,
      'ระยะเซนเซอร์ถึงจุดอ้างอิง (ม.)': sToRef != null && !isNaN(Number(sToRef)) ? Number(sToRef).toFixed(2) : '-',
      'ระดับน้ำตรวจวัดจริง (ม.)': val != null && !isNaN(Number(val)) ? (Number(val) > 0 ? '+' : '') + Number(val).toFixed(3) : '-',
      'ระยะห่างเซนเซอร์ถึงผิวน้ำ (ม.)': r.rawDistance != null && !isNaN(Number(r.rawDistance)) ? Number(r.rawDistance).toFixed(3) : '-',
      'สถานะจุดบอดเซนเซอร์': blindZoneText,
      'อุณหภูมิ (°C)': r.temperature != null && !isNaN(Number(r.temperature)) ? Number(r.temperature).toFixed(1) : '-',
      'ความชื้นสัมพัทธ์ (%)': r.humidity != null && !isNaN(Number(r.humidity)) ? Number(r.humidity).toFixed(1) : '-',
      'แรงดันแบตเตอรี่ (V)': r.batteryVoltage != null && !isNaN(Number(r.batteryVoltage)) ? Number(r.batteryVoltage).toFixed(2) : '-',
      'ระดับแบตเตอรี่ (%)': r.batteryPercent != null && !isNaN(Number(r.batteryPercent)) ? Number(r.batteryPercent).toFixed(0) : '-',
      'ความแรงสัญญาณ LoRa RSSI (dBm)': r.rssi != null && !isNaN(Number(r.rssi)) ? Number(r.rssi).toFixed(0) : '-',
      'อัตราสัญญาณต่อสัญญาณรบกวน SNR (dB)': r.snr != null && !isNaN(Number(r.snr)) ? Number(r.snr).toFixed(1) : '-',
      'มุมเอียงแกน X (องศา)': r.tiltX != null && !isNaN(Number(r.tiltX)) ? Number(r.tiltX).toFixed(2) : '-',
      'มุมเอียงแกน Y (องศา)': r.tiltY != null && !isNaN(Number(r.tiltY)) ? Number(r.tiltY).toFixed(2) : '-',
      'ละติจูด': station.lat != null && !isNaN(Number(station.lat)) ? Number(station.lat).toFixed(6) : '-',
      'ลองจิจูด': station.lng != null && !isNaN(Number(station.lng)) ? Number(station.lng).toFixed(6) : '-',
      'สถานะระดับน้ำ': statusText,
    };
  });

  const csv = Papa.unparse(rows, { header: true });
  const bom = '\uFEFF'; // UTF-8 BOM for Thai characters in Excel
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const rangeSuffix =
    timeRange === 'hourly'
      ? 'hourly_raw'
      : timeRange === 'daily'
      ? 'daily_raw'
      : 'weekly_raw';

  const link = document.createElement('a');
  link.href = url;
  link.download = `readings_${station.id}_${rangeSuffix}_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}


