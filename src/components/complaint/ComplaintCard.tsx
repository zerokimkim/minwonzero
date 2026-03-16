'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Clock, Users, User } from 'lucide-react';
import type { Complaint } from '@/types';

interface ComplaintCardProps {
  complaint: Complaint;
  onClick?: () => void;
}

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: '미처리', variant: 'destructive' },
  in_progress: { label: '처리중', variant: 'default' },
  resolved: { label: '해결됨', variant: 'secondary' },
};

const SEVERITY_BADGE: Record<string, string> = {
  normal: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800 animate-pulse',
};

export default function ComplaintCard({ complaint, onClick }: ComplaintCardProps) {
  const status = STATUS_LABELS[complaint.status] || STATUS_LABELS.pending;
  const daysSince = Math.floor(
    (Date.now() - new Date(complaint.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  // AI가 정리한 제목/요약 우선 사용
  const displayTitle = complaint.ai_title || complaint.title;
  const displaySummary = complaint.ai_summary || complaint.masked_content || complaint.description.slice(0, 50) + '...';

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
      style={{
        borderLeftColor:
          complaint.severity === 'critical' ? '#ef4444' :
          complaint.severity === 'danger' ? '#f97316' :
          complaint.severity === 'warning' ? '#eab308' : '#e5e7eb',
      }}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-sm line-clamp-1">{displayTitle}</h3>
          <Badge variant={status.variant} className="text-xs shrink-0">
            {status.label}
          </Badge>
        </div>

        {/* AI 요약 내용 */}
        <p className="text-xs text-gray-500 line-clamp-2 mb-3">
          {displaySummary}
        </p>

        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {complaint.address.split(' ').slice(0, 3).join(' ')}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {daysSince}일 전
          </span>
        </div>

        {/* 중복 민원 수 */}
        {complaint.duplicate_count > 1 && (
          <div className={`mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${SEVERITY_BADGE[complaint.severity]}`}>
            <Users className="w-3 h-3" />
            {complaint.duplicate_count}명이 같은 민원
          </div>
        )}

        {/* 민원인 마스킹 정보 */}
        <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
          <User className="w-3 h-3" />
          <span>{complaint.masked_name}</span>
          <span>{complaint.masked_phone}</span>
          {complaint.author_region && (
            <span className="text-gray-300">| {complaint.author_region}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
