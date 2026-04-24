CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        VARCHAR(255) UNIQUE NOT NULL,
  name         VARCHAR(100) NOT NULL,
  password     VARCHAR(255) NOT NULL,
  role         VARCHAR(20)  DEFAULT 'user',
  usd_balance  NUMERIC(20,2) DEFAULT 10000.00,
  otp_code     VARCHAR(6),
  otp_expires  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coins (
  id       SERIAL PRIMARY KEY,
  symbol   VARCHAR(20) UNIQUE NOT NULL,
  name     VARCHAR(100) NOT NULL,
  rank     INT,
  logo_url TEXT
);

CREATE TABLE IF NOT EXISTS holdings (
  user_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  symbol   VARCHAR(20) NOT NULL,
  quantity NUMERIC(20,8) DEFAULT 0,
  PRIMARY KEY (user_id, symbol)
);

CREATE TABLE IF NOT EXISTS transactions (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID REFERENCES users(id),
  symbol     VARCHAR(20),
  type       VARCHAR(4),
  price      NUMERIC(20,8),
  quantity   NUMERIC(20,8),
  fee        NUMERIC(20,8),
  total      NUMERIC(20,8),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pending_orders (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(id),
  symbol      VARCHAR(20),
  type        VARCHAR(4),
  quantity    NUMERIC(20,8),
  limit_price NUMERIC(20,8),
  status      VARCHAR(10) DEFAULT 'pending',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS watchlist (
  id         SERIAL PRIMARY KEY,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  symbol     VARCHAR(20) NOT NULL,
  buy_alert  NUMERIC(20,8) DEFAULT 0,
  sell_alert NUMERIC(20,8) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, symbol)
);

CREATE TABLE IF NOT EXISTS price_history (
  id          BIGSERIAL PRIMARY KEY,
  symbol      VARCHAR(20) NOT NULL,
  price       NUMERIC(20,8) NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alert_log (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID REFERENCES users(id),
  symbol     VARCHAR(20),
  alert_type VARCHAR(10),
  price      NUMERIC(20,8),
  sent_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email);
CREATE INDEX IF NOT EXISTS idx_tx_user_time       ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pending_symbol     ON pending_orders(symbol, status);
CREATE INDEX IF NOT EXISTS idx_price_symbol_time  ON price_history(symbol, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_user_time    ON alert_log(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_watchlist_user     ON watchlist(user_id);
