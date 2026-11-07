-- GTS migration 0009 — orders (package → checkout → QRIS → approve).
--
-- A new user picks a package first (Bulanan / Triwulanan /
-- Semesteran), checks out, and only then signs in (login modal on
-- the Checkout button). The order is stored as `pending_payment`
-- with a 1-hour payment window (`expires_at` = created + 3600s,
-- ISO UTC with Z so the client countdown parses it correctly).
-- The buyer uploads a payment proof (base64 JPEG, client-side
-- compressed) → `proof_uploaded` → an admin verifies it on the
-- Finance page → `active` + material grants. Until then the
-- materials stay Locked — access is still decided by grants alone.
--
-- Statuses: pending_payment → proof_uploaded → active | cancelled.
-- `expired` is COMPUTED on read (pending_payment past expires_at),
-- never stored — there is no cron. An expired order stays in
-- history; the buyer starts a new order from checkout.
--
-- Price is stored for display/history only: it is ALWAYS computed
-- server-side from app/utils/pricing.ts at order creation, never
-- taken from the client. `duration_months` is recorded but grant
-- expiry is not enforced yet (backlog — see README).
--
-- The merchant QRIS image lives in the `settings` table
-- (key `qris_image`, base64 data URL, set by an admin on the
-- Finance page). There is no payment gateway: QRIS here is a static
-- merchant QR the buyer scans, plus a manual proof upload.
--
-- Applied with: npx wrangler d1 migrations apply gts-db [--local]

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_sub TEXT NOT NULL,
  package TEXT NOT NULL CHECK (package IN ('bulanan', 'triwulanan', 'semesteran')),
  materials TEXT NOT NULL,
  price INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IDR',
  duration_months INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'proof_uploaded', 'active', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  activated_at TEXT,
  proof_image TEXT,
  proof_uploaded_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (user_sub);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
