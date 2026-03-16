import Anthropic from '@anthropic-ai/sdk';
import type { Complaint, DuplicateCheckResult } from '@/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const SYSTEM_PROMPT = `당신은 시민 민원 유사도 분석 전문가입니다.
새로운 민원과 기존 민원들을 비교하여 동일한 문제에 대한 민원인지 판단합니다.

판단 기준:
1. 같은 위치/지역의 같은 문제인가?
2. 문제의 핵심이 동일한가? (표현이 달라도 같은 문제면 중복)
3. 시간적으로 연관성이 있는가? (해결되지 않고 지속되는 문제)

중요: 같은 지역에서 같은 종류의 문제를 신고한 것이면 표현이 달라도 중복으로 판단하세요.
예) "신호등 고장" vs "빨간불이 안 켜져요" → 같은 문제 = 중복

반드시 아래 JSON 형식으로만 응답하세요:
{
  "duplicates": [
    { "id": "기존민원UUID", "similarity": 0.95, "reason": "판단 근거 한줄" }
  ],
  "is_new": false
}
중복이 없으면: { "duplicates": [], "is_new": true }`;

export async function checkDuplicate(
  newComplaint: {
    title: string;
    description: string;
    category: string;
    address: string;
  },
  existingComplaints: Pick<
    Complaint,
    'id' | 'title' | 'description' | 'category' | 'address'
  >[]
): Promise<DuplicateCheckResult> {
  if (existingComplaints.length === 0) {
    return { duplicates: [], is_new: true };
  }

  const existingList = existingComplaints
    .map(
      (c, i) =>
        `[${i + 1}] ID: ${c.id}\n제목: ${c.title}\n내용: ${c.description}\n카테고리: ${c.category}\n주소: ${c.address}`
    )
    .join('\n\n');

  const userMessage = `새 민원:
제목: ${newComplaint.title}
내용: ${newComplaint.description}
카테고리: ${newComplaint.category}
주소: ${newComplaint.address}

---
같은 지역의 기존 민원 목록:
${existingList}

위 기존 민원 중 새 민원과 동일한 문제를 다루는 것이 있는지 분석해주세요.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';

    // JSON 파싱
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { duplicates: [], is_new: true };
    }

    const result = JSON.parse(jsonMatch[0]) as DuplicateCheckResult;
    // 유사도 0.8 이상만 중복으로 취급
    result.duplicates = result.duplicates.filter((d) => d.similarity >= 0.8);
    result.is_new = result.duplicates.length === 0;

    return result;
  } catch (error) {
    console.error('Claude duplicate check error:', error);
    return { duplicates: [], is_new: true };
  }
}

// AI로 민원 제목/요약 생성
export async function generateComplaintSummary(
  title: string,
  description: string,
  category: string,
  address: string
): Promise<{ ai_title: string; ai_summary: string }> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: `당신은 시민 민원을 정리하는 공무원 보조 AI입니다.
민원 내용을 보고 다음을 생성합니다:
1. ai_title: 핵심 문제를 한 줄로 정리한 제목 (20자 이내)
2. ai_summary: 민원 내용을 2~3문장으로 객관적으로 요약 (개인정보 제외)

반드시 JSON 형식으로만 응답:
{ "ai_title": "정리된 제목", "ai_summary": "요약 내용" }`,
      messages: [
        {
          role: 'user',
          content: `카테고리: ${category}\n위치: ${address}\n제목: ${title}\n내용: ${description}`,
        },
      ],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Claude summary generation error:', error);
  }

  // 실패 시 원본 기반 폴백
  return {
    ai_title: title.slice(0, 20),
    ai_summary: description.slice(0, 100),
  };
}
