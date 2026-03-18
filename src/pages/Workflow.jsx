import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, Play, Loader2, FileText, Pencil, Check, X, ExternalLink, RotateCcw
} from 'lucide-react';
import LayerIndicator from '@/components/workflow/LayerIndicator';
import CheckpointStep from '@/components/workflow/CheckpointStep';
import { demoApiClient } from '@/lib/demoApiClient';
import { toast } from '@/components/ui/use-toast';
import ReactMarkdown from 'react-markdown';

function GeneratedReport({ projectId, refreshAll, project, steps }) {
  const navigate = useNavigate();
  const { data: reports = [] } = useQuery({
    queryKey: ['generated-report', projectId],
    queryFn: () => demoApiClient.entities.StrategyReport.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  // Only show the final-report output
  const finalReport = (reports || []).find(r => r.generated === true);
  if (!finalReport) return <div className="p-4 text-sm text-gray-500">No generated final report yet.</div>;

  const handleSave = async () => {
    if (!finalReport) return;
    if (finalReport.id && demoApiClient.entities?.StrategyReport?.update) {
      await demoApiClient.entities.StrategyReport.update(finalReport.id, { saved: true, generated: false, created_date: new Date().toISOString() });
    }
    // mark project completed
    if (demoApiClient.entities?.StrategyProject?.update) {
      await demoApiClient.entities.StrategyProject.update(projectId, { status: 'completed', completed_at: new Date().toISOString() });
    }
    refreshAll?.();
    toast({ description: 'Report saved — opening Reports' });
    navigate(`/Report?projectId=${encodeURIComponent(projectId)}&from=reports`);
  };

  const handleView = () => {
    navigate(`/Report?projectId=${encodeURIComponent(projectId)}&from=reports`);
  };

  const isSaved = !!finalReport.saved;

  return (
    <div className="p-4 border rounded-lg bg-white">
      <h3 className="font-semibold mb-2">{finalReport.title || 'Final Report'}</h3>
      <div className="prose max-w-none text-sm mb-4">
        <ReactMarkdown>{finalReport.report || ''}</ReactMarkdown>
      </div>
      <div className="flex items-center gap-2">
        {!isSaved && (
          <Button onClick={handleSave} className="bg-[#1B2A4A] text-white">Save to Reports</Button>
        )}
        {isSaved && (
          <Button onClick={handleView} className="bg-[#1B2A4A] text-white">View Report in Reports Page</Button>
        )}
      </div>
    </div>
  );
}

const CHECKPOINT_NAMES = {
  1: 'Analysis Sanity Check I',
  2: 'Analysis Sanity Check II',
  3: 'Questionnaire',
  4: 'Final Strategic Decision',
};

const STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'running', label: 'In Progress' },
  { value: 'awaiting_review', label: 'Awaiting Review' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

export default function Workflow() {
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get('projectId');
  const queryClient = useQueryClient();
  const [triggering, setTriggering] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState(false);
  const [webhookInput, setWebhookInput] = useState('');
  const [editingStatus, setEditingStatus] = useState(false);
  const [statusInput, setStatusInput] = useState('');
  const [editingContext, setEditingContext] = useState(false);
  const [contextInput, setContextInput] = useState('');
  

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const list = await demoApiClient.entities.StrategyProject.filter({ id: projectId });
      return list[0];
    },
    enabled: !!projectId,
  });

  const { data: steps = [] } = useQuery({
    queryKey: ['steps', projectId],
    queryFn: () => demoApiClient.entities.WorkflowStep.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    queryClient.invalidateQueries({ queryKey: ['steps', projectId] });
  };

  const sendWebhookResponse = async (step, action, feedback) => {
    const target = step.callback_url || project.n8n_webhook_url;
    if (!target) return;
    try {
      await fetch(target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkpoint: step.step_number,
          action,
          feedback,
          project_context: project.company_context,
          step_title: step.title,
          project_id: step.project_id,
        }),
      });
    } catch (e) {
      // non-blocking
    }
  };

  const handleApproveStep = async (step) => {
    try {
      await demoApiClient.entities.WorkflowStep.update(step.id, { status: 'approved' });
    } catch (e) {}
    await sendWebhookResponse(step, 'approved', step.human_feedback || '');
    toast({ description: step.step_number === 3 ? 'Final approved — generating report...' : 'Approved — passing to next step' });
    refreshAll();
  };

  const handleRejectStep = async (step) => {
    try {
      await demoApiClient.entities.WorkflowStep.update(step.id, { status: 'revision_requested', ai_output: null });
    } catch (e) {}
    await sendWebhookResponse(step, 'rejected', step.human_feedback || '');
    toast({ description: 'Sent back for revision' });
    refreshAll();
  };

  const handleTrigger = async () => {
    if (!project) return;
    setTriggering(true);

    if (project.n8n_webhook_url) {
      try {
        // extract host (protocol + host) to send as n8n_host in body
        let n8n_host = '';
        try {
          const u = new URL(project.n8n_webhook_url);
          n8n_host = `${u.protocol}//${u.host}`;
        } catch (e) {
          n8n_host = project.n8n_webhook_url;
        }

        await fetch(project.n8n_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: project.id,
            title: project.title,
            project_context: project.company_context,
            industry_focus: project.industry_focus,
            trigger: 'launch_analysis',
            n8n_host,
          }),
        });
        toast({ description: 'Analysis triggered in N8N' });
      } catch (e) {
        toast({ description: 'Failed to reach N8N webhook — check the URL' });
      }
    } else {
      toast({ description: 'No webhook URL set — status updated locally only' });
    }

    // Persist status change to running
    if (demoApiClient.entities?.StrategyProject?.update) {
      await demoApiClient.entities.StrategyProject.update(project.id, {
        status: 'running',
        started_at: new Date().toISOString(),
      });
    }
    refreshAll();
    setTriggering(false);
  };

  const handleSaveWebhook = async () => {
    if (demoApiClient.entities?.StrategyProject?.update) {
      await demoApiClient.entities.StrategyProject.update(project.id, { n8n_webhook_url: webhookInput });
    }
    refreshAll();
    setEditingWebhook(false);
    toast({ description: 'Webhook URL updated' });
  };

  const handleSaveContext = async () => {
    if (demoApiClient.entities?.StrategyProject?.update) {
      await demoApiClient.entities.StrategyProject.update(project.id, { company_context: contextInput });
    }
    refreshAll();
    setEditingContext(false);
    toast({ description: 'Project context updated' });
  };

  const handleStatusChange = async (newStatus) => {
    // keep local input when changing selection
    setStatusInput(newStatus);
  };

  const handleSaveStatus = async () => {
    if (!project) return;
    if (demoApiClient.entities?.StrategyProject?.update) {
      await demoApiClient.entities.StrategyProject.update(project.id, { status: statusInput });
    }
    refreshAll();
    setEditingStatus(false);
    toast({ description: 'Status updated' });
  };

  

  if (!project) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
      </div>
    );
  }


  // Filter and control step visibility logic
  // Only show step 3 (questionnaire) if step 2 is approved
  const step1 = steps.find(s => s.step_number === 1);
  const step2 = steps.find(s => s.step_number === 2);
  const step3 = steps.find(s => s.step_number === 3);
  const step4 = steps.find(s => s.step_number === 4);

  // Show step 3 only if step 2 is approved
  const showStep3 = step2 && step2.status === 'approved';

  // Build checkpoint slots for 1, 2, (3 if allowed), and 4
  const checkpointSlots = [
    step1 || { id: 'placeholder-1', step_number: 1, layer: 1, status: 'pending', title: CHECKPOINT_NAMES[1], description: '', placeholder: true },
    step2 || { id: 'placeholder-2', step_number: 2, layer: 2, status: 'pending', title: CHECKPOINT_NAMES[2], description: '', placeholder: true },
    step3 || { id: 'placeholder-3', step_number: 3, layer: 3, status: 'pending', title: CHECKPOINT_NAMES[3], description: '', placeholder: true },
    step4 || { id: 'placeholder-4', step_number: 4, layer: 4, status: 'pending', title: CHECKPOINT_NAMES[4], description: '', placeholder: true },
  ];

  const isDraft = project.status === 'draft';
  const hasReport = project.status === 'completed';

  return (
    <div className="max-w-[900px] mx-auto px-6 py-10">
      {/* Back link */}
      <Link to="/Dashboard" className="inline-flex items-center gap-1.5 text-sm font-sans text-gray-400 hover:text-gray-600 transition-colors mb-8">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {/* Project Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-serif text-3xl font-bold mb-1">{project.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {project.industry_focus && (
                <span className="inline-block px-3 py-1 rounded-full text-xs font-sans font-medium" style={{ background: '#E8ECF2', color: '#1B2A4A' }}>
                  {project.industry_focus}
                </span>
              )}
              {/* Editable Status */}
              {editingStatus ? (
                <div className="flex items-center gap-2">
                  <Select value={statusInput || project.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="h-7 text-xs font-sans w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    <Button size="sm" onClick={handleSaveStatus} className="font-sans text-xs bg-[#1B2A4A] text-white">
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingStatus(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setStatusInput(project.status); setEditingStatus(true); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans font-medium border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 transition-colors"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    project.status === 'completed' ? 'bg-green-500' :
                    project.status === 'running' ? 'bg-blue-500' :
                    project.status === 'awaiting_review' ? 'bg-amber-500' :
                    project.status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                  }`} />
                  {STATUSES.find(s => s.value === project.status)?.label || project.status}
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {hasReport && (
              <Link to={`/Report?projectId=${project.id}`}>
                <Button variant="outline" className="font-sans text-sm gap-2">
                  <FileText className="w-4 h-4" /> View Report
                </Button>
              </Link>
            )}
            {isDraft && (
              <Button
                onClick={handleTrigger}
                disabled={triggering}
                className="font-sans text-sm text-white gap-2"
                style={{ background: '#1B2A4A' }}
              >
                {triggering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Launch Analysis
              </Button>
            )}
          </div>
        </div>

        {/* Project Context */}
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-1">
            <label className="text-xs font-sans font-semibold text-gray-500 uppercase tracking-wider">Project Context</label>
            {!editingContext && (
              <button
                onClick={() => { setContextInput(project.company_context || ''); setEditingContext(true); }}
                className="text-xs font-sans text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                <Pencil className="w-3 h-3" /> Edit
              </button>
            )}
          </div>
          <p className="text-xs font-sans text-gray-400 mb-2">Description of the strategy and instructions for the AI and n8n...</p>
          {editingContext ? (
            <div className="flex flex-col gap-2">
              <Textarea
                value={contextInput}
                onChange={(e) => setContextInput(e.target.value)}
                placeholder="Description of the strategy and instructions for the AI and n8n..."
                className="font-sans text-sm min-h-[100px]"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveContext} className="font-sans text-white text-sm" style={{ background: '#1B2A4A' }}>
                  <Check className="w-4 h-4 mr-1" /> Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingContext(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 font-serif leading-relaxed max-w-2xl">
              {project.company_context || <span className="text-gray-300 italic font-sans text-sm">No context set — click Edit to add</span>}
            </p>
          )}
        </div>

        {/* Webhook URL editor */}
        <div className="mt-5 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-sans font-semibold text-gray-500 uppercase tracking-wider">
              N8N Launch Webhook URL
            </label>
            {!editingWebhook && (
              <button
                onClick={() => { setWebhookInput(project.n8n_webhook_url || ''); setEditingWebhook(true); }}
                className="text-xs font-sans text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                <Pencil className="w-3 h-3" /> Edit
              </button>
            )}
          </div>
          {editingWebhook ? (
            <div className="flex gap-2 mt-2">
              <Input
                value={webhookInput}
                onChange={(e) => setWebhookInput(e.target.value)}
                placeholder="https://your-n8n.com/webhook/..."
                className="font-sans text-sm flex-1"
              />
              <Button size="sm" onClick={handleSaveWebhook} className="font-sans text-white text-sm" style={{ background: '#1B2A4A' }}>
                <Check className="w-4 h-4 mr-1" /> Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingWebhook(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <p className="text-sm font-sans text-gray-600 mt-1 truncate">
              {project.n8n_webhook_url ? (
                <span className="flex items-center gap-1">
                  <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  {project.n8n_webhook_url}
                </span>
              ) : (
                <span className="text-gray-400 italic">Not configured — click Edit to add a webhook URL</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Layer Progress */}
      <div className="mb-12 py-6 px-4 bg-gray-50 rounded-xl">
        <LayerIndicator currentLayer={project.current_layer || 1} status={project.status} />
      </div>

      {/* Human Validation Checkpoints */}
      <div>
        <h2 className="font-serif text-2xl font-bold mb-2">Human Validation Checkpoints</h2>
        <p className="text-sm font-sans text-gray-500 mb-6">
          Each checkpoint validates a layer of AI analysis. Approving sends progress to the next step; 
          rejecting sends the output back to N8N for revision.
        </p>

        <div className="space-y-4">
          {checkpointSlots.map((step) => (
            step.placeholder ? (
              <div key={step.id} className="border border-dashed border-gray-200 rounded-xl p-6 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center font-sans text-xs font-semibold text-gray-400">
                  {step.step_number}
                </div>
                <div>
                  <p className="font-serif text-base font-semibold text-gray-400">{CHECKPOINT_NAMES[step.step_number]}</p>
                  <p className="text-xs font-sans text-gray-300 mt-0.5">
                    {isDraft ? 'Launch analysis to start this checkpoint' : 'Waiting for N8N to populate this step...'}
                  </p>
                </div>
              </div>
            ) : (
              <div key={step.id}>
                <CheckpointStep
                  step={step}
                  onUpdate={refreshAll}
                  webhookUrl={project.n8n_webhook_url}
                  projectContext={project.company_context}
                    projectTitle={project.title}
                />

                {/* Quick actions removed: use in-place controls inside each checkpoint */}
              </div>
            )
          ))}
        </div>
      </div>

      {/* Generated Final Report (if any) */}
      <div className="mt-10">
        <h2 className="font-serif text-2xl font-bold mb-2">Generated Final Report</h2>
        <p className="text-sm font-sans text-gray-500 mb-4">If AI has produced a final report, review it here and save to Reports.</p>

        <GeneratedReport projectId={project.id} refreshAll={refreshAll} project={project} steps={steps} />
      </div>

      
    </div>
  );
}