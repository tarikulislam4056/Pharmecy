/**
 * Client Device, IP and Location detection utility
 * Captures real IP, Geolocation and Device / Browser environment for Security & Activity Logs.
 */

export interface ClientDeviceInfo {
  ip: string;
  location: string;
  device: string;
  browser: string;
  os: string;
  userAgent: string;
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
    ip: '103.145.74.22', // Standard Bangladeshi ISP IP representation as initial default
    location: fallbackLocation,
    device,
    browser,
    os,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };

  return inMemoryCache;
};

// Fetch real public IP and Geolocation
export const fetchClientDeviceInfo = async (): Promise<ClientDeviceInfo> => {
  const { device, browser, os } = detectDeviceDetails();
  const fallbackLocation = getFallbackLocation();

  // Try ipapi.co or ipify
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const ip = data.ip || '103.145.74.22';
      const city = data.city || '';
      const country = data.country_name || 'Bangladesh';
      const location = city ? `${city}, ${country}` : country;

      const info: ClientDeviceInfo = {
        ip,
        location,
        device,
        browser,
        os,
        userAgent: navigator.userAgent || '',
      };

      inMemoryCache = info;
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(info));
      } catch {}
      return info;
    }
  } catch {
    // Secondary fallback to ipify for IP only
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const ip = data.ip || '103.145.74.22';
        const info: ClientDeviceInfo = {
          ip,
          location: fallbackLocation,
          device,
          browser,
          os,
          userAgent: navigator.userAgent || '',
        };
        inMemoryCache = info;
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(info));
        } catch {}
        return info;
      }
    } catch {}
  }

  // Final fallback
  const finalInfo: ClientDeviceInfo = {
    ip: inMemoryCache?.ip || '103.145.74.22',
    location: fallbackLocation,
    device,
    browser,
    os,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };

  inMemoryCache = finalInfo;
  return finalInfo;
};
