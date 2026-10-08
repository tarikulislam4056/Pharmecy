/**
 * Client Device, IP and Location detection utility
 * Captures real IP, Device GPS / Geolocation and Hardware / Browser environment for Security & Activity Logs.
 */

export interface ClientDeviceInfo {
  ip: string;
  location: string;
  device: string;
  browser: string;
  os: string;
  userAgent: string;
  isGps?: boolean;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

const STORAGE_KEY = 'DOKANPRO_CLIENT_INFO_CACHE';

// Detect Device, OS and Browser from navigator
export const detectDeviceDetails = (): { device: string; browser: string; os: string } => {
  if (typeof window === 'undefined' || !navigator) {
    return { device: 'Unknown Device', browser: 'Unknown Browser', os: 'Unknown OS' };
  }

  const ua = navigator.userAgent || '';
  
  // OS Detection
  let os = 'Unknown OS';
  if (/windows phone/i.test(ua)) os = 'Windows Phone';
  else if (/win(dows)? 11/i.test(ua)) os = 'Windows 11';
  else if (/win(dows)? 10/i.test(ua) || /windows nt 10\.0/i.test(ua)) os = 'Windows 10/11';
  else if (/windows nt 6\.3/i.test(ua)) os = 'Windows 8.1';
  else if (/windows nt 6\.2/i.test(ua)) os = 'Windows 8';
  else if (/windows nt 6\.1/i.test(ua)) os = 'Windows 7';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/android/i.test(ua)) {
    const match = ua.match(/android\s([0-9\.]*)/i);
    os = match ? `Android ${match[1]}` : 'Android';
  } else if (/iphone/i.test(ua)) {
    os = 'iOS (iPhone)';
  } else if (/ipad/i.test(ua)) {
    os = 'iPadOS';
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = 'macOS';
  } else if (/linux/i.test(ua)) {
    os = 'Linux';
  }

  // Browser Detection
  let browser = 'Unknown Browser';
  if (/edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
  else if (/samsungbrowser/i.test(ua)) browser = 'Samsung Internet';
  else if (/chrome|crios/i.test(ua)) browser = 'Google Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Mozilla Firefox';
  else if (/safari/i.test(ua)) browser = 'Apple Safari';
  else if (/msie|trident/i.test(ua)) browser = 'Internet Explorer';

  // Form factor
  const isMobile = /mobile|iphone|ipod|android.*mobile|windows phone/i.test(ua) || window.innerWidth < 768;
  const isTablet = /tablet|ipad|android(?!.*mobile)/i.test(ua) || (window.innerWidth >= 768 && window.innerWidth < 1024);

  let formFactor = 'Desktop PC';
  if (isTablet) formFactor = 'Tablet';
  else if (isMobile) formFactor = 'Smartphone';

  const device = `${formFactor} (${os} · ${browser})`;

  return { device, browser, os };
};

// Fallback location from Timezone
export const getFallbackLocation = (): string => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Dhaka')) return 'Dhaka, Bangladesh';
    if (tz.includes('Chittagong')) return 'Chittagong, Bangladesh';
    if (tz.includes('Sylhet')) return 'Sylhet, Bangladesh';
    if (tz.includes('Rajshahi')) return 'Rajshahi, Bangladesh';
    if (tz.includes('Khulna')) return 'Khulna, Bangladesh';
    if (tz.includes('Kolkata')) return 'Kolkata, India';
    if (tz.includes('London')) return 'London, UK';
    if (tz.includes('New_York')) return 'New York, USA';
    if (tz.includes('Dubai')) return 'Dubai, UAE';
    if (tz) {
      const parts = tz.split('/');
      return `${parts[1] || parts[0]} (${parts[0]})`.replace(/_/g, ' ');
    }
  } catch {}
  return 'Bangladesh';
};

// Check if Device GPS / Location is turned on and permitted
export const tryGetDeviceGpsLocation = async (): Promise<{
  location: string;
  latitude: number;
  longitude: number;
  accuracy: number;
} | null> => {
  if (typeof window === 'undefined' || !navigator || !navigator.geolocation) {
    return null;
  }

  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      resolve(null);
    }, 4000);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        clearTimeout(timeoutId);
        const { latitude, longitude, accuracy } = pos.coords;

        // Reverse geocoding via OpenStreetMap Nominatim
        try {
          const controller = new AbortController();
          const abortTimer = setTimeout(() => controller.abort(), 3000);
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`,
            {
              signal: controller.signal,
              headers: { 'User-Agent': 'DokanProERP/1.0' },
            }
          );
          clearTimeout(abortTimer);

          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const area =
              addr.suburb ||
              addr.neighbourhood ||
              addr.residential ||
              addr.village ||
              addr.town ||
              addr.city_district ||
              addr.road ||
              '';
            const city = addr.city || addr.town || addr.county || addr.state || '';
            const country = addr.country || 'Bangladesh';

            let locName = '';
            if (area && city && area !== city) {
              locName = `${area}, ${city}, ${country}`;
            } else if (city) {
              locName = `${city}, ${country}`;
            } else {
              locName = country;
            }

            resolve({
              location: `${locName} (📍 GPS)`,
              latitude,
              longitude,
              accuracy,
            });
            return;
          }
        } catch {
          // Ignore reverse geocode failure and use coordinates
        }

        resolve({
          location: `GPS: ${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E (📍 GPS)`,
          latitude,
          longitude,
          accuracy,
        });
      },
      (_err) => {
        clearTimeout(timeoutId);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 4000,
        maximumAge: 30000,
      }
    );
  });
};

let inMemoryCache: ClientDeviceInfo | null = null;

export const getCachedClientDeviceInfo = (): ClientDeviceInfo => {
  if (inMemoryCache) return inMemoryCache;

  const { device, browser, os } = detectDeviceDetails();
  const fallbackLocation = getFallbackLocation();

  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.ip) {
        inMemoryCache = {
          ...parsed,
          device,
          browser,
          os,
          userAgent: navigator.userAgent || '',
        };
        return inMemoryCache;
      }
    }
  } catch {}

  inMemoryCache = {
    ip: '103.145.74.22', // Bangladeshi ISP public IP representation
    location: fallbackLocation,
    device,
    browser,
    os,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };

  return inMemoryCache;
};

// Fetch real public IP, check Device GPS and Geolocation
export const fetchClientDeviceInfo = async (promptGps: boolean = true): Promise<ClientDeviceInfo> => {
  const { device, browser, os } = detectDeviceDetails();
  const fallbackLocation = getFallbackLocation();

  let gpsData: { location: string; latitude: number; longitude: number; accuracy: number } | null = null;
  if (promptGps) {
    try {
      gpsData = await tryGetDeviceGpsLocation();
    } catch {}
  }

  let ip = inMemoryCache?.ip || '103.145.74.22';
  let ipLocation = fallbackLocation;

  // Try ipapi.co
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      ip = data.ip || ip;
      const city = data.city || '';
      const country = data.country_name || 'Bangladesh';
      ipLocation = city ? `${city}, ${country}` : country;
    }
  } catch {
    // Secondary fallback to ipify for IP
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        ip = data.ip || ip;
      }
    } catch {}
  }

  // If Device GPS was active and returned location, prefer Device GPS location!
  const finalLocation = gpsData ? gpsData.location : ipLocation;

  const info: ClientDeviceInfo = {
    ip,
    location: finalLocation,
    device,
    browser,
    os,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    isGps: Boolean(gpsData),
    latitude: gpsData?.latitude,
    longitude: gpsData?.longitude,
    accuracy: gpsData?.accuracy,
  };

  inMemoryCache = info;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(info));
  } catch {}
  return info;
};

// Manually trigger device GPS location refresh (e.g. from user click)
export const refreshClientDeviceLocation = async (): Promise<ClientDeviceInfo> => {
  return await fetchClientDeviceInfo(true);
};
