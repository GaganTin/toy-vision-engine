const fetch = require('node-fetch');
const assert = require('assert');

const API_URL = 'http://localhost:4000/api';

async function updateStepStatus(stepId, status) {
  const res = await fetch(`${API_URL}/steps/${stepId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return res.json();
}

async function getStep(stepId) {
  const res = await fetch(`${API_URL}/steps?project_id=${stepId}`);
  return res.json();
}

async function testWorkflowStepStatus() {
  // Replace with a real stepId from your DB
  const stepId = 'test-step-id';
  const status = 'approved';

  const updated = await updateStepStatus(stepId, status);
  assert.strictEqual(updated.status, status, 'Status should be updated to approved');

  console.log('Test passed: workflow_step status updated to approved');
}

if (require.main === module) {
  testWorkflowStepStatus().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  });
}
