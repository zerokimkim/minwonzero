'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { loadKakaoMapScript } from '@/lib/kakao/map-utils';
import { SEVERITY_COLORS, SEVERITY_SIZES, type Complaint, type Severity } from '@/types';

interface KakaoMapProps {
  complaints: Complaint[];
  onMapClick?: (lat: number, lng: number) => void;
  onComplaintClick?: (complaint: Complaint) => void;
  selectedPosition?: { lat: number; lng: number } | null;
  className?: string;
  showHeatmap?: boolean;
}

// 히트맵: 근접 민원을 클러스터로 묶어 위험 밀집도 시각화
interface HeatCluster {
  lat: number;
  lng: number;
  count: number;
  maxSeverity: number;
  size: number;
}

const SEV_SCORE: Record<Severity, number> = { normal: 0, warning: 1, danger: 2, critical: 3 };

function clusterComplaints(complaints: Complaint[], radius = 0.005): HeatCluster[] {
  const clusters: HeatCluster[] = [];
  const used = new Set<number>();

  for (let i = 0; i < complaints.length; i++) {
    if (used.has(i)) continue;
    const group: Complaint[] = [complaints[i]];
    used.add(i);

    for (let j = i + 1; j < complaints.length; j++) {
      if (used.has(j)) continue;
      const dist = Math.sqrt(
        Math.pow(complaints[i].lat - complaints[j].lat, 2) +
        Math.pow(complaints[i].lng - complaints[j].lng, 2)
      );
      if (dist < radius) {
        group.push(complaints[j]);
        used.add(j);
      }
    }

    const totalCount = group.reduce((sum, c) => sum + c.duplicate_count, 0);
    const maxSev = Math.max(...group.map((c) => SEV_SCORE[c.severity] || 0));

    if (group.length >= 2 || totalCount >= 3) {
      clusters.push({
        lat: group.reduce((s, c) => s + c.lat, 0) / group.length,
        lng: group.reduce((s, c) => s + c.lng, 0) / group.length,
        count: totalCount,
        maxSeverity: maxSev,
        size: group.length,
      });
    }
  }
  return clusters;
}

export default function KakaoMap({
  complaints,
  onMapClick,
  onComplaintClick,
  selectedPosition,
  className = '',
  showHeatmap = true,
}: KakaoMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<kakao.maps.Map | null>(null);
  const overlaysRef = useRef<kakao.maps.CustomOverlay[]>([]);
  const heatOverlaysRef = useRef<kakao.maps.CustomOverlay[]>([]);
  const selectedMarkerRef = useRef<kakao.maps.Marker | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // 지도 초기화
  useEffect(() => {
    if (!mapRef.current) return;

    loadKakaoMapScript()
      .then(() => {
        const center = new window.kakao.maps.LatLng(36.5, 127.5);
        const map = new window.kakao.maps.Map(mapRef.current!, {
          center,
          level: 13,
        });
        mapInstanceRef.current = map;
        setIsLoaded(true);

        if (onMapClick) {
          window.kakao.maps.event.addListener(
            map,
            'click',
            (mouseEvent: { latLng: kakao.maps.LatLng }) => {
              onMapClick(mouseEvent.latLng.getLat(), mouseEvent.latLng.getLng());
            }
          );
        }
      })
      .catch(console.error);
  }, [onMapClick]);

  // 히트맵 렌더링
  const renderHeatmap = useCallback(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    heatOverlaysRef.current.forEach((o) => o.setMap(null));
    heatOverlaysRef.current = [];

    if (!showHeatmap || complaints.length === 0) return;

    const clusters = clusterComplaints(complaints);
    const colors = [
      ['rgba(34,197,94,0.12)', 'rgba(34,197,94,0.25)'],
      ['rgba(234,179,8,0.15)', 'rgba(234,179,8,0.35)'],
      ['rgba(249,115,22,0.2)', 'rgba(249,115,22,0.45)'],
      ['rgba(239,68,68,0.25)', 'rgba(239,68,68,0.55)'],
    ];

    clusters.forEach((cluster) => {
      const baseSize = Math.min(220, 70 + cluster.count * 10);
      const [bg, border] = colors[cluster.maxSeverity] || colors[0];
      const shouldPulse = cluster.maxSeverity >= 2;

      const el = document.createElement('div');
      el.innerHTML = `<div style="
        width:${baseSize}px; height:${baseSize}px;
        background:radial-gradient(circle, ${bg} 0%, transparent 70%);
        border:2px solid ${border}; border-radius:50%;
        pointer-events:none;
        ${shouldPulse ? `animation:heatPulse ${cluster.maxSeverity >= 3 ? 2 : 3}s infinite;` : ''}
      "></div>`;

      const overlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(cluster.lat, cluster.lng),
        content: el,
        yAnchor: 0.5,
        xAnchor: 0.5,
      });
      overlay.setMap(mapInstanceRef.current!);
      heatOverlaysRef.current.push(overlay);
    });
  }, [complaints, isLoaded, showHeatmap]);

  useEffect(() => { renderHeatmap(); }, [renderHeatmap]);

  // 민원 마커 렌더링
  const renderMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    complaints.forEach((complaint) => {
      const severity = complaint.severity || 'normal';
      const color = SEVERITY_COLORS[severity];
      const size = SEVERITY_SIZES[severity];
      const isCritical = severity === 'critical';

      const content = document.createElement('div');
      content.innerHTML = `
        <div style="
          width: ${size}px; height: ${size}px;
          background: ${color}; border: 3px solid white; border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: white; font-weight: bold; font-size: ${size > 32 ? 14 : 11}px;
          ${isCritical ? 'animation: pulse 1.5s infinite;' : ''}
          transition: transform 0.2s; position: relative;
        "
        onmouseover="this.style.transform='scale(1.2)'"
        onmouseout="this.style.transform='scale(1)'"
        >
          ${complaint.duplicate_count > 1 ? complaint.duplicate_count : ''}
        </div>
      `;

      content.addEventListener('click', () => onComplaintClick?.(complaint));

      const overlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(complaint.lat, complaint.lng),
        content,
        yAnchor: 0.5,
        xAnchor: 0.5,
      });
      overlay.setMap(mapInstanceRef.current!);
      overlaysRef.current.push(overlay);
    });
  }, [complaints, isLoaded, onComplaintClick]);

  useEffect(() => { renderMarkers(); }, [renderMarkers]);

  // 선택된 위치 마커
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.setMap(null);
    }

    if (selectedPosition) {
      const marker = new window.kakao.maps.Marker({
        position: new window.kakao.maps.LatLng(selectedPosition.lat, selectedPosition.lng),
        map: mapInstanceRef.current,
      });
      selectedMarkerRef.current = marker;
      mapInstanceRef.current.setCenter(
        new window.kakao.maps.LatLng(selectedPosition.lat, selectedPosition.lng)
      );
      mapInstanceRef.current.setLevel(5);
    }
  }, [selectedPosition, isLoaded]);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapRef} className="w-full h-full min-h-[400px]" />

      {/* 로딩 */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 text-sm">민심지도를 불러오는 중...</p>
          </div>
        </div>
      )}

      {/* 범례 */}
      {isLoaded && complaints.length > 0 && (
        <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur rounded-lg shadow-lg p-3 text-xs space-y-1.5 z-10 hidden sm:block">
          <p className="font-semibold text-gray-700 mb-2">민원 심각도</p>
          {[
            ['bg-green-500', '일반'],
            ['bg-yellow-500', '주의 (5건+ / 7일+)'],
            ['bg-orange-500', '위험 (20건+ / 30일+)'],
            ['bg-red-500', '긴급 (50건+ / 90일+)'],
          ].map(([color, label]) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${color} inline-block shrink-0`} />
              <span className="text-gray-600">{label}</span>
            </div>
          ))}
          {showHeatmap && (
            <div className="pt-1.5 border-t border-gray-200 mt-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-200 border border-red-300 inline-block shrink-0" />
                <span className="text-gray-600">민원 밀집 구역</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 애니메이션 CSS */}
      <style jsx global>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        @keyframes heatPulse {
          0% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
          100% { opacity: 0.6; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
