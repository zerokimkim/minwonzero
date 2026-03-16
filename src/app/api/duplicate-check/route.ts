import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { checkDuplicate } from '@/lib/claude/duplicate-detector';

// POST: Claude API로 중복 민원 검사
export async function POST(request: NextRequest) {
  const body = await request.json();

  const { title, description, category, address, region_code } = body;

  if (!title || !description || !region_code) {
    return NextResponse.json(
      { error: '필수 항목을 입력해주세요' },
      { status: 400 }
    );
  }

  try {
    // 같은 지역의 미해결 원본 민원 최근 50개 조회
    const q = query(
      collection(db, 'complaints'),
      where('region_code', '==', region_code),
      where('parent_id', '==', null),
      where('status', 'in', ['pending', 'in_progress']),
      orderBy('created_at', 'desc'),
      limit(50)
    );

    const snapshot = await getDocs(q);
    const existingComplaints = snapshot.docs.map((d) => ({
      id: d.id,
      title: d.data().title,
      description: d.data().description,
      category: d.data().category,
      address: d.data().address,
    }));

    if (existingComplaints.length === 0) {
      return NextResponse.json({
        result: { duplicates: [], is_new: true },
      });
    }

    // Claude API로 중복 검사
    const result = await checkDuplicate(
      { title, description, category, address },
      existingComplaints
    );

    // 중복 민원들의 상세 정보도 함께 반환
    if (result.duplicates.length > 0) {
      const duplicateDetails = [];
      for (const dup of result.duplicates) {
        const dupRef = doc(db, 'complaints', dup.id);
        const dupSnap = await getDoc(dupRef);
        if (dupSnap.exists()) {
          const data = dupSnap.data();
          duplicateDetails.push({
            id: dupSnap.id,
            title: data.title,
            description: data.description,
            category: data.category,
            address: data.address,
            duplicate_count: data.duplicate_count ?? 0,
            created_at: data.created_at,
            severity: data.severity,
          });
        }
      }

      return NextResponse.json({
        result,
        duplicate_details: duplicateDetails,
      });
    }

    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
