'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MapPin, Loader2, AlertTriangle, Users, Shield, Search } from 'lucide-react';
import { CATEGORIES, type Category } from '@/types';

export interface ComplaintFormProps {
  onSuccess?: () => void;
}

interface DuplicateInfo {
  id: string;
  similarity: number;
  reason: string;
  title?: string;
  duplicate_count?: number;
}

export default function ComplaintForm({ onSuccess }: ComplaintFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [addressInput, setAddressInput] = useState('');
  const [position, setPosition] = useState<{
    lat: number;
    lng: number;
    address: string;
    regionCode: string;
  } | null>(null);
  const [authorName, setAuthorName] = useState('');
  const [authorPhone, setAuthorPhone] = useState('');
  const [authorRegion, setAuthorRegion] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);
  const [duplicateChecked, setDuplicateChecked] = useState(false);

  const canSubmit =
    title &&
    description &&
    category &&
    position &&
    authorName &&
    authorPhone &&
    authorRegion;

  // 전화번호 포맷팅
  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }

  // 주소 검색 (카카오 Geocoding)
  async function handleSearchAddress() {
    if (!addressInput.trim()) return;
    setIsSearching(true);

    try {
      if (typeof window !== 'undefined' && window.kakao?.maps?.services) {
        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.addressSearch(
          addressInput,
          (result: Array<{ x: string; y: string; address_name: string; road_address?: { region_1depth_name: string; region_2depth_name: string } }>, status: string) => {
            if (status === 'OK' && result.length > 0) {
              const r = result[0];
              const regionCode = r.road_address
                ? `${r.road_address.region_1depth_name} ${r.road_address.region_2depth_name}`
                : r.address_name.split(' ').slice(0, 2).join(' ');
              setPosition({
                lat: parseFloat(r.y),
                lng: parseFloat(r.x),
                address: r.address_name,
                regionCode,
              });
              toast.success('주소를 찾았습니다');
            } else {
              toast.error('주소를 찾을 수 없습니다. 다시 입력해주세요.');
            }
            setIsSearching(false);
          }
        );
      } else {
        toast.error('지도 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
        setIsSearching(false);
      }
    } catch {
      toast.error('주소 검색에 실패했습니다');
      setIsSearching(false);
    }
  }

  // 중복 검사
  async function handleCheckDuplicate() {
    if (!canSubmit || !position) return;

    setIsChecking(true);
    setDuplicates([]);
    setDuplicateChecked(false);

    try {
      const res = await fetch('/api/duplicate-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          category,
          address: position.address,
          region_code: position.regionCode,
        }),
      });

      const data = await res.json();

      if (data.result?.duplicates?.length > 0) {
        const merged = data.result.duplicates.map(
          (d: DuplicateInfo) => {
            const detail = data.duplicate_details?.find(
              (dd: { id: string }) => dd.id === d.id
            );
            return { ...d, ...detail };
          }
        );
        setDuplicates(merged);
      }
      setDuplicateChecked(true);
    } catch {
      toast.error('중복 검사에 실패했습니다');
      setDuplicateChecked(true);
    } finally {
      setIsChecking(false);
    }
  }

  // 민원 제출
  async function submitComplaint(parentId?: string) {
    if (!canSubmit || !position) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          category,
          lat: position.lat,
          lng: position.lng,
          address: position.address,
          region_code: position.regionCode,
          author_name: authorName,
          author_phone: authorPhone,
          author_region: authorRegion,
          parent_id: parentId || null,
        }),
      });

      if (res.ok) {
        onSuccess?.();
      } else {
        const data = await res.json();
        toast.error(data.error || '민원 등록에 실패했습니다');
      }
    } catch {
      toast.error('네트워크 오류가 발생했습니다');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 개인정보 안내 */}
      <p className="text-xs text-gray-500 flex items-center gap-1">
        <Shield className="w-3 h-3" />
        개인정보는 마스킹 처리되어 공개됩니다 (김** / 010-****-3***)
      </p>

      {/* 민원인 정보 (필수) */}
      <div className="p-3 bg-gray-50 rounded-lg space-y-3">
        <p className="text-sm font-medium text-gray-700">민원인 정보 (필수)</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">이름 (실명) *</Label>
            <Input
              placeholder="홍길동"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">거주지역 *</Label>
            <Input
              placeholder="서울시 강남구"
              value={authorRegion}
              onChange={(e) => setAuthorRegion(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">전화번호 *</Label>
          <Input
            placeholder="010-1234-5678"
            value={authorPhone}
            onChange={(e) => setAuthorPhone(formatPhone(e.target.value))}
            type="tel"
          />
        </div>
      </div>

      {/* 위치 */}
      <div className="space-y-1">
        <Label>민원 위치 *</Label>
        <div className="flex gap-2">
          <Input
            placeholder="주소를 입력하세요 (예: 서울시 강남구 역삼동 123)"
            value={addressInput}
            onChange={(e) => {
              setAddressInput(e.target.value);
              setPosition(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchAddress()}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleSearchAddress}
            disabled={isSearching || !addressInput.trim()}
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </div>
        {position && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
            <MapPin className="w-3 h-3 shrink-0" />
            {position.address}
          </div>
        )}
      </div>

      {/* 카테고리 */}
      <div className="space-y-1">
        <Label>카테고리 *</Label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">카테고리 선택</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* 제목 */}
      <div className="space-y-1">
        <Label>민원 제목 *</Label>
        <Input
          placeholder="민원 제목을 입력해주세요"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setDuplicateChecked(false);
          }}
        />
      </div>

      {/* 내용 */}
      <div className="space-y-1">
        <Label>상세 내용 *</Label>
        <Textarea
          placeholder="민원 내용을 자세히 작성해주세요."
          rows={4}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setDuplicateChecked(false);
          }}
        />
        <p className="text-xs text-gray-400">
          ※ AI가 내용을 요약하여 공개합니다. 원문은 비공개 처리됩니다.
        </p>
      </div>

      {/* 중복 검사 결과 */}
      {duplicates.length > 0 && (
        <div className="space-y-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800 font-medium text-sm">
            <AlertTriangle className="w-4 h-4" />
            유사한 민원이 {duplicates.length}건 있습니다
          </div>
          {duplicates.map((dup) => (
            <div key={dup.id} className="p-3 bg-white rounded border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">
                  {dup.title || '제목 없음'}
                </span>
                <Badge variant="outline" className="text-xs">
                  유사도 {Math.round((dup.similarity || 0) * 100)}%
                </Badge>
              </div>
              <p className="text-xs text-gray-500">{dup.reason}</p>
              {dup.duplicate_count && dup.duplicate_count > 1 && (
                <div className="flex items-center gap-1 text-xs text-orange-600">
                  <Users className="w-3 h-3" />
                  이미 {dup.duplicate_count}명이 같은 민원
                </div>
              )}
              <Button
                size="sm"
                variant="outline"
                className="w-full text-sm"
                onClick={() => submitComplaint(dup.id)}
                disabled={isSubmitting}
              >
                이 민원에 힘 보태기
              </Button>
            </div>
          ))}
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => submitComplaint()}
            disabled={isSubmitting}
          >
            {isSubmitting && (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            )}
            그래도 새 민원으로 등록하기
          </Button>
        </div>
      )}

      {duplicateChecked && duplicates.length === 0 && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          유사한 민원이 없습니다. 새 민원으로 등록할 수 있습니다.
        </div>
      )}

      <div className="flex gap-2 pt-2">
        {!duplicateChecked ? (
          <Button
            onClick={handleCheckDuplicate}
            disabled={!canSubmit || isChecking}
            className="w-full"
          >
            {isChecking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                중복 검사 중...
              </>
            ) : (
              '중복 검사 후 등록'
            )}
          </Button>
        ) : duplicates.length === 0 ? (
          <Button
            onClick={() => submitComplaint()}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting && (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            )}
            민원 등록
          </Button>
        ) : null}
      </div>
    </div>
  );
}
