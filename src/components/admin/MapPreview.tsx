'use client';

import { useEffect, useRef } from 'react';

interface Props {
  center: [number, number];
  radius: number;
}

export default function MapPreview({ center, radius }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const circleRef = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let L: typeof import('leaflet');

    async function init() {
      L = (await import('leaflet')).default;

      // Fix default icon path for bundlers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (mapRef.current) return;

      const map = L.map(containerRef.current!, {
        center,
        zoom: 16,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map);

      markerRef.current = L.marker(center).addTo(map);
      circleRef.current = L.circle(center, {
        radius,
        color: '#1E53FF',
        fillColor: '#1E53FF',
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(map);

      mapRef.current = map;
    }

    // Load Leaflet CSS if not already loaded
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    init();

    return () => {
      if (mapRef.current) {
        (mapRef.current as { remove(): void }).remove();
        mapRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !circleRef.current) return;
    const map = mapRef.current as { setView(c: [number, number], z: number): void };
    map.setView(center, 16);
    (markerRef.current as { setLatLng(c: [number, number]): void }).setLatLng(center);
    (circleRef.current as { setLatLng(c: [number, number]): void; setRadius(r: number): void })
      .setLatLng(center);
    (circleRef.current as { setRadius(r: number): void }).setRadius(radius);
  }, [center, radius]);

  return <div ref={containerRef} className="h-48 rounded-xl overflow-hidden z-0 relative" />;
}
