import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import your new API client here
import { Loader2 } from 'lucide-react';
import { demoApiClient } from '@/lib/demoApiClient';
import { toast } from '@/components/ui/use-toast';

const industries = [
  'Action Figures', 'Trading Cards', 'Toy Collectibles', 'Model Kits',
  'Plush & Stuffed Toys', 'Board Games & Tabletop', 'Miniatures & Figurines',
  'Retro / Vintage Toys', 'Blind Box / Mystery Toys', 'Other',
];

const statuses = [
  { value: 'draft', label: 'Draft' },
  { value: 'running', label: 'In Progress' },
  { value: 'awaiting_review', label: 'Awaiting Review' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

export default function EditProjectModal({ project, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: project.title || '',
    company_context: project.company_context || '',
    industry_focus: project.industry_focus || '',
    n8n_webhook_url: project.n8n_webhook_url || '',
    status: project.status || 'draft',
    current_layer: project.current_layer || 1,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.title) return;
    setSaving(true);
    if (demoApiClient.entities?.StrategyProject?.update) {
      await demoApiClient.entities.StrategyProject.update(project.id, {
        ...form,
        current_layer: Number(form.current_layer),
      });
    }
    toast({ description: 'Project updated' });
    onSaved?.();
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Edit Project</DialogTitle>
          <DialogDescription className="font-sans text-sm">
            Update project details, status, and N8N configuration.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label className="font-sans text-sm font-medium">Project Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1.5 font-sans"
            />
          </div>
          <div>
            <Label className="font-sans text-sm font-medium">Industry Focus</Label>
            <Select value={form.industry_focus} onValueChange={(v) => setForm({ ...form, industry_focus: v })}>
              <SelectTrigger className="mt-1.5 font-sans">
                <SelectValue placeholder="Select your niche" />
              </SelectTrigger>
              <SelectContent>
                {industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="font-sans text-sm font-medium">Project Context</Label>
            <Textarea
              value={form.company_context}
              onChange={(e) => setForm({ ...form, company_context: e.target.value })}
              className="mt-1.5 font-sans min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="font-sans text-sm font-medium">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="mt-1.5 font-sans">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-sans text-sm font-medium">Current Layer (1–3)</Label>
              <Select
                value={String(form.current_layer)}
                onValueChange={(v) => setForm({ ...form, current_layer: Number(v) })}
              >
                <SelectTrigger className="mt-1.5 font-sans">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Layer 1 — Research</SelectItem>
                  <SelectItem value="2">Layer 2 — Analysis</SelectItem>
                  <SelectItem value="3">Layer 3 — Recommendations</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="font-sans text-sm font-medium">
              Launch Webhook URL <span className="text-gray-400 font-normal">(N8N trigger)</span>
            </Label>
            <Input
              placeholder="https://your-n8n.com/webhook/..."
              value={form.n8n_webhook_url}
              onChange={(e) => setForm({ ...form, n8n_webhook_url: e.target.value })}
              className="mt-1.5 font-sans text-sm"
            />
            <p className="text-xs text-gray-400 font-sans mt-1">
              This URL is called when "Launch Analysis" is triggered.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 font-sans">Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!form.title || saving}
              className="flex-1 font-sans text-white"
              style={{ background: '#1B2A4A' }}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}