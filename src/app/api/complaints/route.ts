import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { calculateSeverity, maskName, maskPhone, maskContent } from '@/types';
import { generateComplaintSummary } from '@/lib/claude/duplicate-detector';

// GET: 민원 목록 조회 (개인정보 제외, 마스킹 정보만 반환)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const regionCode = searchParams.get('region');
  const status = searchParams.get('status');
  const category = searchParams.get('category');
  const limitNum = parseInt(searchParams.get('limit') || '100');

  try {
    const constraints: Parameters<typeof query>[1][] = [
      where('parent_id', '==', null),
      orderBy('created_at', 'desc'),
      firestoreLimit(limitNum),
    ];

    if (regionCode) constraints.push(where('region_code', '==', regionCode));
    if (status) constraints.push(where('status', '==', status));
    if (category) constraints.push(where('category', '==', category));

    const q = query(collection(db, 'complaints'), ...constraints);
    const snapshot = await getDocs(q);

    const complaints = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
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
    });

    return NextResponse.json({ complaints, total: complaints.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: 민원 등록
export async function POST(request: NextRequest) {
  const body = await request.json();

  const {
    title,
    description,
    category,
    lat,
    lng,
    address,
    region_code,
    author_name,
    author_phone,
    author_region,
    parent_id,
  } = body;

  if (
    !title ||
    !description ||
    !category ||
    !lat ||
    !lng ||
    !address ||
    !region_code ||
    !author_name ||
    !author_phone ||
    !author_region
  ) {
    return NextResponse.json(
      { error: '이름, 전화번호, 거주지역은 필수 입력 항목입니다' },
      { status: 400 }
    );
  }

  const masked_name = maskName(author_name);
  const masked_phone = maskPhone(author_phone);
  const masked_content = maskContent(description, 50);

  const { ai_title, ai_summary } = await generateComplaintSummary(
    title,
    description,
    category,
    address
  );

  const now = new Date().toISOString();
  const severity = calculateSeverity(1, now);

  try {
    const complaintData = {
      title,
      description,
      category,
      lat,
      lng,
      address,
      region_code,
      author_name,
      author_phone,
      author_region,
      masked_name,
      masked_phone,
      masked_content,
      ai_title,
      ai_summary,
      parent_id: parent_id || null,
      severity,
      duplicate_count: 0,
      status: 'pending',
      embedding_text: `${title} ${description} ${address}`,
      created_at: now,
      updated_at: now,
      resolved_at: null,
    };

    const docRef = await addDoc(collection(db, 'complaints'), complaintData);

    const responseData = {
      id: docRef.id,
      title,
      category,
      lat,
      lng,
      address,
      region_code,
      duplicate_count: 0,
      status: 'pending',
      severity,
      ai_title,
      ai_summary,
      masked_name,
      masked_phone,
      masked_content,
      author_region,
      created_at: now,
    };

    // 중복 민원인 경우 원본의 duplicate_count 증가
    if (parent_id) {
      const parentRef = doc(db, 'complaints', parent_id);
      const parentSnap = await getDoc(parentRef);

      if (parentSnap.exists()) {
        const parentData = parentSnap.data();
        const newCount = (parentData.duplicate_count ?? 0) + 1;
        const newSeverity = calculateSeverity(newCount, parentData.created_at);

        await updateDoc(parentRef, {
          duplicate_count: newCount,
          severity: newSeverity,
        });
      }

      // duplicate_links에도 기록
      if (body.similarity) {
        await addDoc(collection(db, 'duplicate_links'), {
          original_id: parent_id,
          duplicate_id: docRef.id,
          similarity: body.similarity,
          created_at: now,
        });
      }
    }

    return NextResponse.json({ complaint: responseData }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
