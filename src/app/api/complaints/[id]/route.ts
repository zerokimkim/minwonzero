import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from 'firebase/firestore';

// GET: 민원 상세 조회
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const complaintRef = doc(db, 'complaints', id);
    const complaintSnap = await getDoc(complaintRef);

    if (!complaintSnap.exists()) {
      return NextResponse.json(
        { error: '민원을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    const data = complaintSnap.data();
    const complaint = {
      id: complaintSnap.id,
      title: data.title,
      description: data.description,
      category: data.category,
      lat: data.lat,
      lng: data.lng,
      address: data.address,
      region_code: data.region_code,
      duplicate_count: data.duplicate_count ?? 0,
      parent_id: data.parent_id ?? null,
      status: data.status,
      severity: data.severity,
      ai_title: data.ai_title ?? null,
      ai_summary: data.ai_summary ?? null,
      masked_name: data.masked_name,
      masked_phone: data.masked_phone,
      masked_content: data.masked_content,
      author_region: data.author_region,
      created_at: data.created_at,
      updated_at: data.updated_at,
      resolved_at: data.resolved_at ?? null,
    };

    // 중복 민원 목록
    const dupQuery = query(
      collection(db, 'complaints'),
      where('parent_id', '==', id),
      orderBy('created_at', 'desc')
    );
    const dupSnapshot = await getDocs(dupQuery);
    const duplicates = dupSnapshot.docs.map((d) => {
      const dd = d.data();
      return {
        id: d.id,
        title: dd.title,
        ai_title: dd.ai_title ?? null,
        masked_name: dd.masked_name,
        created_at: dd.created_at,
      };
    });

    // 동의 수
    const supportQuery = query(
      collection(db, 'complaint_supports'),
      where('complaint_id', '==', id)
    );
    const supportSnapshot = await getDocs(supportQuery);

    return NextResponse.json({
      complaint,
      duplicates,
      support_count: supportSnapshot.size,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH: 민원 상태 변경
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  try {
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.status) {
      updates.status = body.status;
      if (body.status === 'resolved') {
        updates.resolved_at = new Date().toISOString();
      }
    }

    const complaintRef = doc(db, 'complaints', id);
    await updateDoc(complaintRef, updates);

    const updated = await getDoc(complaintRef);
    const data = updated.data();

    return NextResponse.json({ complaint: { id, ...data } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
