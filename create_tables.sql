-- SQL to create strategy_project table
CREATE TABLE IF NOT EXISTS strategy_project (
  id VARCHAR(32) PRIMARY KEY,
  title VARCHAR(255),
  company_context TEXT,
  industry_focus VARCHAR(255),
  n8n_webhook_url TEXT,
  status VARCHAR(32),
  current_layer INTEGER,
  current_step INTEGER,
  created_date TIMESTAMP,
  updated_date TIMESTAMP
);

CREATE TABLE IF NOT EXISTS strategy_report (
  id VARCHAR(32) PRIMARY KEY,
  project_id VARCHAR(32),
  overall_score INTEGER,
  generated BOOLEAN DEFAULT FALSE,
  saved BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMP,
  updated_date TIMESTAMP,
  -- Add additional section fields as needed
  FOREIGN KEY (project_id) REFERENCES strategy_project(id)
);

-- SQL to create workflow_step table
CREATE TABLE IF NOT EXISTS workflow_step (
  id VARCHAR(32) PRIMARY KEY,
  project_id VARCHAR(32),
  layer INTEGER,
  step INTEGER,
  name VARCHAR(255),
  created_date TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES strategy_project(id)
);
