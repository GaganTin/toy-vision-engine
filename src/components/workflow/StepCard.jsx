import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Check, X, RotateCcw, ChevronDown, ChevronUp,
  Shield, Clock, Loader2, AlertCircle, Eye
} from 'lucide-react';
// import your new API client here
import ReactMarkdown from 'react-markdown';

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-600', icon: Clock },
  running: { label: 'Running', color: 'bg-blue-50 text-blue-700', icon: Loader2 },
  awaiting_validation: { label: 'Needs Review', color: 'text-white', icon: Eye, navy: true },
  approved: { label: 'Approved', color: 'bg-green-50 text-green-700', icon: Check },
  revision_requested: { label: 'Revision', color: 'bg-amber-50 text-amber-700', icon: RotateCcw },
  failed: { label: 'Failed', color: 'bg-red-50 text-red-700', icon: AlertCircle },
};

export default function StepCard({ step, onUpdate }) {
  const [expanded, setExpanded] = useState(step.status === 'awaiting_validation');
  const [feedback, setFeedback] = useState(step.human_feedback || '');
  const [saving, setSaving] = useState(false);

  const config = statusConfig[step.status] || statusConfig.pending;
  const StatusIcon = config.icon;
  const isWaiting = step.status === 'awaiting_validation';

  const handleAction = async (newStatus) => {
    setSaving(true);
    // Replace with your API client logic
    if (apiClient.entities?.WorkflowStep?.update) {
      await apiClient.entities.WorkflowStep.update(step.id, {
        status: newStatus,
        human_feedback: feedback || undefined,
      });
    }
    onUpdate?.();
    setSaving(false);
  };

  return (
    <div
      className={`border rounded-xl transition-all duration-300 ${
        isWaiting ? 'border-2 shadow-sm' : 'border-gray-100'
      }`}
      style={isWaiting ? { borderColor: '#1B2A4A' } : {}}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-50 font-sans text-xs font-semibold text-gray-500">
            {step.step_number}
          </div>
          <div>
            <h4 className="font-serif text-base font-semibold">{step.title}</h4>
            {step.description && (
              <p className="text-sm text-gray-500 font-sans mt-0.5">{step.description}</p>
            )}
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

      {/* Expanded Content */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-50 pt-4">
          {/* AI Input */}
          {step.ai_input && (
            <div>
              <label className="text-xs font-sans font-semibold text-gray-400 uppercase tracking-wider">
                AI Input / Prompt
              </label>
              <div className="mt-2 p-4 bg-gray-50 rounded-lg text-sm font-sans text-gray-700 leading-relaxed whitespace-pre-wrap">
                {step.ai_input}
              </div>
            </div>
          )}

          {/* AI Output */}
          {step.ai_output && (
            <div>
              <label className="text-xs font-sans font-semibold text-gray-400 uppercase tracking-wider">
                AI Output
              </label>
              <div className="mt-2 p-4 bg-white border border-gray-100 rounded-lg text-sm leading-relaxed prose prose-sm max-w-none">
                <ReactMarkdown>{step.ai_output}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Score bar */}
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

          {/* Validation Controls */}
          {isWaiting && (
            <div className="space-y-3 pt-2">
              <div className="flex gap-2">
                <Button
                  onClick={() => handleAction('approved')}
                  disabled={saving}
                  className="flex-1 font-sans text-sm text-white"
                  style={{ background: '#1A8917' }}
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  Approve & Continue
                </Button>
                <Button
                  onClick={() => handleAction('revision_requested')}
                  disabled={saving}
                  variant="outline"
                  className="flex-1 font-sans text-sm"
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  Request Revision
                </Button>
              </div>
            </div>
          )}

          {/* Past feedback */}
          {step.human_feedback && step.status !== 'awaiting_validation' && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <label className="text-xs font-sans font-semibold text-blue-600 uppercase tracking-wider">
                Your Feedback
              </label>
              <p className="text-sm font-sans text-blue-800 mt-1">{step.human_feedback}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}