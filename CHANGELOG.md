# Changelog

All notable changes to Fricking Watch Repair are recorded here. The newest release is listed first.

## 1.2.0 — 2026-11-06

### Added
- **Date Received on repairs.** New repair orders now capture a received date (defaulting to today). The date is editable inline from the repair detail page and is printed as "Received" on the generated customer PDF.
- **Parts Ordered tab.** The Parts page has a new "Parts Ordered" tab listing every part ordered across all repairs, with columns for the part, customer, model, vendor, and order date. Each row can be viewed (jumps to the repair), edited on a dedicated page, or deleted. The list can be filtered by status (All / On order / Received) and sorted by any column. Ordered parts are kept entirely separate from the parts inventory.

### Changed
- The repair PDF "Received" date now uses the repair's received date, falling back to its creation date.

### Migration notes
- A `receivedAt` column is added to the `watch` table on first startup after the upgrade, and existing repairs are backfilled from their creation date — no manual steps and no data loss. Your database is backed up automatically by `update.bat` before any change.

## 1.1.0

### Added
- Customer-facing PDF export for repairs.
- Currency format preference for part costs.
- Distinct status badge colors (green for Delivered).

### Fixed
- Uploading several photos at once no longer fails.
