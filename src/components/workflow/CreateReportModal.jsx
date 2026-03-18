import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, FileText } from 'lucide-react';
import { demoApiClient } from '@/lib/demoApiClient';
import { toast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

const sections = [
  { key: 'executive_summary', title: 'Executive Summary' },
  { key: 'market_research', title: 'Market Research' },
  { key: 'competitive_landscape', title: 'Competitive Landscape' },
  { key: 'strategic_analysis', title: 'Strategic Analysis' },
  { key: 'recommendations', title: 'Strategic Recommendations' },
  { key: 'action_plan', title: 'Action Plan' },
  { key: 'risk_assessment', title: 'Risk Assessment' },
];

export default function CreateReportModal({ open, onClose, project, prefillData }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(() => {
    const d = {};
    sections.forEach(s => { d[s.key] = prefillData?.[s.key] || ''; });
    d.overall_score = prefillData?.overall_score || '';
    return d;
  });
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0); // which section we're editing

  const handleSave = async () => {
    setSaving(true);
    let report = null;
    let existing = [];
    if (demoApiClient.entities?.StrategyReport?.filter) {
      existing = await demoApiClient.entities.StrategyReport.filter({ project_id: project.id });
    }
    if (existing.length > 0 && demoApiClient.entities?.StrategyReport?.update) {
      report = await demoApiClient.entities.StrategyReport.update(existing[0].id, {
        ...form,
        overall_score: form.overall_score ? Number(form.overall_score) : undefined,
      });
    } else if (demoApiClient.entities?.StrategyReport?.create) {
      report = await demoApiClient.entities.StrategyReport.create({
        project_id: project.id,
        ...form,
        overall_score: form.overall_score ? Number(form.overall_score) : undefined,
      });
    }
    if (demoApiClient.entities?.StrategyProject?.update) {
      await demoApiClient.entities.StrategyProject.update(project.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
    }
    toast({ description: 'Report created and saved to Reports page' });
    setSaving(false);
    onClose();
    navigate(`/Report?projectId=${project.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl flex items-center gap-2">
            <FileText className="w-5 h-5" style={{ color: '#1B2A4A' }} />
            Create Strategy Report
          </DialogTitle>
          <DialogDescription className="font-sans text-sm">
            Review and edit each section before saving to the Reports page.
          </DialogDescription>
        </DialogHeader>

        {/* Section tabs */}
        <div className="flex gap-1 flex-wrap mb-4 mt-2">
          {sections.map((s, idx) => (
            <button
              key={s.key}
              onClick={() => setStep(idx)}
              className={`px-3 py-1 rounded-full text-xs font-sans font-medium transition-all ${
                step === idx ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={step === idx ? { background: '#1B2A4A' } : {}}
            >
              {idx + 1}. {s.title.split(' ')[0]}
            </button>
          ))}
          <button
            onClick={() => setStep(sections.length)}
            className={`px-3 py-1 rounded-full text-xs font-sans font-medium transition-all ${
              step === sections.length ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={step === sections.length ? { background: '#1B2A4A' } : {}}
          >
            Score
          </button>
        </div>

        {/* Current section editor */}
        {step < sections.length ? (
          <div key={sections[step].key} className="space-y-2">
            <Label className="font-serif text-lg font-semibold">{sections[step].title}</Label>
            <Textarea
              value={form[sections[step].key]}
              onChange={(e) => setForm({ ...form, [sections[step].key]: e.target.value })}
              className="font-sans text-sm min-h-[220px] leading-relaxed"
              placeholder={`Enter ${sections[step].title.toLowerCase()}...`}
            />
            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                className="font-sans text-sm"
                disabled={step === 0}
                onClick={() => setStep(step - 1)}
              >
                ← Previous
              </Button>
              <Button
                className="font-sans text-sm text-white"
                style={{ background: '#1B2A4A' }}
                onClick={() => setStep(step + 1)}
              >
                Next →
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="font-sans text-sm font-medium">Overall Strategy Score (0–100)</Label>
              <Input
                type="number"
                min="0" max="100"
                value={form.overall_score}
                onChange={(e) => setForm({ ...form, overall_score: e.target.value })}
                className="mt-1.5 font-sans w-32"
                placeholder="e.g. 85"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="font-sans" onClick={() => setStep(sections.length - 1)}>
                ← Back
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 font-sans text-white"
                style={{ background: '#1B2A4A' }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
                Save Report to Reports Page
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}