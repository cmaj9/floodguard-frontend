import Papa from 'papaparse';
import { format } from 'date-fns';
import type { WaterLevelReading, Station, TimeRange } from '../types';

export function exportWaterLevelCSV(
  readings: WaterLevelReading[],
  station: Station,
  timeRange: TimeRange
) {
  const rows = readings.map((r) => {
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
    if (hasCrit && val >= station.criticalLevel!) {
      statusText = 'วิกฤต';
    } else if (hasWarn && val >= station.warningLevel!) {
      statusText = 'เฝ้าระวัง';
    }

    const blindZoneText = r.isBlindZone ? 'อยู่ในระยะจุดบอด (Blind Zone)' : 'ปกติ';

    return {
      'วันที่และเวลาตรวจวัด': timeValue,
      'รหัสสถานี': station.id,
      'ชื่อสถานี': station.name,
      'ตำแหน่ง/สถานที่': station.location || station.province || '-',
      'จุดอ้างอิง': refName,
      'ระยะเซนเซอร์ถึงจุดอ้างอิง (ม.)': sToRef !== undefined ? Number(sToRef).toFixed(2) : '-',
      'ระดับน้ำตรวจวัดจริง (ม.)': (val > 0 ? '+' : '') + val.toFixed(3),
      'ระยะห่างเซนเซอร์ถึงผิวน้ำ (ม.)': r.rawDistance != null ? Number(r.rawDistance).toFixed(3) : '-',
      'สถานะจุดบอดเซนเซอร์': blindZoneText,
      'อุณหภูมิ (°C)': r.temperature != null ? Number(r.temperature).toFixed(1) : '-',
      'ความชื้นสัมพัทธ์ (%)': r.humidity != null ? Number(r.humidity).toFixed(1) : '-',
      'แรงดันแบตเตอรี่ (V)': r.batteryVoltage != null ? Number(r.batteryVoltage).toFixed(2) : '-',
      'ระดับแบตเตอรี่ (%)': r.batteryPercent != null ? Number(r.batteryPercent).toFixed(0) : '-',
      'ความแรงสัญญาณ LoRa RSSI (dBm)': r.rssi != null ? Number(r.rssi).toFixed(0) : '-',
      'อัตราสัญญาณต่อสัญญาณรบกวน SNR (dB)': r.snr != null ? Number(r.snr).toFixed(1) : '-',
      'มุมเอียงแกน X (องศา)': r.tiltX != null ? Number(r.tiltX).toFixed(2) : '-',
      'มุมเอียงแกน Y (องศา)': r.tiltY != null ? Number(r.tiltY).toFixed(2) : '-',
      'ละติจูด': station.lat != null ? Number(station.lat).toFixed(6) : '-',
      'ลองจิจูด': station.lng != null ? Number(station.lng).toFixed(6) : '-',
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
  URL.revokeObjectURL(url);
}


