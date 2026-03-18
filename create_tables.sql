-- SQL to create strategy_project table
CREATE TABLE IF NOT EXISTS strategy_project (
  title VARCHAR(255),
  company_context TEXT,
  industry_focus VARCHAR(255),
  n8n_webhook_url TEXT,
  status VARCHAR(32),
  current_layer INTEGER,
  current_step INTEGER,
  id VARCHAR(32) PRIMARY KEY,
  created_date TIMESTAMP,
  updated_date TIMESTAMP,
  started_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS strategy_report (
  report TEXT,
  project_id VARCHAR(32),
  id VARCHAR(32) PRIMARY KEY,
  generated BOOLEAN DEFAULT FALSE,
  saved BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES strategy_project(id)
);

CREATE TABLE IF NOT EXISTS workflow_step (
  id VARCHAR(32) PRIMARY KEY,
  project_id VARCHAR(32),
  step_number INTEGER,
  layer INTEGER,
  title VARCHAR(255),
  ai_output TEXT,
  requires_validation BOOLEAN DEFAULT FALSE,
  status VARCHAR(32),
  callback_url TEXT,
  created_date TIMESTAMP,
  answers JSONB,
  FOREIGN KEY (project_id) REFERENCES strategy_project(id)
);
