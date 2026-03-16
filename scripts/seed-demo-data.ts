/**
 * 민원제로 데모 데이터 시딩 스크립트
 * 실행: npx tsx scripts/seed-demo-data.ts
 *
 * 실제 한국 지역 좌표 + 현실적인 민원 내용으로 50건 생성
 * 청라 지게차 / 포항 스쿨존 같은 실제 유형 기반
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function maskName(name: string): string {
  if (name.length <= 1) return name;
  return name[0] + '*'.repeat(name.length - 1);
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-****-${digits.slice(7, 8)}***`;
  }
  return `${digits.slice(0, 3)}-****-****`;
}

function maskContent(content: string, maxLength = 50): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + '...';
}

type Severity = 'normal' | 'warning' | 'danger' | 'critical';

function calculateSeverity(count: number, daysAgo: number): Severity {
  if (count >= 50 || (count >= 20 && daysAgo >= 90)) return 'critical';
  if (count >= 20 || (count >= 5 && daysAgo >= 30)) return 'danger';
  if (count >= 5 || daysAgo >= 7) return 'warning';
  return 'normal';
}

interface DemoComplaint {
  title: string;
  description: string;
  category: string;
  lat: number;
  lng: number;
  address: string;
  region_code: string;
  author_name: string;
  author_phone: string;
  author_region: string;
  ai_title: string;
  ai_summary: string;
  duplicate_count: number;
  daysAgo: number;
  status: 'pending' | 'in_progress' | 'resolved';
}

// 현실적인 민원 데이터 50건
const demoComplaints: DemoComplaint[] = [
  // === 인천 청라 지역 (지게차/불법주차 클러스터) ===
  {
    title: '과일가게 지게차 인도 불법주차',
    description: '청라 ○○로 과일가게 앞 인도에 지게차가 매일 불법주차되어 있습니다. 보행로가 막혀 아이들이 차도로 다닙니다. 경사진 인도라 위험합니다.',
    category: '주차/불법주정차', lat: 37.3850, lng: 126.6580,
    address: '인천 서구 청라동 162-1', region_code: '인천 서구',
    author_name: '박지영', author_phone: '010-3456-7890', author_region: '인천 서구',
    ai_title: '청라 인도 지게차 불법주차', ai_summary: '청라동 과일가게 앞 인도에 지게차가 상시 불법주차되어 보행로를 차단하고 있으며, 경사 지형으로 인해 차량 미끄러짐 위험이 있습니다.',
    duplicate_count: 47, daysAgo: 120, status: 'pending',
  },
  {
    title: '인도 위 팔레트 적치물 방치',
    description: '같은 과일가게에서 나무 팔레트와 박스를 인도에 쌓아두고 있습니다. 유모차, 휠체어 통행 불가합니다.',
    category: '주차/불법주정차', lat: 37.3852, lng: 126.6582,
    address: '인천 서구 청라동 162-3', region_code: '인천 서구',
    author_name: '김수현', author_phone: '010-1234-5678', author_region: '인천 서구',
    ai_title: '인도 적치물 방치로 통행 불가', ai_summary: '과일가게에서 나무 팔레트와 박스를 인도에 적치하여 유모차와 휠체어 통행이 불가능한 상태입니다.',
    duplicate_count: 32, daysAgo: 95, status: 'pending',
  },
  {
    title: '청라 어린이 통학로 불법주차',
    description: '초등학교 통학로인데 매일 아침 불법주차 차량 때문에 아이들이 차도로 걸어갑니다.',
    category: '주차/불법주정차', lat: 37.3848, lng: 126.6575,
    address: '인천 서구 청라동 158', region_code: '인천 서구',
    author_name: '이혜진', author_phone: '010-9876-5432', author_region: '인천 서구',
    ai_title: '통학로 불법주차로 아이들 위험', ai_summary: '초등학교 통학로에 불법주차 차량이 상시 점거하여 어린이들이 차도로 보행하는 위험한 상황이 발생하고 있습니다.',
    duplicate_count: 28, daysAgo: 85, status: 'pending',
  },

  // === 포항 스쿨존 지역 (어린이보호구역 클러스터) ===
  {
    title: '어린이보호구역 표지판만 있고 실제 미지정',
    description: '학교 앞에 어린이보호구역 표지판은 있는데 실제로 보호구역으로 지정이 안 되어있습니다. 속도 단속도 없고 과속 차량이 많습니다.',
    category: '안전/재난', lat: 36.0190, lng: 129.3590,
    address: '경북 포항시 북구 흥해읍 마산리 123', region_code: '포항 북구',
    author_name: '오승환', author_phone: '010-5555-1234', author_region: '포항 북구',
    ai_title: '스쿨존 미지정 상태 방치', ai_summary: '어린이보호구역 표지판이 설치되어 있으나 실제 법적 지정이 이루어지지 않아 속도 제한 및 단속이 불가한 상태입니다.',
    duplicate_count: 55, daysAgo: 180, status: 'pending',
  },
  {
    title: '학교 앞 안전펜스 미설치',
    description: '차도와 인도 구분이 없는 구간인데 안전펜스가 없습니다. 상가 민원 때문에 설치 안 한다고 합니다.',
    category: '안전/재난', lat: 36.0192, lng: 129.3588,
    address: '경북 포항시 북구 흥해읍 마산리 125', region_code: '포항 북구',
    author_name: '정미래', author_phone: '010-4444-5678', author_region: '포항 북구',
    ai_title: '학교 앞 안전펜스 설치 요청', ai_summary: '차도와 인도 경계가 불분명한 학교 앞 구간에 안전펜스가 미설치되어 있으며, 상가 민원으로 설치가 보류된 상태입니다.',
    duplicate_count: 38, daysAgo: 150, status: 'pending',
  },
  {
    title: '스쿨존 내 불법 주정차 상습 구간',
    description: '학교 정문 앞 이면도로에 불법 주정차가 심각합니다. 아이들 하교 시간에 시야가 완전히 가려집니다.',
    category: '주차/불법주정차', lat: 36.0188, lng: 129.3592,
    address: '경북 포항시 북구 흥해읍 마산리 127', region_code: '포항 북구',
    author_name: '최동현', author_phone: '010-3333-9876', author_region: '포항 북구',
    ai_title: '스쿨존 불법주정차 시야 차단', ai_summary: '학교 정문 앞 이면도로의 상습적 불법 주정차로 하교 시간 어린이들의 시야가 차단되어 교통사고 위험이 높습니다.',
    duplicate_count: 42, daysAgo: 160, status: 'pending',
  },

  // === 서울 강남 싱크홀 지역 ===
  {
    title: '도로 표면 균열 및 침하',
    description: '역삼역 근처 도로에 큰 균열이 생기고 지면이 내려앉고 있습니다. 차량 통행 시 심하게 흔들립니다.',
    category: '도로/교통', lat: 37.5000, lng: 127.0365,
    address: '서울 강남구 역삼동 823', region_code: '서울 강남구',
    author_name: '한지민', author_phone: '010-6666-1111', author_region: '서울 강남구',
    ai_title: '역삼역 도로 침하 균열', ai_summary: '역삼역 인근 도로에 지반 침하와 균열이 발생하여 차량 통행에 위험이 있으며, 싱크홀 발생 가능성이 우려됩니다.',
    duplicate_count: 25, daysAgo: 45, status: 'in_progress',
  },
  {
    title: '도로 맨홀 뚜껑 들떠있어 위험',
    description: '맨홀 뚜껑이 완전히 안 닫혀서 오토바이나 자전거가 다치기 딱 좋습니다.',
    category: '도로/교통', lat: 37.5005, lng: 127.0370,
    address: '서울 강남구 역삼동 830', region_code: '서울 강남구',
    author_name: '송태양', author_phone: '010-7777-2222', author_region: '서울 강남구',
    ai_title: '맨홀 뚜껑 이탈 위험', ai_summary: '맨홀 뚜껑이 완전히 닫히지 않아 이륜차 및 자전거 이용자의 전도 사고 위험이 있습니다.',
    duplicate_count: 12, daysAgo: 20, status: 'pending',
  },

  // === 부산 해운대 소음 클러스터 ===
  {
    title: '새벽 포장마차 소음',
    description: '해운대 해변 앞 포장마차에서 새벽 2~4시까지 큰 소리로 음악을 틀고 고성방가를 합니다. 주민들 수면권 침해가 심각합니다.',
    category: '소음/진동', lat: 35.1587, lng: 129.1605,
    address: '부산 해운대구 우동 1394', region_code: '부산 해운대구',
    author_name: '강민수', author_phone: '010-8888-3333', author_region: '부산 해운대구',
    ai_title: '해운대 새벽 소음 민원', ai_summary: '해운대 해변 인근 포장마차에서 새벽 시간대 음악 소음과 고성방가로 인해 주변 주민들의 수면권이 심각하게 침해되고 있습니다.',
    duplicate_count: 35, daysAgo: 60, status: 'pending',
  },
  {
    title: '공사장 야간 작업 소음',
    description: '해운대 신축 아파트 공사장에서 밤 10시 이후에도 작업을 합니다. 소음 신고해도 잠깐 멈추고 다시 시작합니다.',
    category: '소음/진동', lat: 35.1592, lng: 129.1610,
    address: '부산 해운대구 우동 1400', region_code: '부산 해운대구',
    author_name: '윤서연', author_phone: '010-9999-4444', author_region: '부산 해운대구',
    ai_title: '야간 공사 소음 반복 민원', ai_summary: '해운대 신축 공사장에서 야간 시간대 불법 작업이 반복되고 있으며, 신고 후에도 일시 중단 후 재개하는 패턴이 지속되고 있습니다.',
    duplicate_count: 22, daysAgo: 40, status: 'in_progress',
  },

  // === 대전 환경 문제 ===
  {
    title: '하수구 악취 심각',
    description: '여름철 하수구에서 악취가 심하게 올라옵니다. 3년째 민원 넣고 있는데 근본적 해결이 안 됩니다.',
    category: '환경/위생', lat: 36.3504, lng: 127.3845,
    address: '대전 유성구 봉명동 548', region_code: '대전 유성구',
    author_name: '임현우', author_phone: '010-1111-5555', author_region: '대전 유성구',
    ai_title: '봉명동 하수구 만성 악취', ai_summary: '하수구에서 만성적으로 악취가 발생하며, 3년간 반복 민원에도 불구하고 근본적인 하수관로 개선이 이루어지지 않고 있습니다.',
    duplicate_count: 60, daysAgo: 365, status: 'pending',
  },
  {
    title: '음식물 쓰레기 불법투기',
    description: '빈 공터에 음식물 쓰레기를 무단 투기하는 사람이 있습니다. 파리, 쥐가 들끓고 악취가 심합니다.',
    category: '환경/위생', lat: 36.3510, lng: 127.3850,
    address: '대전 유성구 봉명동 555', region_code: '대전 유성구',
    author_name: '서지원', author_phone: '010-2222-6666', author_region: '대전 유성구',
    ai_title: '공터 음식물 쓰레기 불법투기', ai_summary: '빈 공터에 음식물 쓰레기가 무단 투기되어 해충과 악취 문제가 발생하고 있습니다.',
    duplicate_count: 15, daysAgo: 30, status: 'pending',
  },

  // === 광주 가로등 문제 ===
  {
    title: '가로등 3개월째 고장',
    description: '주택가 골목 가로등이 고장나서 밤에 완전 암흑입니다. 범죄 위험이 높은 구간인데 수리가 안 됩니다.',
    category: '가로등/시설물', lat: 35.1547, lng: 126.8526,
    address: '광주 북구 운암동 120', region_code: '광주 북구',
    author_name: '노은지', author_phone: '010-3333-7777', author_region: '광주 북구',
    ai_title: '골목 가로등 장기 고장 방치', ai_summary: '주택가 골목 가로등이 3개월간 고장 상태로 방치되어 야간 범죄 취약 구간이 되고 있습니다.',
    duplicate_count: 18, daysAgo: 90, status: 'pending',
  },

  // === 경기 수원 상하수도 ===
  {
    title: '수도관 누수로 도로 침수',
    description: '수도관이 파열되어 도로에 물이 흘러나옵니다. 겨울에는 얼어서 빙판이 됩니다.',
    category: '상하수도', lat: 37.2636, lng: 127.0286,
    address: '경기 수원시 팔달구 인계동 1043', region_code: '수원 팔달구',
    author_name: '장우진', author_phone: '010-4444-8888', author_region: '수원 팔달구',
    ai_title: '수도관 파열 도로 침수', ai_summary: '수도관 파열로 인해 도로에 물이 지속적으로 유출되며, 동절기 결빙으로 보행자 및 차량 미끄러짐 사고 위험이 있습니다.',
    duplicate_count: 20, daysAgo: 35, status: 'in_progress',
  },

  // === 세종시 공원 문제 ===
  {
    title: '공원 놀이시설 파손 방치',
    description: '아이들이 자주 이용하는 공원 미끄럼틀이 부서져 있습니다. 날카로운 부분이 노출되어 다칠 수 있습니다.',
    category: '공원/녹지', lat: 36.4800, lng: 127.0000,
    address: '세종시 나성동 700', region_code: '세종시',
    author_name: '문채원', author_phone: '010-5555-9999', author_region: '세종시',
    ai_title: '공원 놀이기구 파손 방치', ai_summary: '공원 내 미끄럼틀이 파손되어 날카로운 금속 부분이 노출되어 있으며, 어린이 안전사고 위험이 높습니다.',
    duplicate_count: 8, daysAgo: 14, status: 'pending',
  },

  // === 제주 건축 문제 ===
  {
    title: '불법 건축물 증축',
    description: '주택가에 허가 없이 건물을 증축하고 있습니다. 소방차 진입로를 완전히 막고 있어 화재 시 대응이 불가합니다.',
    category: '건축/건설', lat: 33.4996, lng: 126.5312,
    address: '제주 제주시 연동 312-8', region_code: '제주시',
    author_name: '고태리', author_phone: '010-6666-0000', author_region: '제주시',
    ai_title: '불법 증축으로 소방도로 차단', ai_summary: '무허가 건물 증축으로 소방차 진입로가 차단되어 화재 대응이 불가능한 상태입니다.',
    duplicate_count: 10, daysAgo: 25, status: 'pending',
  },

  // === 추가 민원 (전국 다양 지역) ===
  {
    title: '횡단보도 신호등 고장',
    description: '아이들 등하교 시간에 이용하는 횡단보도 신호등이 2주째 꺼져있습니다.',
    category: '안전/재난', lat: 37.5665, lng: 126.9780,
    address: '서울 중구 을지로 50', region_code: '서울 중구',
    author_name: '백승아', author_phone: '010-1234-0001', author_region: '서울 중구',
    ai_title: '횡단보도 신호등 장기 고장', ai_summary: '등하교 시간대 이용 횡단보도의 신호등이 2주간 고장 상태이며, 어린이 교통사고 위험이 우려됩니다.',
    duplicate_count: 15, daysAgo: 14, status: 'pending',
  },
  {
    title: '골목길 CCTV 사각지대',
    description: '주택가 골목 200m 구간에 CCTV가 하나도 없습니다. 최근 절도 사건이 발생했습니다.',
    category: '안전/재난', lat: 37.4979, lng: 127.0276,
    address: '서울 강남구 삼성동 112', region_code: '서울 강남구',
    author_name: '차은우', author_phone: '010-1234-0002', author_region: '서울 강남구',
    ai_title: '주택가 CCTV 사각지대', ai_summary: '주택가 골목 200m 구간에 CCTV가 부재하여 범죄에 취약하며, 최근 절도 사건이 발생했습니다.',
    duplicate_count: 7, daysAgo: 10, status: 'pending',
  },
  {
    title: '도로 포트홀 방치',
    description: '버스 정류장 앞 도로에 포트홀이 크게 생겨있는데 한 달째 보수가 안 됩니다.',
    category: '도로/교통', lat: 37.3947, lng: 126.9638,
    address: '경기 안양시 만안구 안양동 456', region_code: '안양 만안구',
    author_name: '유하늘', author_phone: '010-1234-0003', author_region: '안양 만안구',
    ai_title: '버스정류장 앞 포트홀 방치', ai_summary: '버스 정류장 앞 도로에 대형 포트홀이 발생하여 1개월간 미보수 상태이며, 버스 승하차 시 위험합니다.',
    duplicate_count: 11, daysAgo: 30, status: 'pending',
  },
  {
    title: '재활용 분리수거장 악취',
    description: '아파트 단지 내 분리수거장에서 악취가 심합니다. 여름철에는 생활이 불가능할 정도입니다.',
    category: '환경/위생', lat: 37.5100, lng: 127.0590,
    address: '서울 강남구 대치동 890', region_code: '서울 강남구',
    author_name: '조아름', author_phone: '010-1234-0004', author_region: '서울 강남구',
    ai_title: '아파트 분리수거장 악취 심각', ai_summary: '아파트 단지 내 분리수거장에서 만성적인 악취가 발생하여 주민 생활환경이 심각하게 저해되고 있습니다.',
    duplicate_count: 9, daysAgo: 20, status: 'pending',
  },
  {
    title: '도로변 가로수 가지 전선 접촉',
    description: '가로수 가지가 전선에 닿아있어 비바람에 합선 위험이 있습니다. 3번 신고했는데 전지작업이 안 됩니다.',
    category: '가로등/시설물', lat: 35.8714, lng: 128.6014,
    address: '대구 수성구 범어동 780', region_code: '대구 수성구',
    author_name: '권도윤', author_phone: '010-1234-0005', author_region: '대구 수성구',
    ai_title: '가로수 전선 접촉 합선 위험', ai_summary: '가로수 가지가 전선에 접촉하여 강풍 시 합선 위험이 있으며, 3회 신고에도 전지작업이 이루어지지 않고 있습니다.',
    duplicate_count: 6, daysAgo: 21, status: 'pending',
  },
  {
    title: '무단방치 폐차량',
    description: '주택가 골목에 번호판 없는 폐차가 6개월째 방치되어 있습니다. 쥐 서식처가 되고 있습니다.',
    category: '환경/위생', lat: 35.1796, lng: 129.0756,
    address: '부산 동구 수정동 234', region_code: '부산 동구',
    author_name: '허윤', author_phone: '010-1234-0006', author_region: '부산 동구',
    ai_title: '주택가 폐차 6개월 방치', ai_summary: '주택가 골목에 번호판 없는 폐차량이 6개월간 방치되어 해충 서식처가 되고 있습니다.',
    duplicate_count: 4, daysAgo: 180, status: 'pending',
  },
  {
    title: '어린이집 앞 과속 차량',
    description: '어린이집 바로 앞 도로에 과속 차량이 많습니다. 속도 측정 카메라나 과속방지턱이 필요합니다.',
    category: '안전/재난', lat: 37.3860, lng: 127.1230,
    address: '경기 성남시 분당구 정자동 15', region_code: '성남 분당구',
    author_name: '신유진', author_phone: '010-1234-0007', author_region: '성남 분당구',
    ai_title: '어린이집 앞 과속 단속 요청', ai_summary: '어린이집 앞 도로에서 과속 차량이 빈번하며, 과속방지턱 또는 속도 측정 카메라 설치가 필요합니다.',
    duplicate_count: 16, daysAgo: 45, status: 'pending',
  },
  {
    title: '빗물 배수로 막힘',
    description: '비만 오면 도로가 침수됩니다. 배수구가 낙엽과 쓰레기로 막혀있는데 청소가 안 됩니다.',
    category: '상하수도', lat: 37.5500, lng: 126.9100,
    address: '서울 마포구 공덕동 110', region_code: '서울 마포구',
    author_name: '양서현', author_phone: '010-1234-0008', author_region: '서울 마포구',
    ai_title: '배수구 막힘 도로 상습 침수', ai_summary: '배수구가 낙엽과 쓰레기로 막혀 비 올 때마다 도로 침수가 반복되고 있습니다.',
    duplicate_count: 13, daysAgo: 25, status: 'pending',
  },
  {
    title: '택배 차량 이중주차 상습',
    description: '택배 물류센터 앞 도로에서 택배 차량 이중주차가 상습적입니다. 출퇴근 시간대 교통 마비됩니다.',
    category: '주차/불법주정차', lat: 37.4700, lng: 126.8900,
    address: '경기 광명시 철산동 200', region_code: '광명시',
    author_name: '류태호', author_phone: '010-1234-0009', author_region: '광명시',
    ai_title: '택배차량 이중주차 교통 마비', ai_summary: '택배 물류센터 앞 도로에서 택배 차량의 상습적 이중주차로 출퇴근 시간대 심각한 교통 정체가 발생하고 있습니다.',
    duplicate_count: 19, daysAgo: 50, status: 'pending',
  },
  {
    title: '놀이터 모래밭 유리조각',
    description: '아파트 놀이터 모래밭에서 유리 파편이 발견되었습니다. 아이들이 맨발로 놀다 다칠 수 있습니다.',
    category: '공원/녹지', lat: 37.5150, lng: 127.1000,
    address: '서울 송파구 잠실동 301', region_code: '서울 송파구',
    author_name: '오세린', author_phone: '010-1234-0010', author_region: '서울 송파구',
    ai_title: '놀이터 모래밭 유리 파편 위험', ai_summary: '아파트 놀이터 모래밭에서 유리 파편이 발견되어 어린이 부상 위험이 있으며, 즉각적인 안전 점검이 필요합니다.',
    duplicate_count: 5, daysAgo: 3, status: 'in_progress',
  },

  // === 추가 다양한 민원 ===
  {
    title: '공사 잔재물 도로 방치',
    description: '도로 공사 후 잔재물을 치우지 않아 자전거와 오토바이 통행이 위험합니다.',
    category: '건축/건설', lat: 36.8071, lng: 127.1471,
    address: '충남 천안시 동남구 신방동 100', region_code: '천안 동남구',
    author_name: '남지호', author_phone: '010-1234-0011', author_region: '천안 동남구',
    ai_title: '도로 공사 잔재물 방치', ai_summary: '도로 공사 후 잔재물이 미처리 방치되어 이륜차 통행에 위험합니다.',
    duplicate_count: 7, daysAgo: 12, status: 'pending',
  },
  {
    title: '공영주차장 요금기 고장',
    description: '공영주차장 출구 요금기가 고장나서 매일 줄이 깁니다. 수리 요청한 지 2주입니다.',
    category: '기타', lat: 37.2750, lng: 127.0100,
    address: '경기 수원시 장안구 영화동 220', region_code: '수원 장안구',
    author_name: '김소율', author_phone: '010-1234-0012', author_region: '수원 장안구',
    ai_title: '공영주차장 요금기 2주 고장', ai_summary: '공영주차장 출구 요금기가 2주간 고장 상태로 차량 대기줄이 발생하고 있습니다.',
    duplicate_count: 8, daysAgo: 14, status: 'pending',
  },
  {
    title: '산책로 조명 전체 소등',
    description: '하천변 산책로 조명이 전체 소등되어 밤에 이용이 불가합니다. 범죄 위험도 있습니다.',
    category: '가로등/시설물', lat: 37.5640, lng: 126.9770,
    address: '서울 종로구 청계천로 20', region_code: '서울 종로구',
    author_name: '정하은', author_phone: '010-1234-0013', author_region: '서울 종로구',
    ai_title: '하천 산책로 전체 소등', ai_summary: '하천변 산책로의 조명이 전면 소등되어 야간 이용이 불가하며, 범죄 취약 구간이 되고 있습니다.',
    duplicate_count: 10, daysAgo: 18, status: 'pending',
  },
  {
    title: '전동킥보드 무단 방치',
    description: '공유 전동킥보드가 보도 한가운데 방치되어 있어 보행자, 특히 시각장애인에게 위험합니다.',
    category: '도로/교통', lat: 37.5550, lng: 126.9370,
    address: '서울 마포구 상수동 78', region_code: '서울 마포구',
    author_name: '윤준서', author_phone: '010-1234-0014', author_region: '서울 마포구',
    ai_title: '전동킥보드 보도 무단 방치', ai_summary: '공유 전동킥보드가 보도 중앙에 무단 방치되어 시각장애인 등 보행 약자에게 위험을 초래하고 있습니다.',
    duplicate_count: 20, daysAgo: 8, status: 'pending',
  },
  {
    title: '아파트 외벽 균열',
    description: '아파트 외벽에 심각한 균열이 있습니다. 콘크리트 조각이 떨어질 위험이 있어 보행자가 위험합니다.',
    category: '건축/건설', lat: 35.1500, lng: 126.9150,
    address: '광주 서구 치평동 500', region_code: '광주 서구',
    author_name: '이서준', author_phone: '010-1234-0015', author_region: '광주 서구',
    ai_title: '아파트 외벽 균열 낙하 위험', ai_summary: '아파트 외벽 심각한 균열로 콘크리트 조각 낙하 위험이 있어 보행자 안전이 위협받고 있습니다.',
    duplicate_count: 14, daysAgo: 30, status: 'pending',
  },
  {
    title: '불법 소각 연기',
    description: '농촌 지역에서 쓰레기를 불법 소각하여 연기와 악취가 주거단지까지 퍼집니다.',
    category: '환경/위생', lat: 36.9900, lng: 127.0900,
    address: '경기 평택시 진위면 은산리 50', region_code: '평택시',
    author_name: '배다현', author_phone: '010-1234-0016', author_region: '평택시',
    ai_title: '농촌 불법 소각 연기 피해', ai_summary: '농촌 지역의 쓰레기 불법 소각으로 발생한 연기와 악취가 인근 주거단지에 피해를 주고 있습니다.',
    duplicate_count: 6, daysAgo: 15, status: 'pending',
  },
  {
    title: '자전거 도로 포장 파손',
    description: '자전거 전용도로 포장이 심하게 파손되어 자전거 타이어가 빠집니다.',
    category: '도로/교통', lat: 35.8500, lng: 128.6000,
    address: '대구 달서구 월성동 340', region_code: '대구 달서구',
    author_name: '홍예림', author_phone: '010-1234-0017', author_region: '대구 달서구',
    ai_title: '자전거도로 포장 파손', ai_summary: '자전거 전용도로의 포장 파손이 심각하여 주행 중 타이어 빠짐 사고가 발생하고 있습니다.',
    duplicate_count: 8, daysAgo: 20, status: 'pending',
  },
  {
    title: '공중화장실 위생 불량',
    description: '공원 내 공중화장실이 청소가 전혀 안 되어 악취가 심하고 사용이 불가한 수준입니다.',
    category: '환경/위생', lat: 37.5280, lng: 126.9340,
    address: '서울 용산구 이태원동 60', region_code: '서울 용산구',
    author_name: '안지우', author_phone: '010-1234-0018', author_region: '서울 용산구',
    ai_title: '공원 공중화장실 위생 심각', ai_summary: '공원 내 공중화장실의 청소 관리가 이루어지지 않아 악취와 위생 문제가 심각한 수준입니다.',
    duplicate_count: 12, daysAgo: 25, status: 'pending',
  },
  {
    title: '빈집 방치로 청소년 비행 장소화',
    description: '오래된 빈집이 방치되어 청소년 비행 장소로 사용되고 있습니다. 화재 위험도 있습니다.',
    category: '안전/재난', lat: 35.1000, lng: 129.0300,
    address: '부산 남구 대연동 180', region_code: '부산 남구',
    author_name: '천서영', author_phone: '010-1234-0019', author_region: '부산 남구',
    ai_title: '빈집 방치 비행/화재 위험', ai_summary: '방치된 빈집이 청소년 비행 장소로 사용되고 있으며, 건물 노후화로 화재 위험이 있습니다.',
    duplicate_count: 5, daysAgo: 60, status: 'pending',
  },

  // === 해결된 민원 (성공 사례) ===
  {
    title: '어린이 보호구역 과속방지턱 설치 요청',
    description: '학교 앞 과속방지턱이 설치되었습니다. 민원 접수 후 2주만에 해결되었습니다.',
    category: '안전/재난', lat: 37.4200, lng: 127.1260,
    address: '경기 성남시 분당구 야탑동 350', region_code: '성남 분당구',
    author_name: '성윤아', author_phone: '010-1234-0020', author_region: '성남 분당구',
    ai_title: '스쿨존 과속방지턱 설치 완료', ai_summary: '어린이 보호구역 과속방지턱 설치가 시민 민원을 통해 2주 만에 완료되었습니다.',
    duplicate_count: 30, daysAgo: 60, status: 'resolved',
  },
  {
    title: '횡단보도 신호 시간 연장',
    description: '노인 보행자가 많은 구간 횡단보도 신호 시간이 연장되었습니다.',
    category: '도로/교통', lat: 37.5700, lng: 126.9820,
    address: '서울 종로구 종로 100', region_code: '서울 종로구',
    author_name: '최보람', author_phone: '010-1234-0021', author_region: '서울 종로구',
    ai_title: '노인 보행 구간 신호 연장 완료', ai_summary: '노인 보행자가 많은 구간의 횡단보도 보행 신호 시간이 시민 민원을 반영하여 연장되었습니다.',
    duplicate_count: 25, daysAgo: 45, status: 'resolved',
  },
  {
    title: '쓰레기 무단투기 CCTV 설치',
    description: '무단투기가 심했던 구간에 CCTV가 설치되어 투기가 크게 줄었습니다.',
    category: '환경/위생', lat: 37.4800, lng: 126.9520,
    address: '서울 관악구 신림동 230', region_code: '서울 관악구',
    author_name: '구민재', author_phone: '010-1234-0022', author_region: '서울 관악구',
    ai_title: '무단투기 구간 CCTV 설치 완료', ai_summary: '쓰레기 무단투기가 심했던 구간에 CCTV가 설치되어 투기가 현저히 감소했습니다.',
    duplicate_count: 18, daysAgo: 90, status: 'resolved',
  },

  // === 처리중 민원 ===
  {
    title: '지하보도 누수',
    description: '지하보도 천장에서 물이 계속 떨어집니다. 겨울에는 얼어서 미끄럼 사고 위험이 있습니다.',
    category: '상하수도', lat: 37.5560, lng: 126.9723,
    address: '서울 중구 명동 45', region_code: '서울 중구',
    author_name: '탁현진', author_phone: '010-1234-0023', author_region: '서울 중구',
    ai_title: '지하보도 누수 동결 위험', ai_summary: '지하보도 천장 누수가 발생하여 동절기 결빙으로 보행자 미끄럼 사고 위험이 있습니다.',
    duplicate_count: 9, daysAgo: 35, status: 'in_progress',
  },
  {
    title: '버스 노선 변경 불편',
    description: '버스 노선이 갑자기 변경되어 출퇴근 시간이 30분 이상 늘었습니다. 대안 노선이 필요합니다.',
    category: '도로/교통', lat: 37.4100, lng: 127.1280,
    address: '경기 성남시 분당구 서현동 260', region_code: '성남 분당구',
    author_name: '피유나', author_phone: '010-1234-0024', author_region: '성남 분당구',
    ai_title: '버스 노선 변경 출퇴근 불편', ai_summary: '버스 노선 갑작스러운 변경으로 출퇴근 시간이 30분 이상 증가하여 대안 노선 편성이 요청되고 있습니다.',
    duplicate_count: 35, daysAgo: 10, status: 'in_progress',
  },

  // === 최근 등록 민원 (낮은 심각도) ===
  {
    title: '공원 벤치 파손',
    description: '공원 벤치 좌판이 부서져서 앉으면 위험합니다.',
    category: '공원/녹지', lat: 37.5670, lng: 126.9785,
    address: '서울 종로구 사직동 130', region_code: '서울 종로구',
    author_name: '한소희', author_phone: '010-1234-0025', author_region: '서울 종로구',
    ai_title: '공원 벤치 좌판 파손', ai_summary: '공원 벤치 좌판이 파손되어 이용자 부상 위험이 있습니다.',
    duplicate_count: 2, daysAgo: 3, status: 'pending',
  },
  {
    title: '주택가 빗물받이 막힘',
    description: '비 올 때마다 빗물받이가 막혀서 집 앞이 침수됩니다.',
    category: '상하수도', lat: 37.5400, lng: 127.0700,
    address: '서울 광진구 구의동 90', region_code: '서울 광진구',
    author_name: '모은하', author_phone: '010-1234-0026', author_region: '서울 광진구',
    ai_title: '빗물받이 막힘 주택 침수', ai_summary: '주택가 빗물받이가 막혀 강우 시 주택 앞 침수가 반복되고 있습니다.',
    duplicate_count: 3, daysAgo: 5, status: 'pending',
  },
  {
    title: '도로 표지판 가림',
    description: '나무가지가 자라서 도로 표지판을 가리고 있어 운전자가 표지판을 볼 수 없습니다.',
    category: '도로/교통', lat: 36.6372, lng: 127.4917,
    address: '충북 청주시 흥덕구 복대동 100', region_code: '청주 흥덕구',
    author_name: '심나경', author_phone: '010-1234-0027', author_region: '청주 흥덕구',
    ai_title: '나뭇가지 도로표지판 가림', ai_summary: '가로수 가지가 도로 표지판을 가려 운전자 시야를 방해하고 있습니다.',
    duplicate_count: 4, daysAgo: 7, status: 'pending',
  },
  {
    title: '축사 악취 피해',
    description: '주거지 인근 축사에서 심한 악취가 발생합니다. 환기 시설이 전혀 없습니다.',
    category: '환경/위생', lat: 35.2300, lng: 128.6800,
    address: '경남 김해시 진영읍 진영리 200', region_code: '김해시',
    author_name: '공시우', author_phone: '010-1234-0028', author_region: '김해시',
    ai_title: '주거지 인근 축사 악취', ai_summary: '주거지 인근 축사에서 환기 시설 부재로 심한 악취가 발생하여 주민 피해가 크고 있습니다.',
    duplicate_count: 11, daysAgo: 40, status: 'pending',
  },
  {
    title: '전봇대 기울어짐',
    description: '전봇대가 심하게 기울어져 있어 쓰러질 위험이 있습니다. 강풍 시 특히 위험합니다.',
    category: '가로등/시설물', lat: 35.5384, lng: 129.3114,
    address: '울산 남구 삼산동 456', region_code: '울산 남구',
    author_name: '방채린', author_phone: '010-1234-0029', author_region: '울산 남구',
    ai_title: '전봇대 기울어짐 도괴 위험', ai_summary: '전봇대가 심하게 기울어져 있어 강풍 시 도괴 위험이 있으며, 전선 절단 사고가 우려됩니다.',
    duplicate_count: 6, daysAgo: 10, status: 'pending',
  },
  {
    title: '공동주택 승강기 고장 방치',
    description: '15층 아파트 승강기 2대 중 1대가 한 달째 고장입니다. 노인과 장애인 이동이 불편합니다.',
    category: '기타', lat: 37.3900, lng: 126.9500,
    address: '경기 안양시 동안구 비산동 300', region_code: '안양 동안구',
    author_name: '주찬영', author_phone: '010-1234-0030', author_region: '안양 동안구',
    ai_title: '아파트 승강기 1개월 고장', ai_summary: '15층 아파트 승강기 2대 중 1대가 1개월간 고장 방치되어 노인과 장애인의 이동이 불편합니다.',
    duplicate_count: 14, daysAgo: 30, status: 'pending',
  },
];

async function seed() {
  console.log('🌱 민원제로 데모 데이터 시딩 시작...\n');

  let success = 0;
  let fail = 0;

  for (const c of demoComplaints) {
    const daysAgo = c.daysAgo;
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    const severity = calculateSeverity(c.duplicate_count, daysAgo);

    try {
      await addDoc(collection(db, 'complaints'), {
        title: c.title,
        description: c.description,
        category: c.category,
        lat: c.lat,
        lng: c.lng,
        address: c.address,
        region_code: c.region_code,
        author_name: c.author_name,
        author_phone: c.author_phone,
        author_region: c.author_region,
        masked_name: maskName(c.author_name),
        masked_phone: maskPhone(c.author_phone),
        masked_content: maskContent(c.description),
        ai_title: c.ai_title,
        ai_summary: c.ai_summary,
        duplicate_count: c.duplicate_count,
        severity,
        status: c.status,
        parent_id: null,
        embedding_text: `${c.title} ${c.description} ${c.address}`,
        created_at: createdAt,
        updated_at: createdAt,
        resolved_at: c.status === 'resolved' ? new Date().toISOString() : null,
      });

      const severityEmoji = severity === 'critical' ? '🔴' : severity === 'danger' ? '🟠' : severity === 'warning' ? '🟡' : '🟢';
      console.log(`  ${severityEmoji} ${c.ai_title} (${c.duplicate_count}건, ${daysAgo}일)`);
      success++;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`  ❌ ${c.ai_title}: ${message}`);
      fail++;
    }
  }

  console.log(`\n✅ 시딩 완료: 성공 ${success}건, 실패 ${fail}건`);
  console.log(`📊 총 ${demoComplaints.length}건의 민원이 전국 지도에 표시됩니다.`);
  process.exit(0);
}

seed().catch(console.error);
