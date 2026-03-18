import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { demoApiClient } from '@/lib/demoApiClient';
import { Loader2 } from 'lucide-react';

const industries = [
  'Action Figures', 'Trading Cards', 'Toy Collectibles', 'Model Kits',
  'Plush & Stuffed Toys', 'Board Games & Tabletop', 'Miniatures & Figurines',
  'Retro / Vintage Toys', 'Blind Box / Mystery Toys', 'Other',
];

export default function NewProjectModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', company_context: '', industry_focus: '', n8n_webhook_url: '' });
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!form.title) return;
    setCreating(true);
    // Add new project to demo data
    const project = await demoApiClient.entities.StrategyProject.create({
      ...form,
      status: 'draft',
      current_layer: 1,
      current_step: 1,
    });
    // Optionally add related demo report and workflow steps here
    onCreated?.(project);
    setForm({ title: '', company_context: '', industry_focus: '', n8n_webhook_url: '' });
    setCreating(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">New Strategy Project</DialogTitle>
          <DialogDescription className="font-sans text-sm">
            Provide context about your company and market segment to begin the AI analysis.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label className="font-sans text-sm font-medium">Project Title</Label>
            <Input
              placeholder="e.g. Q1 2026 Competitive Strategy"
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
              placeholder="Brief overview of your company, market position, and what you're trying to achieve..."
              value={form.company_context}
              onChange={(e) => setForm({ ...form, company_context: e.target.value })}
              className="mt-1.5 font-sans min-h-[100px]"
            />
          </div>
          <div>
            <Label className="font-sans text-sm font-medium">
              Launch Webhook URL <span className="text-gray-400 font-normal">(N8N trigger, optional)</span>
            </Label>
            <Input
              placeholder="https://your-n8n.com/webhook/..."
              value={form.n8n_webhook_url}
              onChange={(e) => setForm({ ...form, n8n_webhook_url: e.target.value })}
              className="mt-1.5 font-sans text-sm"
            />
          </div>
          <Button
            onClick={handleCreate}
            disabled={!form.title || creating}
            className="w-full font-sans text-white"
            style={{ background: '#1B2A4A' }}
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Create Project
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}