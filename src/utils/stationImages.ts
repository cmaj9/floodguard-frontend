// Station equipment photos and SVG fallbacks
// Replicating real hydrological telemetry stations (Fixed pole with solar panel, Laser/Radar arm, Floating buoy)

export const DEFAULT_STATION_PHOTOS: Record<string, string> = {
  fixed_solar: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
  pole_enclosure: 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=800&q=80',
  river_radar: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80',
  river_laser: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
  floating_buoy: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=800&q=80',
};

// High-fidelity fallback SVG illustrations mimicking the reference photo equipment
export const SVG_STATION_FALLBACKS: Record<string, string> = {
  fixed: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360" width="100%" height="100%">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3b82f6" />
          <stop offset="60%" stop-color="#60a5fa" />
          <stop offset="100%" stop-color="#93c5fd" />
        </linearGradient>
        <linearGradient id="metal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#94a3b8" />
          <stop offset="50%" stop-color="#cbd5e1" />
          <stop offset="100%" stop-color="#64748b" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#sky)" />
      <!-- Distant Trees -->
      <path d="M0,320 Q120,290 240,310 T480,295 T600,320 L600,360 L0,360 Z" fill="#1e3a8a" opacity="0.3" />
      <!-- Telemetry Pole -->
      <rect x="220" y="100" width="18" height="260" fill="url(#metal)" rx="2" />
      <!-- Solar Panel Bracket -->
      <polygon points="180,50 280,30 270,70 170,90" fill="#15181E" stroke="#38bdf8" stroke-width="2" />
      <polygon points="183,52 277,33 268,68 174,87" fill="#0369a1" />
      <line x1="205" y1="46" x2="198" y2="82" stroke="#bae6fd" stroke-width="1.5" />
      <line x1="230" y1="41" x2="223" y2="77" stroke="#bae6fd" stroke-width="1.5" />
      <line x1="255" y1="36" x2="248" y2="72" stroke="#bae6fd" stroke-width="1.5" />
      <!-- Solar Arm Mount -->
      <line x1="225" y1="65" x2="228" y2="120" stroke="#475569" stroke-width="6" />
      <!-- Telemetry Box / RTU Enclosure -->
      <rect x="195" y="140" width="68" height="95" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2" rx="4" />
      <circle cx="212" cy="165" r="4" fill="#ef4444" />
      <circle cx="212" cy="180" r="4" fill="#10b981" />
      <rect x="235" y="160" width="18" height="28" fill="#334155" rx="2" />
      <!-- Antenna -->
      <line x1="228" y1="100" x2="228" y2="35" stroke="#64748b" stroke-width="3" />
      <circle cx="228" cy="35" r="4" fill="#0284c7" />
    </svg>
  `)}`,

  static_rs: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360" width="100%" height="100%">
      <defs>
        <linearGradient id="cloudy" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#475569" />
          <stop offset="50%" stop-color="#64748b" />
          <stop offset="100%" stop-color="#94a3b8" />
        </linearGradient>
        <linearGradient id="armMetal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#cbd5e1" />
          <stop offset="50%" stop-color="#f1f5f9" />
          <stop offset="100%" stop-color="#94a3b8" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#cloudy)" />
      <!-- Greenery & River Bank -->
      <path d="M0,280 Q150,260 300,285 T600,270 L600,360 L0,360 Z" fill="#14532d" opacity="0.4" />
      <!-- Vertical Cantilever Mast -->
      <rect x="360" y="70" width="22" height="290" fill="url(#armMetal)" rx="3" />
      <!-- Diagonal Support Truss -->
      <line x1="365" y1="210" x2="260" y2="110" stroke="#e2e8f0" stroke-width="8" />
      <!-- Horizontal Extension Arm over River -->
      <line x1="410" y1="90" x2="200" y2="90" stroke="url(#armMetal)" stroke-width="12" />
      <!-- Sensor Housing (Radar / Laser Pulse) -->
      <rect x="220" y="98" width="36" height="30" fill="#f8fafc" stroke="#64748b" stroke-width="2" rx="3" />
      <polygon points="226,128 250,128 244,142 232,142" fill="#0284c7" />
      <!-- Measurement Beam Projection -->
      <polygon points="232,142 244,142 280,360 196,360" fill="#06b6d4" opacity="0.12" />
      <!-- River Surface -->
      <rect x="0" y="320" width="600" height="40" fill="#0C0E12" opacity="0.7" />
    </svg>
  `)}`,

  floating: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360" width="100%" height="100%">
      <defs>
        <linearGradient id="riverSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0284c7" />
          <stop offset="60%" stop-color="#38bdf8" />
          <stop offset="100%" stop-color="#7dd3fc" />
        </linearGradient>
        <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0369a1" />
          <stop offset="100%" stop-color="#0c4a6e" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#riverSky)" />
      <!-- Water Waves -->
      <rect x="0" y="240" width="600" height="120" fill="url(#waterGrad)" />
      <path d="M0,240 Q100,230 200,240 T400,240 T600,240 L600,360 L0,360 Z" fill="#0284c7" opacity="0.4" />
      <!-- Floating Buoy Body -->
      <ellipse cx="300" cy="245" rx="55" ry="18" fill="#f97316" />
      <ellipse cx="300" cy="242" rx="42" ry="12" fill="#ea580c" />
      <!-- Buoy Tower Structure -->
      <polygon points="280,240 320,240 306,140 294,140" fill="#cbd5e1" stroke="#475569" stroke-width="2" />
      <!-- Beacon / Flasher on Top -->
      <circle cx="300" cy="132" r="8" fill="#facc15" stroke="#ca8a04" stroke-width="2" />
      <!-- Mini Solar Panel -->
      <rect x="278" y="160" width="44" height="24" rx="2" fill="#1e3a8a" stroke="#60a5fa" stroke-width="1.5" transform="rotate(-15 300 172)" />
    </svg>
  `)}`,
};

/**
 * Returns an appropriate equipment photo or fallback SVG based on station type and ID/name
 */
export function getStationImage(station: { id?: string; name?: string; stationType?: string }): string {
  const typeStr = (station.stationType || '').toLowerCase();
  const nameStr = (station.name || '').toLowerCase();
  const idStr = (station.id || '').toLowerCase();

  if (typeStr.includes('static') || typeStr.includes('rs') || nameStr.includes('laser') || nameStr.includes('radar')) {
    if (nameStr.includes('radar') || idStr.includes('radar')) {
      return SVG_STATION_FALLBACKS.static_rs;
    }
    return SVG_STATION_FALLBACKS.static_rs;
  }

  if (typeStr.includes('ลอยน้ำ') || typeStr.includes('float') || typeStr.includes('buoy') || nameStr.includes('ลอย')) {
    return SVG_STATION_FALLBACKS.floating;
  }

  // Default fixed station with solar panel
  return SVG_STATION_FALLBACKS.fixed;
}

/**
 * Returns the badge style and label for station types
 */
export function getStationTypeMeta(stationType?: string): { label: string; bg: string; color: string; border: string } {
  const t = (stationType || '').trim();
  const lower = t.toLowerCase();

  if (lower.includes('static') || lower.includes('rs') || lower.includes('river')) {
    return {
      label: 'STATIC RS',
      bg: 'rgba(6, 182, 212, 0.18)',
      color: '#22d3ee',
      border: 'rgba(6, 182, 212, 0.4)',
    };
  }

  if (lower.includes('ลอย') || lower.includes('float')) {
    return {
      label: 'ลอยน้ำ',
      bg: 'rgba(56, 189, 248, 0.18)',
      color: '#38bdf8',
      border: 'rgba(56, 189, 248, 0.4)',
    };
  }

  // Default: คงที่ (canal / fixed pole)
  return {
    label: 'คงที่',
    bg: 'rgba(168, 85, 247, 0.18)',
    color: '#c084fc',
    border: 'rgba(168, 85, 247, 0.4)',
  };
}
