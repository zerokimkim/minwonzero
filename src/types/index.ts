// 민원 카테고리
export const CATEGORIES = [
  '도로/교통',
  '환경/위생',
  '안전/재난',
  '소음/진동',
  '건축/건설',
  '주차/불법주정차',
  '가로등/시설물',
  '상하수도',
  '공원/녹지',
  '기타',
] as const;

export type Category = (typeof CATEGORIES)[number];

// 민원 상태
export type ComplaintStatus = 'pending' | 'in_progress' | 'resolved';

// 심각도 등급
export type Severity = 'normal' | 'warning' | 'danger' | 'critical';

// 민원 DB 타입
export interface Complaint {
  id: string;
  title: string;
  description: string;
  category: Category;
  lat: number;
  lng: number;
  address: string;
  region_code: string;
  duplicate_count: number;
  parent_id: string | null;
  status: ComplaintStatus;
  severity: Severity;
  embedding_text: string | null;
  // 민원인 정보 (실명 + 전화번호 필수)
  author_name: string;
  author_phone: string;
  author_region: string; // 거주지역
  // AI 생성 공개용
  ai_title: string | null;       // AI가 정리한 제목
  ai_summary: string | null;     // AI가 요약한 내용
  // 마스킹된 공개 정보
  masked_name: string;            // 김**
  masked_phone: string;           // 010-****-3***
  masked_content: string | null;  // 내용 일부만
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

// 중복 연결
export interface DuplicateLink {
  id: string;
  original_id: string;
  duplicate_id: string;
  similarity: number;
  created_at: string;
}

// 동의/지지
export interface ComplaintSupport {
  id: string;
  complaint_id: string;
  supporter_ip: string;
  user_id: string | null;
  created_at: string;
}

// 민원 등록 폼 데이터
export interface ComplaintFormData {
  title: string;
  description: string;
  category: Category;
  lat: number;
  lng: number;
  address: string;
  region_code: string;
  author_name: string;       // 실명 (필수)
  author_phone: string;      // 전화번호 (필수)
  author_region: string;     // 거주지역 (필수)
}

// 이름 마스킹: 김현섭 → 김**
export function maskName(name: string): string {
  if (name.length <= 1) return name;
  return name[0] + '*'.repeat(name.length - 1);
}

// 전화번호 마스킹: 010-1234-5678 → 010-****-5***
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return phone;
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-****-${digits.slice(7, 8)}***`;
  }
  return `${digits.slice(0, 3)}-****-${digits.slice(-4, -3)}***`;
}

// 내용 마스킹: 앞부분만 공개
export function maskContent(content: string, maxLength: number = 50): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + '...';
}

// Claude 중복 검사 결과
export interface DuplicateCheckResult {
  duplicates: {
    id: string;
    similarity: number;
    reason: string;
  }[];
  is_new: boolean;
}

// 지역별 통계
export interface RegionStats {
  region_code: string;
  region_name: string;
  total_count: number;
  pending_count: number;
  critical_count: number;
}

// 심각도 계산
export function calculateSeverity(
  duplicateCount: number,
  createdAt: string
): Severity {
  const daysSinceCreated = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (duplicateCount >= 50 || (duplicateCount >= 20 && daysSinceCreated >= 90))
    return 'critical';
  if (duplicateCount >= 20 || (duplicateCount >= 5 && daysSinceCreated >= 30))
    return 'danger';
  if (duplicateCount >= 5 || daysSinceCreated >= 7) return 'warning';
  return 'normal';
}

// 심각도별 색상
export const SEVERITY_COLORS: Record<Severity, string> = {
  normal: '#22c55e',
  warning: '#eab308',
  danger: '#f97316',
  critical: '#ef4444',
};

// 심각도별 마커 크기 (px)
export const SEVERITY_SIZES: Record<Severity, number> = {
  normal: 24,
  warning: 32,
  danger: 44,
  critical: 56,
};
