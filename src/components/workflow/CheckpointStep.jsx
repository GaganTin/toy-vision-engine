import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Check, RotateCcw, ChevronDown, ChevronUp,
  Clock, Loader2, AlertCircle, Eye, CheckCircle2
} from 'lucide-react';
// import your new API client here
import ReactMarkdown from 'react-markdown';
import { demoApiClient } from '@/lib/demoApiClient';
import { toast } from '@/components/ui/use-toast';
import { jsPDF } from 'jspdf';

const STEP_NAMES = {
  1: 'Detailed Industry Context Document',
  2: 'Executive Strategy Memo',
  3: 'Questionnaire',
  4: 'Final Strategic Decision',
};

const STEP_DESCRIPTIONS = {
  1: 'Review and validate the initial market research and industry analysis.',
  2: 'Validate the strategic analysis layer.',
  3: 'Complete the questionnaire to provide additional insights.',
  4: 'Approve the final strategic recommendations to generate the report.',
};

const statusConfig = {
  pending:             { label: 'Pending',      color: 'bg-gray-100 text-gray-600',   icon: Clock },
  running:             { label: 'Running',      color: 'bg-blue-50 text-blue-700',    icon: Loader2 },
  awaiting_validation: { label: 'Needs Review', color: 'text-white',                  icon: Eye, navy: true },
  approved:            { label: 'Approved',     color: 'bg-green-50 text-green-700',  icon: CheckCircle2 },
  revision_requested:  { label: 'Sent Back',    color: 'bg-amber-50 text-amber-700',  icon: RotateCcw },
  failed:              { label: 'Failed',       color: 'bg-red-50 text-red-700',      icon: AlertCircle },
};

// Convert stored formatted answers back to simple checkbox/text state format
function extractAnswerState(storedAnswers) {
  if (!storedAnswers || typeof storedAnswers !== 'object') return {};
  const result = {};
  for (const [qid, val] of Object.entries(storedAnswers)) {
    if (val && typeof val === 'object') {
      if (Array.isArray(val.answers)) {
        result[qid] = val.answers.map(o => Object.keys(o)[0]);
      } else if ('answer' in val) {
        result[qid] = val.answer;
      } else {
        result[qid] = val;
      }
    } else {
      result[qid] = val;
    }
  }
  return result;
}

export default function CheckpointStep({ step, onUpdate, onFinalApproved, webhookUrl, projectContext, projectTitle, isLatestStep }) {
      // Consolidated questionnaire and state logic
      let is_form = false;
      let questionnaireForm = null;
      let messageString = '';
      try {
        if (step.message) {
          const msg = typeof step.message === 'string' ? step.message : JSON.stringify(step.message);
          const parsed = JSON.parse(msg);
          if (parsed.questionnaire_form) {
            questionnaireForm = parsed.questionnaire_form;
            is_form = true;
          } else {
            messageString = msg;
          }
        }
      } catch (e) {
        messageString = typeof step.message === 'string' ? step.message : JSON.stringify(step.message);
      }

      // Save ai_output
      const ai_output = step.message || step.ai_output || '';

      // Save answers — convert stored DB format back to simple checkbox/text state
      const [answers, setAnswers] = useState(step.answers ? extractAnswerState(step.answers) : {});
      const [isResponse, setIsResponse] = useState(!!step.answers);

      const handleQuestionChange = (qid, value) => {
        setAnswers(prev => ({ ...prev, [qid]: value }));
      };

      // ...existing code...
  const [expanded, setExpanded] = useState(step.status === 'awaiting_validation');
  const [feedback, setFeedback] = useState(step.human_feedback || '');
  const [saving, setSaving] = useState(false);

  const config = statusConfig[step.status] || statusConfig.pending;
  const StatusIcon = config.icon;
  const isWaiting = step.status === 'awaiting_validation';
  const isApproved = step.status === 'approved';
  const isFinalStep = step.step_number === 3;

  const sendWebhookResponse = async (action) => {
    const target = step.callback_url || webhookUrl;
    if (!target) return;
    try {
      await fetch(target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkpoint: step.step_number,
          action,
          feedback,
          project_context: projectContext,
          step_title: STEP_NAMES[step.step_number],
          project_id: step.project_id,
        }),
      });
    } catch (e) {
      // webhook failure is non-blocking
    }
  };

  const handleApprove = async () => {
    setSaving(true);
    if (demoApiClient.entities?.WorkflowStep?.update) {
      await demoApiClient.entities.WorkflowStep.update(step.id, {
        status: 'approved',
        human_feedback: feedback || undefined,
      });
    }
    await sendWebhookResponse('approved');
    if (isFinalStep) {
      // toast({ description: 'Final decision approved — generated final report available below.', duration: 1200, className: 'max-w-xs text-xs py-2 px-3 rounded-md shadow-sm' });
      // Generate a final report (unsaved) for review in the Workflow page
      try {
        const reportData = {
          project_id: step.project_id,
          title: `Final Report - ${projectTitle || step.title || 'Strategy'}`,
          report: step.ai_output || feedback || '',
          generated: true,
          saved: false,
        };
        if (demoApiClient.entities?.StrategyReport?.generate) {
          await demoApiClient.entities.StrategyReport.generate(reportData);
        } else if (demoApiClient.entities?.StrategyReport?.create) {
          // fallback: create with generated/saved flags
          await demoApiClient.entities.StrategyReport.create(reportData);
        }
        // Do NOT mark project completed here — user must Save the generated report to persist it in Reports
      } catch (e) {
        // non-blocking
      }
    } else {
      // Removed toast for 'Approved — passing to next step'
    }
    onUpdate?.();
    setSaving(false);
  };

  const handleReject = async () => {
    setSaving(true);
    if (demoApiClient.entities?.WorkflowStep?.update) {
      await demoApiClient.entities.WorkflowStep.update(step.id, {
        status: 'revision_requested',
        human_feedback: feedback || undefined,
        ai_output: null,
      });
    }
    await sendWebhookResponse('rejected');
    // toast({ description: 'Sent back for revision', duration: 1200, className: 'max-w-xs text-xs py-2 px-3 rounded-md shadow-sm' });
    onUpdate?.();
    setSaving(false);
  };

  const stepNum = step.step_number;
  const title = STEP_NAMES[stepNum] || step.title || `Checkpoint ${stepNum}`;
  const description = step.description || STEP_DESCRIPTIONS[stepNum] || '';

  return (
    <div
      className={`border rounded-xl transition-all duration-300 ${
        isWaiting ? 'border-2 shadow-sm' : isApproved ? 'border border-green-200 opacity-75' : 'border-gray-100'
      }`}
      style={isWaiting ? { borderColor: '#1B2A4A' } : {}}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-7 h-7 rounded-full font-sans text-xs font-semibold"
            style={
              step.status === 'approved'
                ? { background: '#DCFCE7', color: '#16A34A' }
                : step.status === 'revision_requested'
                ? { background: '#FEF3C7', color: '#D97706' }
                : { background: '#F9FAFB', color: '#6B7280' }
            }
          >
            {stepNum}
          </div>
          <div>
            <h4 className="font-serif text-base font-semibold">{title}</h4>
            <p className="text-sm text-gray-500 font-sans mt-0.5">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {step.confidence_score != null && (
            <span className="font-sans text-xs font-medium text-gray-400">
              {step.confidence_score}%
            </span>
          )}
          <Badge
            className={`font-sans text-xs ${config.color}`}
            style={config.navy ? { background: '#1B2A4A' } : {}}
          >
            <StatusIcon className={`w-3 h-3 mr-1 ${step.status === 'running' ? 'animate-spin' : ''}`} />
            {config.label}
          </Badge>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {/* Expanded */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-50 pt-4">
          {/* Step 3: Render questionnaire if present in ai_output */}
          {step.step_number === 3 && step.ai_output && typeof step.ai_output === 'string' && step.ai_output.includes('questionnaire_form') ? (
            (() => {
              let parsed = null;
              try {
                parsed = JSON.parse(step.ai_output);
              } catch {}
              const questionnaire = parsed?.questionnaire_form || {};
              const qids = Object.keys(questionnaire);
              // Require all except last question to be answered
              const allAnswered = qids.length <= 1 || qids.slice(0, -1).every(qid => (answers[qid] || []).length > 0 || (typeof answers[qid] === 'string' && answers[qid].trim() !== ''));
              return (
                <form className="space-y-6 mb-6">
                  {qids.map((qid, idx) => {
                    const qdata = questionnaire[qid];
                    const isLast = idx === qids.length - 1;
                    return (
                      <div key={qid} className="space-y-2">
                        <label className="block font-sans text-base font-semibold mb-1">Q{idx + 1}. {qdata.question}</label>
                        {isLast ? (
                          <textarea
                            className="w-full border rounded p-2 font-sans text-sm"
                            placeholder="(Optional) Write your answer here..."
                            value={answers[qid] || ''}
                            onChange={e => {
                              if (isResponse) return;
                              handleQuestionChange(qid, e.target.value);
                            }}
                            disabled={isResponse}
                          />
                        ) : (
                          qdata.options && qdata.options.length > 0 && (
                            <div className="space-y-1 ml-4">
                              {qdata.options.map((opt, oidx) => {
                                const optKey = Object.keys(opt)[0];
                                const optVal = opt[optKey];
                                return (
                                  <div key={optKey} className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      name={qid}
                                      value={optKey}
                                      checked={(answers[qid] || []).includes(optKey)}
                                      onChange={e => {
                                        if (isResponse) return;
                                        const arr = answers[qid] || [];
                                        if (e.target.checked) {
                                          handleQuestionChange(qid, [...arr, optKey]);
                                        } else {
                                          handleQuestionChange(qid, arr.filter(v => v !== optKey));
                                        }
                                      }}
                                      disabled={isResponse}
                                    />
                                    <span className="font-sans text-sm">{optVal}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}
                  <Button
                    type="button"
                    onClick={async () => {
                      setSaving(true);
                      const target = step.callback_url || (typeof project !== 'undefined' ? project.n8n_webhook_url : undefined);
                      if (!target) {
                        toast({ description: 'No callback URL set', variant: 'destructive', duration: 1200, className: 'max-w-xs text-xs py-2 px-3 rounded-md shadow-sm' });
                        setSaving(false);
                        return;
                      }
                      // Build answers in the new format
                      let parsed = null;
                      try {
                        parsed = JSON.parse(step.ai_output);
                      } catch {}
                      const questionnaire = parsed?.questionnaire_form || {};
                      const formattedAnswers = {};
                      qids.forEach((qid, idx) => {
                        const qdata = questionnaire[qid];
                        if (!qdata) return;
                        if (idx === qids.length - 1) {
                          // Last question: text answer
                          formattedAnswers[qid] = {
                            question: qdata.question,
                            answer: answers[qid] || ''
                          };
                        } else {
                          formattedAnswers[qid] = {
                            question: qdata.question,
                            answers: (answers[qid] || []).map(id => {
                              const opt = (qdata.options || []).find(o => Object.keys(o)[0] === id);
                              return opt ? { [id]: opt[id] } : { [id]: id };
                            })
                          };
                        }
                      });
                      try {
                        await fetch(target, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            checkpoint: step.step_number,
                            action: 'answers_submitted',
                            answers: formattedAnswers,
                            project_context: typeof project !== 'undefined' ? project.company_context : undefined,
                            step_title: step.title,
                            project_id: step.project_id,
                          }),
                        });
                        // toast({
                        //   description: 'Answers sent to n8n',
                        //   duration: 1200,
                        //   className: 'max-w-xs text-xs py-2 px-3 rounded-md shadow-sm',
                        // });
                        setIsResponse(true);
                        // Mark step as approved after successful submission
                        if (demoApiClient?.entities?.WorkflowStep?.update) {
                          try {
                            await demoApiClient.entities.WorkflowStep.update(step.id, { status: 'approved', answers: formattedAnswers });
                          } catch (e) {}
                        }
                      } catch (e) {
                        toast({ description: 'Failed to send answers', variant: 'destructive', duration: 1200, className: 'max-w-xs text-xs py-2 px-3 rounded-md shadow-sm' });
                      }
                      setSaving(false);
                    }}
                    disabled={saving || !allAnswered || isResponse || !isLatestStep}
                    className="mt-4 font-sans text-white"
                    style={{ background: '#1B2A4A' }}
                  >
                    {saving ? 'Sending...' : isResponse ? 'Submitted' : 'Submit Answers'}
                  </Button>
                </form>
              );
            })()
          ) : (
            <>
              {/* AI Output and controls for non-questionnaire steps */}
              {step.ai_output && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-sans font-semibold text-gray-400 uppercase tracking-wider">
                      AI Output
                    </label>
                    <button
                      onClick={() => {
                        const doc = new jsPDF();
                        const titleText = title;
                        let y = 15;
                        doc.setFontSize(13);
                        doc.setFont(undefined, 'bold');
                        doc.text(titleText, 15, y);
                        y += 9;
                        doc.setFontSize(9);
                        doc.setFont(undefined, 'normal');
                        const plain = (step.ai_output || '')
                          .replace(/\*\*(.*?)\*\*/g, '$1')
                          .replace(/\*(.*?)\*/g, '$1')
                          .replace(/^#{1,6}\s+/gm, '');
                        const lines = doc.splitTextToSize(plain, 180);
                        lines.forEach(line => {
                          if (y > 278) { doc.addPage(); y = 15; }
                          doc.text(line, 15, y);
                          y += 5;
                        });
                        const safeName = titleText.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                        doc.save(`${safeName}.pdf`);
                      }}
                      className="flex items-center gap-1 text-xs font-sans text-gray-400 hover:text-gray-700 transition-colors"
                      title="Export AI output as PDF"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      Export PDF
                    </button>
                  </div>
                  <div className="mt-2 p-4 bg-white border border-gray-100 rounded-lg text-sm leading-relaxed prose prose-sm max-w-none">
                    <ReactMarkdown>{step.ai_output}</ReactMarkdown>
                  </div>
                </div>
              )}
            </>
          )}
          {/* AI Output */}
          {/* ...existing code... */}

          {/* Score */}
          {step.confidence_score != null && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-sans font-semibold text-gray-400 uppercase tracking-wider">
                  Confidence Score
                </label>
                <span className="text-sm font-sans font-semibold" style={{ color: '#1B2A4A' }}>
                  {step.confidence_score}/100
                </span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${step.confidence_score}%`,
                    background: step.confidence_score >= 70 ? '#1A8917' : step.confidence_score >= 40 ? '#E6A817' : '#C94A4A'
                  }}
                />
              </div>
              {step.revision_count > 0 && (
                <p className="text-xs font-sans text-gray-400 mt-1">
                  Self-corrected {step.revision_count} time{step.revision_count > 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          {/* Validation Controls: Only show for the latest/active step */}
          {!is_form && isWaiting && isLatestStep && (step.step_number === 1 || step.step_number === 2 || step.step_number === 4) && (
            <div className="space-y-3 pt-2">
              <div className="flex gap-2">
                <Button
                  onClick={handleApprove}
                  disabled={saving}
                  className="flex-1 font-sans text-sm text-white"
                  style={{ background: isFinalStep ? '#1B2A4A' : '#1A8917' }}
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  {isFinalStep ? 'Approve & Generate Report' : 'Approve & Continue'}
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={saving}
                  variant="outline"
                  className="flex-1 font-sans text-sm border-amber-200 text-amber-700 hover:bg-amber-50"
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  Send Back for Revision
                </Button>
              </div>
              {!webhookUrl && (
                <p className="text-xs text-gray-400 font-sans italic">
                  No N8N webhook URL configured — responses won't be sent back automatically.
                </p>
              )}
            </div>
          )}

          {/* Past feedback */}
          {step.human_feedback && !isWaiting && (
            <div className={`p-3 rounded-lg border ${
              step.status === 'approved' ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'
            }`}>
              <label className={`text-xs font-sans font-semibold uppercase tracking-wider ${
                step.status === 'approved' ? 'text-green-600' : 'text-amber-600'
              }`}>
                {step.status === 'approved' ? 'Approval Notes' : 'Revision Feedback'}
              </label>
              <p className="text-sm font-sans mt-1">{step.human_feedback}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}