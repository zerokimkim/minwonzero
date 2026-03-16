-- 민원 테이블
CREATE TABLE complaints (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  category      TEXT NOT NULL,

  -- 위치 정보
  lat           DOUBLE PRECISION NOT NULL,
  lng           DOUBLE PRECISION NOT NULL,
  address       TEXT NOT NULL,
  region_code   TEXT NOT NULL,

  -- 중복/상태
  duplicate_count  INT DEFAULT 1,
  parent_id        UUID REFERENCES complaints(id) ON DELETE SET NULL,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
  severity         TEXT DEFAULT 'normal' CHECK (severity IN ('normal', 'warning', 'danger', 'critical')),

  -- AI 분석/공개용
  embedding_text   TEXT,
  ai_title         TEXT,                          -- AI가 정리한 제목
  ai_summary       TEXT,                          -- AI가 요약한 내용

  -- 민원인 정보 (실명 필수, DB에 원본 저장)
  author_name      TEXT NOT NULL,                 -- 실명
  author_phone     TEXT NOT NULL,                 -- 전화번호
  author_region    TEXT NOT NULL,                 -- 거주지역

  -- 마스킹된 공개 정보
  masked_name      TEXT NOT NULL,                 -- 김**
  masked_phone     TEXT NOT NULL,                 -- 010-****-3***
  masked_content   TEXT,                          -- 내용 일부만

  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  resolved_at   TIMESTAMPTZ
);

-- 인덱스
CREATE INDEX idx_complaints_region ON complaints(region_code);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_parent ON complaints(parent_id);
CREATE INDEX idx_complaints_location ON complaints(lat, lng);
CREATE INDEX idx_complaints_severity ON complaints(severity);
CREATE INDEX idx_complaints_created ON complaints(created_at DESC);

-- 중복 연결 테이블
CREATE TABLE duplicate_links (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_id   UUID REFERENCES complaints(id) ON DELETE CASCADE NOT NULL,
  duplicate_id  UUID REFERENCES complaints(id) ON DELETE CASCADE NOT NULL,
  similarity    FLOAT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(original_id, duplicate_id)
);

-- 동의/지지 테이블
CREATE TABLE complaint_supports (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  complaint_id  UUID REFERENCES complaints(id) ON DELETE CASCADE NOT NULL,
  supporter_ip  TEXT NOT NULL,
  user_id       UUID,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(complaint_id, supporter_ip)
);

CREATE INDEX idx_supports_complaint ON complaint_supports(complaint_id);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER complaints_updated_at
  BEFORE UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS (Row Level Security) 정책
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE duplicate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_supports ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 가능
CREATE POLICY "complaints_read" ON complaints FOR SELECT USING (true);
CREATE POLICY "duplicate_links_read" ON duplicate_links FOR SELECT USING (true);
CREATE POLICY "supports_read" ON complaint_supports FOR SELECT USING (true);

-- 누구나 생성 가능 (익명 포함)
CREATE POLICY "complaints_insert" ON complaints FOR INSERT WITH CHECK (true);
CREATE POLICY "duplicate_links_insert" ON duplicate_links FOR INSERT WITH CHECK (true);
CREATE POLICY "supports_insert" ON complaint_supports FOR INSERT WITH CHECK (true);

-- 업데이트는 서버에서만 (service role)
CREATE POLICY "complaints_update" ON complaints FOR UPDATE USING (true);
