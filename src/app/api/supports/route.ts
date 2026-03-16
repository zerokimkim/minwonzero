import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { calculateSeverity } from '@/types';

// POST: 민원 동의(지지)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { complaint_id } = body;

  if (!complaint_id) {
    return NextResponse.json(
      { error: '민원 ID가 필요합니다' },
      { status: 400 }
    );
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  try {
    // 이미 동의했는지 확인
    const existingQuery = query(
      collection(db, 'complaint_supports'),
      where('complaint_id', '==', complaint_id),
      where('supporter_ip', '==', ip)
    );
    const existingSnap = await getDocs(existingQuery);

    if (!existingSnap.empty) {
      return NextResponse.json(
        { error: '이미 동의한 민원입니다' },
        { status: 409 }
      );
    }

    // 동의 등록
    await addDoc(collection(db, 'complaint_supports'), {
      complaint_id,
      supporter_ip: ip,
      created_at: new Date().toISOString(),
    });

    // duplicate_count 증가 + severity 재계산
    const complaintRef = doc(db, 'complaints', complaint_id);
    const complaintSnap = await getDoc(complaintRef);

    if (complaintSnap.exists()) {
      const data = complaintSnap.data();
      const newCount = (data.duplicate_count ?? 0) + 1;
      const newSeverity = calculateSeverity(newCount, data.created_at);

      await updateDoc(complaintRef, {
        duplicate_count: newCount,
        severity: newSeverity,
      });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
