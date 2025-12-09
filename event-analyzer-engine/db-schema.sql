CREATE TABLE raw_events (
  id SERIAL PRIMARY KEY,
  sender TEXT, 
  receiver TEXT, 
  amount TEXT, 
  message TEXT,
  timestamp BIGINT, 
  block_number BIGINT, 
  gas_price TEXT,
  nonce TEXT, 
  origin TEXT, 
  chain_id BIGINT,
  value TEXT, 
  tx_hash TEXT UNIQUE, 
  contract TEXT
);

CREATE TABLE event_analysis (
  id SERIAL PRIMARY KEY,
  tx_hash TEXT UNIQUE,
  severity TEXT, 
  reason TEXT,
  indicators JSONB, 
  recommended_action TEXT,
  sender TEXT, 
  receiver TEXT, 
  timestamp BIGINT,
  created_at TIMESTAMP DEFAULT NOW()
);
