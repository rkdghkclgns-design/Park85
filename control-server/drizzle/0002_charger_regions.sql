CREATE TABLE charger_regions (
  region_name TEXT PRIMARY KEY NOT NULL,
  charger_count INTEGER NOT NULL CHECK (charger_count >= 0),
  source_date TEXT NOT NULL,
  contract_price INTEGER CHECK (contract_price BETWEEN 0 AND 9007199254740991),
  worker_price INTEGER CHECK (worker_price BETWEEN 0 AND 9007199254740991)
);
--> statement-breakpoint
-- 무공해차 통합누리집, 우리 지역 급속 충전 여건, 전체 충전기, 2026-10-31.
-- https://www.ev.or.kr/nportal/stats/statsDashboard.do#chargeInfraStatus
INSERT INTO charger_regions (region_name, charger_count, source_date) VALUES
  ('경기도', 157944, '2026-10-31'),
  ('서울특별시', 77174, '2026-10-31'),
  ('인천광역시', 34260, '2026-10-31'),
  ('전남광주통합특별시', 33980, '2026-10-31'),
  ('부산광역시', 32896, '2026-10-31'),
  ('경상남도', 31921, '2026-10-31'),
  ('대구광역시', 26085, '2026-10-31'),
  ('경상북도', 24642, '2026-10-31'),
  ('충청남도', 23371, '2026-10-31'),
  ('충청북도', 18617, '2026-10-31'),
  ('전북특별자치도', 18408, '2026-10-31'),
  ('강원특별자치도', 18394, '2026-10-31'),
  ('대전광역시', 15344, '2026-10-31'),
  ('제주특별자치도', 12521, '2026-10-31'),
  ('울산광역시', 10840, '2026-10-31'),
  ('세종특별자치시', 6640, '2026-10-31');
