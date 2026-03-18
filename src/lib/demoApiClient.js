// Demo API client that prefers calling a local API server for persistent updates.
// ...existing code...

// const API_BASE = typeof window !== 'undefined' && window?.__DEMO_API_URL ? window.__DEMO_API_URL : (import.meta.env.VITE_API_URL || 'http://localhost:4000/api');
const API_BASE = 'https://toy-vision-engine-be.onrender.com/api';

async function safeFetch(path, options) {
  try {
    const res = await fetch(`${API_BASE}${path}`, options);
    if (!res.ok) throw new Error('api error');
    return res.json();
  } catch (err) {
    return null;
  }
}

export const demoApiClient = {
  entities: {
    StrategyProject: {
      list: async () => {
        return await safeFetch('/projects');
      },
      filter: async ({ id }) => {
        return await safeFetch(`/projects?id=${encodeURIComponent(id)}`);
      },
      create: async (data) => {
        const payload = { ...data };
        return await safeFetch('/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      },
      delete: async (id) => {
        const r = await safeFetch(`/projects/${encodeURIComponent(id)}`, { method: 'DELETE' });
        return r?.success ?? true;
      },
      update: async (id, patch) => {
        return await safeFetch(`/projects/${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
      },
    },
    StrategyReport: {
      list: async () => {
        const r = await safeFetch('/reports');
        if (r) return r;
        return [...FALLBACK.reports];
      },
      filter: async ({ project_id }) => {
        const r = await safeFetch(`/reports?project_id=${encodeURIComponent(project_id)}`);
        if (r) return r;
        return FALLBACK.reports.filter(rp => rp.project_id === project_id);
      },
      create: async (data) => {
        const r = await safeFetch('/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (r) return r;
        const newReport = { ...data, id: generateId(), created_date: new Date().toISOString() };
        FALLBACK.reports.push(newReport);
        return newReport;
      },
      delete: async (id) => {
        const r = await safeFetch(`/reports/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (r !== null) return r.success ?? true;
        const idx = FALLBACK.reports.findIndex(rp => rp.id === id);
        if (idx !== -1) FALLBACK.reports.splice(idx, 1);
        return true;
      },
      update: async (id, patch) => {
        const r = await safeFetch(`/reports/${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
        if (r) return r;
        const idx = FALLBACK.reports.findIndex(rp => rp.id === id);
        if (idx !== -1) {
          FALLBACK.reports[idx] = { ...FALLBACK.reports[idx], ...patch };
          return FALLBACK.reports[idx];
        }
        return null;
      },
      // generate: create or update a temporary generated final report
      generate: async (data) => {
        const r = await safeFetch('/final-report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (r) return r;
        // fallback: update or push into FALLBACK.reports
        let report = FALLBACK.reports.find(rr => rr.project_id === data.project_id && rr.generated === true && !rr.saved);
        if (report) {
          report = { ...report, ...data, updated_date: new Date().toISOString() };
          const idx = FALLBACK.reports.findIndex(rr => rr.id === report.id);
          FALLBACK.reports[idx] = report;
          return report;
        }
        const newReport = { ...data, id: generateId(), generated: true, saved: false, created_date: new Date().toISOString() };
        FALLBACK.reports.push(newReport);
        return newReport;
      },
    },
    WorkflowStep: {
      list: async () => {
        const r = await safeFetch('/steps');
        if (r) return r;
        return [...FALLBACK.steps];
      },
      filter: async ({ project_id }) => {
        const r = await safeFetch(`/steps?project_id=${encodeURIComponent(project_id)}`);
        if (r) return r;
        return FALLBACK.steps.filter(s => s.project_id === project_id);
      },
      create: async (data) => {
        const r = await safeFetch('/steps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (r) return r;
        const newStep = { ...data, id: generateId(), created_date: new Date().toISOString() };
        FALLBACK.steps.push(newStep);
        return newStep;
      },
      delete: async (id) => {
        const r = await safeFetch(`/steps/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (r !== null) return r.success ?? true;
        const idx = FALLBACK.steps.findIndex(s => s.id === id);
        if (idx !== -1) FALLBACK.steps.splice(idx, 1);
        return true;
      },
      update: async (id, patch) => {
        const r = await safeFetch(`/steps/${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
        if (r) return r;
        const idx = FALLBACK.steps.findIndex(s => s.id === id);
        if (idx !== -1) {
          FALLBACK.steps[idx] = { ...FALLBACK.steps[idx], ...patch };
          return FALLBACK.steps[idx];
        }
        return null;
      },
    },
  },
};
