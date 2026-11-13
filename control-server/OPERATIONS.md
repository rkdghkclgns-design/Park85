# Operating and verification data

Production API reads pass through `operationalEnvironment`. Source tables are scoped to indexed `operational_*` views; QA requests use their existing isolated `qa_*` schema. `production_test_sites` identifies preserved historical test sites explicitly, rather than guessing from names on each request.

Archived source rows and media keys remain unchanged. Database triggers reject source-row writes. Administrators can open historical site/report/photo links read-only and browse **More → Verification data**. New tests belong in `/verification/`.

Release order for this change:

1. Back up primary and media data and audit unsent/reserved mail.
2. Apply `0032_operational_test_archive.sql` while the archive mapping is empty.
3. Deploy the backend and frontend.
4. Apply `0033_archive_known_test_sites.sql` to classify only the explicitly identified prelaunch test sites.
5. Check live map, analytics, reports, settlement exports and mail previews; compare preserved report/photo IDs and hashes.

Archiving holds all unreserved pending daily mail and affected unreserved completion/client/monthly/worker/tax snapshots. Existing bodies remain available. Already sent/reserved messages retain their delivery identity; audit any unsent reserved message before classification. Held snapshots need administrator review and must not be sent as current operating figures.

The settlement reconciliation panel uses exact integer arithmetic and shows confirmed inputs separately from missing fields. Internal work is excluded from cleaner wages. Worker overpayments and unpaid amounts are accumulated per worker without offsetting one another. Suggested author allocations are not treated as confirmed allocations. A saved zero invoice retains the existing optional VAT policy. Month-close snapshots remain immutable when later receipts or cleaner payments are recorded.

For a non-production priced rehearsal, use the QA workspace and clearly label all sample contracts, invoices, cleaners and photos. No test should insert real settlement payments or close a production month.
