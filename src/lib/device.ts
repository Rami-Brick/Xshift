const STORAGE_KEY = 'xshift_device_id';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = generateUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return generateUUID();
  }
}

export function getDeviceLabel(id?: string): string {
  const deviceId = id ?? getDeviceId();
  const shortCode = deviceId.replace(/-/g, '').slice(-4).toUpperCase();
  const ua = navigator.userAgent;

  let device = 'Desktop';
  if (/iPhone/.test(ua)) device = 'iPhone';
  else if (/iPad/.test(ua)) device = 'iPad';
  else if (/Android/.test(ua)) device = 'Android';

  let browser = 'Browser';
  if (/CriOS|Chrome/.test(ua) && !/Chromium|Edg/.test(ua)) browser = 'Chrome';
  else if (/Firefox|FxiOS/.test(ua)) browser = 'Firefox';
  else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
  else if (/Edg/.test(ua)) browser = 'Edge';

  return `${device} · ${browser} — #${shortCode}`;
}
