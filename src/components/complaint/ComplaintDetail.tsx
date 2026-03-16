'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  MapPin,
  Clock,
  Users,
  ThumbsUp,
  ArrowLeft,
  Loader2,
  Flame,
  User,
  Shield,
} from 'lucide-react';
import type { Complaint } from '@/types';

interface ComplaintDetailProps {
  complaint: Complaint;
  duplicates: {
    id: string;
    ai_title: string | null;
    title: string;
    masked_name: string;
    created_at: string;
  }[];
  supportCount: number;
  onBack: () => void;
  onSupport: (complaintId: string) => Promise<boolean>;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: '미처리', color: 'bg-red-500' },
  in_progress: { label: '처리중', color: 'bg-yellow-500' },
  resolved: { label: '해결됨', color: 'bg-green-500' },
};

export default function ComplaintDetail({
  complaint,
  duplicates,
  supportCount,
  onBack,
  onSupport,
}: ComplaintDetailProps) {
  const [isSupporting, setIsSupporting] = useState(false);
  const [supported, setSupported] = useState(false);
  const [currentSupportCount, setCurrentSupportCount] = useState(supportCount);

  const status = STATUS_LABELS[complaint.status] || STATUS_LABELS.pending;
  const daysSince = Math.floor(
    (Date.now() - new Date(complaint.created_at).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  // AI가 정리한 제목/요약 우선 사용
  const displayTitle = complaint.ai_title || complaint.title;
  const displaySummary =
    complaint.ai_summary ||
    complaint.masked_content ||
    complaint.description.slice(0, 100) + '...';

  async function handleSupport() {
    setIsSupporting(true);
    try {
      const success = await onSupport(complaint.id);
      if (success) {
        setSupported(true);
        setCurrentSupportCount((prev) => prev + 1);
      }
    } finally {
      setIsSupporting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 뒤로가기 */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft className="w-4 h-4" />
        목록으로
      </button>

      {/* 민원 상세 */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg">{displayTitle}</CardTitle>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${status.color}`}
              />
              <span className="text-sm text-gray-500">{status.label}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {complaint.address}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {daysSince}일 전 등록
            </span>
            <Badge variant="outline" className="text-xs">
              {complaint.category}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* AI 요약 내용 (원문 대신 AI 요약 표시) */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-blue-600">
              <Shield className="w-3 h-3" />
              <span>AI가 정리한 민원 요약</span>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 p-3 rounded-lg">
              {displaySummary}
            </p>
          </div>

          {/* 중복 카운트 강조 */}
          {complaint.duplicate_count > 1 && (
            <div
              className={`flex items-center gap-2 p-4 rounded-lg ${
                complaint.severity === 'critical'
                  ? 'bg-red-50 border border-red-200'
                  : complaint.severity === 'danger'
                  ? 'bg-orange-50 border border-orange-200'
                  : 'bg-yellow-50 border border-yellow-200'
              }`}
            >
              <Flame
                className={`w-5 h-5 ${
                  complaint.severity === 'critical'
                    ? 'text-red-500'
                    : complaint.severity === 'danger'
                    ? 'text-orange-500'
                    : 'text-yellow-500'
                }`}
              />
              <div>
                <p className="font-bold text-sm">
                  {complaint.duplicate_count}명이 같은 민원을 넣었습니다
                </p>
                <p className="text-xs text-gray-500">
                  {daysSince}일째 미처리 상태입니다
                </p>
              </div>
            </div>
          )}

          {/* 동의 버튼 */}
          {complaint.status !== 'resolved' && (
            <Button
              onClick={handleSupport}
              disabled={isSupporting || supported}
              className="w-full"
              variant={supported ? 'secondary' : 'default'}
            >
              {isSupporting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ThumbsUp className="w-4 h-4 mr-2" />
              )}
              {supported
                ? '동의 완료'
                : `이 민원에 동의하기 (${currentSupportCount}명 동의)`}
            </Button>
          )}

          {/* 민원인 마스킹 정보 (공신력) */}
          <div className="pt-3 border-t border-gray-100 space-y-1">
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <User className="w-3 h-3" />
              민원인 정보
            </p>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{complaint.masked_name}</span>
              <span>{complaint.masked_phone}</span>
              {complaint.author_region && (
                <span className="text-gray-400">| {complaint.author_region}</span>
              )}
              <span className="text-gray-400">
                | {new Date(complaint.created_at).toLocaleDateString('ko-KR')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 중복 민원 타임라인 */}
      {duplicates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              같은 내용의 민원 ({duplicates.length}건)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {duplicates.map((dup) => (
                <div
                  key={dup.id}
                  className="flex items-start gap-3 text-sm border-l-2 border-gray-200 pl-3"
                >
                  <div>
                    <p className="font-medium text-xs">
                      {dup.ai_title || dup.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      {dup.masked_name} /{' '}
                      {new Date(dup.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
