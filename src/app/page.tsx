'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  List,
  Filter,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  Shield,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import KakaoMap from '@/components/map/KakaoMap';
import ComplaintCard from '@/components/complaint/ComplaintCard';
import ComplaintForm from '@/components/complaint/ComplaintForm';
import ComplaintDetail from '@/components/complaint/ComplaintDetail';
import type { Complaint, ComplaintStatus } from '@/types';

export default function Home() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [duplicates, setDuplicates] = useState<
    { id: string; ai_title: string | null; title: string; masked_name: string; created_at: string }[]
  >([]);
  const [supportCount, setSupportCount] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | ''>('');
  const [isLoading, setIsLoading] = useState(true);

  // 민원 목록 조회
  const fetchComplaints = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '200');

      const res = await fetch(`/api/complaints?${params}`);
      const data = await res.json();
      if (data.complaints) setComplaints(data.complaints);
    } catch {
      toast.error('민원 목록을 불러오지 못했습니다');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  // 통계 계산
  const stats = useMemo(() => {
    const total = complaints.length;
    const pending = complaints.filter((c) => c.status === 'pending').length;
    const inProgress = complaints.filter((c) => c.status === 'in_progress').length;
    const resolved = complaints.filter((c) => c.status === 'resolved').length;
    const critical = complaints.filter((c) => c.severity === 'critical' || c.severity === 'danger').length;

    // 카테고리별 집계
    const byCat = new Map<string, number>();
    complaints.forEach((c) => byCat.set(c.category, (byCat.get(c.category) || 0) + 1));
    const topCategories = [...byCat.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // 지역별 집계
    const byRegion = new Map<string, number>();
    complaints.forEach((c) => byRegion.set(c.region_code, (byRegion.get(c.region_code) || 0) + 1));
    const topRegions = [...byRegion.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // 총 동일 민원 수
    const totalDuplicates = complaints.reduce((sum, c) => sum + c.duplicate_count, 0);

    return { total, pending, inProgress, resolved, critical, topCategories, topRegions, totalDuplicates };
  }, [complaints]);

  // 민원 상세 조회
  async function handleComplaintClick(complaint: Complaint) {
    try {
      const res = await fetch(`/api/complaints/${complaint.id}`);
      const data = await res.json();
      if (data.complaint) {
        setSelectedComplaint(data.complaint);
        setDuplicates(data.duplicates || []);
        setSupportCount(data.support_count || 0);
        setIsSidebarOpen(true);
      }
    } catch {
      toast.error('민원 상세 정보를 불러오지 못했습니다');
    }
  }

  // 동의하기
  async function handleSupport(complaintId: string): Promise<boolean> {
    try {
      const res = await fetch('/api/supports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaint_id: complaintId }),
      });
      if (res.ok) {
        toast.success('동의가 등록되었습니다');
        fetchComplaints();
        return true;
      }
      const data = await res.json();
      toast.error(data.error || '동의 등록에 실패했습니다');
      return false;
    } catch {
      toast.error('네트워크 오류가 발생했습니다');
      return false;
    }
  }

  function handleFormSuccess() {
    setIsFormOpen(false);
    fetchComplaints();
    toast.success('민원이 등록되었습니다');
  }

  return (
    <div className="h-screen flex flex-col">
      {/* 헤더 */}
      <header className="h-14 border-b bg-white flex items-center justify-between px-4 shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
            <Shield className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight">민원제로</h1>
            <span className="text-[10px] text-gray-400 leading-none hidden sm:block">
              AI 기반 시민 민원 통합 플랫폼
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* 통계 뱃지 (데스크톱) */}
          <div className="hidden md:flex items-center gap-1.5 mr-2">
            <Badge variant="outline" className="text-xs gap-1 py-0.5">
              전체 {stats.total}
            </Badge>
            <Badge variant="destructive" className="text-xs gap-1 py-0.5">
              미처리 {stats.pending}
            </Badge>
            {stats.critical > 0 && (
              <Badge className="text-xs gap-1 py-0.5 bg-orange-500 hover:bg-orange-600">
                <AlertTriangle className="w-3 h-3" />
                긴급 {stats.critical}
              </Badge>
            )}
          </div>

          {/* 통계 대시보드 버튼 */}
          <Button
            variant={showStats ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setShowStats(!showStats)}
            className="h-8 w-8"
            title="통계 대시보드"
          >
            <BarChart3 className="w-4 h-4" />
          </Button>

          {/* 새로고침 */}
          <Button variant="ghost" size="icon" onClick={fetchComplaints} className="h-8 w-8">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          {/* 민원 목록 사이드바 */}
          <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetTrigger render={<Button variant="outline" size="sm" className="gap-1" />}>
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">목록</span>
            </SheetTrigger>
            <SheetContent className="w-full sm:w-[420px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>{selectedComplaint ? '민원 상세' : '민원 목록'}</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                {selectedComplaint ? (
                  <ComplaintDetail
                    complaint={selectedComplaint}
                    duplicates={duplicates}
                    supportCount={supportCount}
                    onBack={() => setSelectedComplaint(null)}
                    onSupport={handleSupport}
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-1.5">
                      {[
                        { value: '', label: '전체' },
                        { value: 'pending', label: '미처리' },
                        { value: 'in_progress', label: '처리중' },
                        { value: 'resolved', label: '해결됨' },
                      ].map((f) => (
                        <button
                          key={f.value}
                          onClick={() => setStatusFilter(f.value as ComplaintStatus | '')}
                          className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                            statusFilter === f.value
                              ? 'bg-gray-900 text-white border-gray-900'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    {isLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="animate-pulse">
                            <div className="h-24 bg-gray-100 rounded-lg" />
                          </div>
                        ))}
                      </div>
                    ) : complaints.length === 0 ? (
                      <div className="text-center py-12 space-y-3">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                          <Shield className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-gray-400 text-sm">등록된 민원이 없습니다</p>
                        <p className="text-gray-300 text-xs">첫 번째 민원을 등록해주세요</p>
                      </div>
                    ) : (
                      complaints.map((complaint) => (
                        <ComplaintCard
                          key={complaint.id}
                          complaint={complaint}
                          onClick={() => handleComplaintClick(complaint)}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* 민원 등록 */}
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger render={<Button size="sm" className="gap-1 bg-red-500 hover:bg-red-600" />}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">민원 등록</span>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>민원 등록</DialogTitle>
              </DialogHeader>
              <ComplaintForm onSuccess={handleFormSuccess} />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* 지도 + 통계 오버레이 */}
      <main className="flex-1 relative">
        <KakaoMap
          complaints={complaints}
          onComplaintClick={handleComplaintClick}
          className="w-full h-full"
          showHeatmap={true}
        />

        {/* 통계 대시보드 오버레이 */}
        {showStats && (
          <div className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-5 w-80 max-h-[calc(100vh-120px)] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-sm">민원 현황 대시보드</h2>
              <button onClick={() => setShowStats(false)} className="text-gray-400 hover:text-gray-600 text-xs">
                닫기
              </button>
            </div>

            {/* 핵심 지표 */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                <p className="text-xs text-blue-500">총 민원</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
                <p className="text-xs text-red-500">긴급 민원</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                <p className="text-xs text-yellow-600">미처리</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
                <p className="text-xs text-green-500">해결됨</p>
              </div>
            </div>

            {/* AI 중복 감지 통계 */}
            <div className="bg-purple-50 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-purple-500" />
                <p className="text-xs font-medium text-purple-700">AI 민원 분석</p>
              </div>
              <p className="text-lg font-bold text-purple-600">{stats.totalDuplicates}건</p>
              <p className="text-xs text-purple-500">총 누적 동일 민원 (AI 감지)</p>
            </div>

            {/* 처리 현황 바 */}
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
                <Clock className="w-3 h-3" /> 처리 현황
              </p>
              <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
                {stats.total > 0 && (
                  <>
                    <div
                      className="bg-green-500 transition-all"
                      style={{ width: `${(stats.resolved / stats.total) * 100}%` }}
                    />
                    <div
                      className="bg-yellow-500 transition-all"
                      style={{ width: `${(stats.inProgress / stats.total) * 100}%` }}
                    />
                    <div
                      className="bg-red-400 transition-all"
                      style={{ width: `${(stats.pending / stats.total) * 100}%` }}
                    />
                  </>
                )}
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />
                  해결 {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%
                </span>
                <span>처리중 {stats.inProgress}</span>
                <span>미처리 {stats.pending}</span>
              </div>
            </div>

            {/* 민원 밀집 지역 TOP 5 */}
            {stats.topRegions.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-600 mb-2">민원 밀집 지역 TOP 5</p>
                <div className="space-y-1.5">
                  {stats.topRegions.map(([region, count], i) => (
                    <div key={region} className="flex items-center gap-2">
                      <span className={`text-xs font-bold w-5 text-center ${i === 0 ? 'text-red-500' : i === 1 ? 'text-orange-500' : 'text-gray-400'}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-700">{region}</span>
                          <span className="text-xs text-gray-400">{count}건</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full mt-0.5">
                          <div
                            className={`h-full rounded-full ${i === 0 ? 'bg-red-400' : i === 1 ? 'bg-orange-400' : 'bg-gray-300'}`}
                            style={{ width: `${(count / stats.topRegions[0][1]) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 카테고리별 TOP 5 */}
            {stats.topCategories.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">카테고리별 민원 현황</p>
                <div className="space-y-1.5">
                  {stats.topCategories.map(([cat, count]) => (
                    <div key={cat} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{cat}</span>
                      <Badge variant="outline" className="text-[10px] py-0">{count}건</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 모바일 통계 */}
        <div className="absolute bottom-4 left-4 right-4 sm:hidden z-10">
          <div className="bg-white/90 backdrop-blur rounded-lg shadow-lg p-3 flex items-center justify-between">
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">전체 {stats.total}</Badge>
              <Badge variant="destructive" className="text-xs">미처리 {stats.pending}</Badge>
              {stats.critical > 0 && (
                <Badge className="text-xs bg-orange-500">긴급 {stats.critical}</Badge>
              )}
            </div>
            <Button size="sm" variant="ghost" onClick={() => setIsSidebarOpen(true)}>
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
