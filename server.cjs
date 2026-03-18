const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.huuajgklkruikqgvmshj:ringogobi1902@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false },
});

function generateId() {
  return uuidv4();
}
const express = require('express');
const cors = require('cors');


const app = express();
app.use(cors());
app.use(express.json());


function generateId() {
  return Math.random().toString(36).substr(2, 24);
}

// Projects
app.get('/api/projects', async (req, res) => {
  try {
    const { id } = req.query;
    let result;
    if (id) {
      result = await pool.query('SELECT * FROM strategy_project WHERE id = $1', [id]);
      return res.json(result.rows);
    }
    result = await pool.query('SELECT * FROM strategy_project');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch projects', details: e.message });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload || Object.keys(payload).length === 0) {
      return res.status(400).json({ error: 'Empty project payload' });
    }
    const newProjectId = generateId();
    const now = new Date();
    const projectFields = [
      newProjectId,
      payload.title,
      payload.company_context,
      payload.industry_focus,
      payload.n8n_webhook_url,
      payload.status || 'draft',
      1,
      1,
      now,
      now
    ];
    await pool.query(
      `INSERT INTO strategy_project (id, title, company_context, industry_focus, n8n_webhook_url, status, current_layer, current_step, created_date, updated_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      projectFields
    );
    const newStepId = generateId();
    await pool.query(
      `INSERT INTO workflow_step (id, project_id, layer, step, name, created_date)
      VALUES ($1,$2,$3,$4,$5,$6)`,
      [newStepId, newProjectId, 1, 1, 'Initial Step', now]
    );
    res.json({ project: { id: newProjectId, ...payload, created_date: now, updated_date: now }, initial_step: { id: newStepId, project_id: newProjectId, layer: 1, step: 1, name: 'Initial Step', created_date: now } });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create project', details: e.message });
  }
});

// Endpoint for n8n to post pending approvals for specific slots (1,2,3)
async function handlePendingApproval(req, res, slot) {
  const payload = req.body || {};
  const projectId = payload.project_id || payload.projectId || payload.id;
  const stepNumber = payload.step_number || payload.stepNumber || slot;
  const ai_output = payload.ai_output || payload.message || payload.report || '';
  const title = payload.title || `Checkpoint ${stepNumber}`;
  const confidence_score = payload.confidence_score || payload.confidence || undefined;
  const callback_url = payload.callback_url || payload.callbackUrl || payload.webhook || null;
  const now = new Date();

  // Check if step exists
  const existingStep = await pool.query('SELECT * FROM workflow_step WHERE project_id = $1 AND step_number = $2', [projectId, stepNumber]);
  let stepId;
  if (existingStep.rows.length) {
    stepId = existingStep.rows[0].id;
    await pool.query(
      `UPDATE workflow_step SET ai_output=$1, title=$2, status=$3, requires_validation=$4, callback_url=$5, layer=$6, created_date=$7 WHERE id=$8`,
      [
        ai_output,
        title,
        'awaiting_validation',
        true,
        callback_url,
        slot,
        now,
        stepId
      ]
    );
  } else {
    stepId = generateId();
    await pool.query(
      `INSERT INTO workflow_step (id, project_id, step_number, layer, title, ai_output, requires_validation, status, callback_url, created_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        stepId,
        projectId,
        stepNumber,
        slot,
        title,
        ai_output,
        true,
        'awaiting_validation',
        callback_url,
        now
      ]
    );
  }

  // Update project current_layer and status
  try {
    const pidx = projects.findIndex(p => p.id === projectId);
    if (pidx !== -1) {
      projects[pidx].current_layer = slot;
      projects[pidx].status = projects[pidx].status === 'draft' ? 'running' : projects[pidx].status;
      projects[pidx].updated_date = new Date().toISOString();
      await writeJson(PROJECTS_FILE, projects);
    }
  } catch (e) {}

  res.json({ success: true, message: ai_output, step });
}


app.post('/api/pending-approvals-1', async (req, res) => handlePendingApproval(req, res, 1));
app.post('/api/pending-approvals-2', async (req, res) => handlePendingApproval(req, res, 2));
app.post('/api/pending-approvals-3', async (req, res) => handlePendingApproval(req, res, 3));
app.post('/api/pending-approvals-4', async (req, res) => handlePendingApproval(req, res, 4));

app.put('/api/projects/:id', async (req, res) => {
  const id = req.params.id;
  const payload = req.body || {};
  const now = new Date();
  try {
    // Fetch current project
    const current = await pool.query('SELECT * FROM strategy_project WHERE id = $1', [id]);
    if (!current.rows.length) return res.status(404).json({ error: 'not found' });
    const existing = current.rows[0];
    // Merge fields
    const updated = {
      title: payload.title !== undefined ? payload.title : existing.title,
      company_context: payload.company_context !== undefined ? payload.company_context : existing.company_context,
      industry_focus: payload.industry_focus !== undefined ? payload.industry_focus : existing.industry_focus,
      n8n_webhook_url: payload.n8n_webhook_url !== undefined ? payload.n8n_webhook_url : existing.n8n_webhook_url,
      status: payload.status !== undefined ? payload.status : existing.status,
      current_layer: payload.current_layer !== undefined ? payload.current_layer : existing.current_layer,
      current_step: payload.current_step !== undefined ? payload.current_step : existing.current_step,
      updated_date: now
    };
    const result = await pool.query('UPDATE strategy_project SET title=$1, company_context=$2, industry_focus=$3, n8n_webhook_url=$4, status=$5, current_layer=$6, current_step=$7, updated_date=$8 WHERE id=$9 RETURNING *', [
      updated.title,
      updated.company_context,
      updated.industry_focus,
      updated.n8n_webhook_url,
      updated.status,
      updated.current_layer,
      updated.current_step,
      updated.updated_date,
      id
    ]);
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update project', details: e.message });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query('DELETE FROM workflow_step WHERE project_id = $1', [id]);
    await pool.query('DELETE FROM strategy_report WHERE project_id = $1', [id]);
    await pool.query('DELETE FROM strategy_project WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete project', details: e.message });
  }
});

// Reports
app.get('/api/reports', async (req, res) => {
  try {
    const { project_id } = req.query;
    let result;
    if (project_id) {
      result = await pool.query('SELECT * FROM strategy_report WHERE project_id = $1', [project_id]);
      return res.json(result.rows);
    }
    result = await pool.query('SELECT * FROM strategy_report');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch reports', details: e.message });
  }
});

app.post('/api/reports', async (req, res) => {
  try {
    const payload = req.body || {};
    const newReportId = generateId();
    const now = new Date();
    await pool.query(
      `INSERT INTO strategy_report (id, project_id, overall_score, generated, saved, created_date, updated_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        newReportId,
        payload.project_id,
        payload.overall_score,
        payload.generated || false,
        payload.saved || false,
        now,
        now
      ]
    );
    res.json({ id: newReportId, ...payload, created_date: now, updated_date: now });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create report', details: e.message });
  }
});

// Endpoint for generated final report (produced by AI after the 3 checkpoints)
app.post('/api/final-report', async (req, res) => {
  const payload = req.body || {};
  const projectId = payload.project_id || payload.projectId;
  if (!projectId) return res.status(400).json({ error: 'project_id required' });

  const reports = await readJson(REPORTS_FILE);
  // find existing generated (unsaved) report for this project
  let report = reports.find(r => r.project_id === projectId && r.generated === true && !r.saved);
  if (report) {
    report = { ...report, ...payload, updated_date: new Date().toISOString() };
    // replace in array
    const idx = reports.findIndex(r => r.id === report.id);
    reports[idx] = report;
  } else {
    report = { ...payload, id: generateId(), generated: true, saved: false, created_date: new Date().toISOString() };
    reports.push(report);
  }
  await writeJson(REPORTS_FILE, reports);
  res.json(report);
});

app.put('/api/reports/:id', async (req, res) => {
  const id = req.params.id;
  const payload = req.body || {};
  const now = new Date();
  try {
    const result = await pool.query('UPDATE strategy_report SET project_id=$1, overall_score=$2, generated=$3, saved=$4, updated_date=$5 WHERE id=$6 RETURNING *', [
      payload.project_id,
      payload.overall_score,
      payload.generated,
      payload.saved,
      now,
      id
    ]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'not found' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update report', details: e.message });
  }
});

app.delete('/api/reports/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query('DELETE FROM strategy_report WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete report', details: e.message });
  }
});

// Workflow Steps
app.get('/api/steps', async (req, res) => {
  try {
    const { project_id } = req.query;
    let result;
    if (project_id) {
      result = await pool.query('SELECT * FROM workflow_step WHERE project_id = $1', [project_id]);
      return res.json(result.rows);
    }
    result = await pool.query('SELECT * FROM workflow_step');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch steps', details: e.message });
  }
});

app.post('/api/steps', async (req, res) => {
  try {
    const payload = req.body || {};
    const newStepId = generateId();
    const now = new Date();
    await pool.query(
      `INSERT INTO workflow_step (id, project_id, layer, step, name, created_date)
      VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        newStepId,
        payload.project_id,
        payload.layer,
        payload.step,
        payload.name,
        now
      ]
    );
    res.json({ id: newStepId, ...payload, created_date: now });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create step', details: e.message });
  }
});

app.put('/api/steps/:id', async (req, res) => {
  const id = req.params.id;
  const payload = req.body || {};
  const now = new Date();
  try {
    const result = await pool.query('UPDATE workflow_step SET project_id=$1, layer=$2, step=$3, name=$4, updated_date=$5 WHERE id=$6 RETURNING *', [
      payload.project_id,
      payload.layer,
      payload.step,
      payload.name,
      now,
      id
    ]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'not found' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update step', details: e.message });
  }
});

app.delete('/api/steps/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query('DELETE FROM workflow_step WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete step', details: e.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Demo API server running on http://localhost:${PORT}`));
