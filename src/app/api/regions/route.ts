import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

// GET: 지역별 민원 통계
export async function GET() {
  try {
    const q = query(
      collection(db, 'complaints'),
      where('parent_id', '==', null)
    );
    const snapshot = await getDocs(q);

    const statsMap = new Map<
      string,
      { total: number; pending: number; critical: number }
    >();

    for (const d of snapshot.docs) {
      const data = d.data();
      const code = data.region_code;
      if (!statsMap.has(code)) {
        statsMap.set(code, { total: 0, pending: 0, critical: 0 });
      }
      const stat = statsMap.get(code)!;
      stat.total++;
      if (data.status === 'pending') stat.pending++;
      if (data.severity === 'critical' || data.severity === 'danger') {
        stat.critical++;
      }
    }

    const stats = Array.from(statsMap.entries()).map(([code, stat]) => ({
      region_code: code,
      region_name: code,
      ...stat,
    }));

    return NextResponse.json({ stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
