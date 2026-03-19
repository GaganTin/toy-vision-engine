require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function generateId() {
  return uuidv4().replace(/-/g, '');
}
const express = require('express');
const cors = require('cors');


const app = express();
app.use(cors());
app.use(express.json());

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
    res.json({ project: { id: newProjectId, ...payload, created_date: now, updated_date: now } });
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

  // Update project current_layer and status in DB
  try {
    await pool.query(
      'UPDATE strategy_project SET current_layer = $1, status = CASE WHEN status = $2 THEN $3 ELSE status END, updated_date = $4 WHERE id = $5',
      [slot, 'draft', 'running', now, projectId]
    );
  } catch (e) {}

  // Return the saved step and ai_output
  const savedStep = await pool.query('SELECT * FROM workflow_step WHERE id = $1', [stepId]);
  res.json({ success: true, message: ai_output, step: savedStep.rows[0] });
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
      `INSERT INTO strategy_report (id, project_id, report, generated, saved, created_date)
      VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        newReportId,
        payload.project_id,
        payload.report || null,
        payload.generated || false,
        payload.saved || false,
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
  try {
    const payload = req.body || {};
    const projectId = payload.project_id || payload.projectId;
    if (!projectId) return res.status(400).json({ error: 'project_id required' });
    const newReportId = generateId();
    const now = new Date();
    await pool.query(
      `INSERT INTO strategy_report (id, project_id, report, generated, saved, created_date)
      VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        newReportId,
        projectId,
        payload.report || '',
        true,
        false,
        now
      ]
    );
    res.json({ id: newReportId, ...payload, generated: true, saved: false, created_date: now, updated_date: now });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create final report', details: e.message });
  }
});

app.put('/api/reports/:id', async (req, res) => {
  const id = req.params.id;
  const payload = req.body || {};
  const now = new Date();
  try {
    const current = await pool.query('SELECT * FROM strategy_report WHERE id = $1', [id]);
    if (!current.rows.length) return res.status(404).json({ error: 'not found' });
    const existing = current.rows[0];
    const updated = {
      project_id: payload.project_id !== undefined ? payload.project_id : existing.project_id,
      report: payload.report !== undefined ? payload.report : existing.report,
      generated: payload.generated !== undefined ? payload.generated : existing.generated,
      saved: payload.saved !== undefined ? payload.saved : existing.saved,
    };
    const result = await pool.query(
      'UPDATE strategy_report SET project_id=$1, report=$2, generated=$3, saved=$4 WHERE id=$5 RETURNING *',
      [updated.project_id, updated.report, updated.generated, updated.saved, id]
    );
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
      `INSERT INTO workflow_step (id, project_id, layer, step_number, title, created_date)
      VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        newStepId,
        payload.project_id,
        payload.layer,
        payload.step_number,
        payload.title,
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
    const current = await pool.query('SELECT * FROM workflow_step WHERE id = $1', [id]);
    if (!current.rows.length) return res.status(404).json({ error: 'not found' });
    const existing = current.rows[0];
    const updated = {
      project_id: payload.project_id !== undefined ? payload.project_id : existing.project_id,
      layer: payload.layer !== undefined ? payload.layer : existing.layer,
      step_number: payload.step_number !== undefined ? payload.step_number : existing.step_number,
      title: payload.title !== undefined ? payload.title : existing.title,
      status: payload.status !== undefined ? payload.status : existing.status,
      human_feedback: payload.human_feedback !== undefined ? payload.human_feedback : existing.human_feedback,
      ai_output: payload.ai_output !== undefined ? payload.ai_output : existing.ai_output,
      answers: payload.answers !== undefined ? JSON.stringify(payload.answers) : existing.answers,
    };
    const result = await pool.query(
      'UPDATE workflow_step SET status=$1, ai_output=$2, answers=$3, title=$4 WHERE id=$5 RETURNING *',
      [updated.status, updated.ai_output, updated.answers, updated.title, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'not found' });
    const step = result.rows[0];
    res.json({ ...step, status: step.status });
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
