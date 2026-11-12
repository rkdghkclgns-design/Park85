CREATE TABLE site_reporting (
  site_id TEXT PRIMARY KEY REFERENCES work_sites(id),
  region_name TEXT REFERENCES charger_regions(region_name),
  contractor_email TEXT NOT NULL DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE control_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  admin_email TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE field_reports (
  id TEXT PRIMARY KEY NOT NULL,
  site_id TEXT NOT NULL REFERENCES work_sites(id),
  work_date TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  site_name TEXT NOT NULL,
  site_address TEXT NOT NULL,
  units INTEGER NOT NULL,
  exterior INTEGER NOT NULL,
  interior INTEGER NOT NULL,
  notes TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('submitted', 'revision', 'approved')),
  review_note TEXT NOT NULL DEFAULT '',
  region_name TEXT,
  contract_price INTEGER,
  worker_price INTEGER,
  updated_at TEXT NOT NULL,
  UNIQUE (site_id, work_date)
);
--> statement-breakpoint
CREATE INDEX field_reports_work_date ON field_reports(work_date);
--> statement-breakpoint
CREATE TABLE report_mail (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL,
  reference TEXT NOT NULL,
  recipient TEXT NOT NULL,
  sender TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  lease_until TEXT,
  provider_id TEXT,
  sent_at TEXT
);
