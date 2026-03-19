import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Save, X } from 'lucide-react';
import ReportSection from '@/components/report/ReportSection';
import ReportExporter from '@/components/report/ReportExporter';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { demoApiClient } from '@/lib/demoApiClient';
import { toast } from '@/components/ui/use-toast';

// Reports are stored as a single `report` string field — edit/display that only.

export default function Report() {
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get('projectId');
  const from = params.get('from'); // 'reports' or null (defaults to dashboard/workflow)
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const list = await demoApiClient.entities.StrategyProject.filter({ id: projectId });
      return list[0];
    },
    enabled: !!projectId,
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['report', projectId],
    queryFn: () => demoApiClient.entities.StrategyReport.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const report = reports && reports.length ? reports[reports.length - 1] : undefined;

  const stripMarkdown = (text) => (text || '').replace(/[#*]/g, '');

  const startEdit = () => {
    setEditData({ report: stripMarkdown(report.report || ''), title: project.title || '' });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    if (demoApiClient.entities?.StrategyReport?.update) {
      await demoApiClient.entities.StrategyReport.update(report.id, { report: stripMarkdown(editData.report || '') });
    }
    if (editData.title && editData.title !== project.title && demoApiClient.entities?.StrategyProject?.update) {
      await demoApiClient.entities.StrategyProject.update(projectId, { title: editData.title });
    }
    queryClient.invalidateQueries({ queryKey: ['report', projectId] });
    queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    toast({ description: 'Report saved', duration: 1200, className: 'max-w-xs text-xs py-2 px-3 rounded-md shadow-sm' });
    setSaving(false);
    setEditing(false);
  };

  const backLink = from === 'reports' ? '/Reports' : `/Workflow?projectId=${projectId}`;
  const backLabel = from === 'reports' ? 'Back to Reports' : 'Back to Workflow';

  if (!project || !report) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[720px] mx-auto px-6 py-10">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-10">
        <Link
          to={backLink}
          className="inline-flex items-center gap-1.5 text-sm font-sans text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {backLabel}
        </Link>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)} className="font-sans text-sm gap-1.5">
                <X className="w-4 h-4" /> Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="font-sans text-sm text-white gap-1.5"
                style={{ background: '#1B2A4A' }}
              >
                <Save className="w-4 h-4" /> Save Report
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={startEdit} className="font-sans text-sm gap-1.5">
                <Pencil className="w-4 h-4" /> Edit
              </Button>
              <ReportExporter report={report} title={project.title} />
            </>
          )}
        </div>
      </div>

      {/* Report Header */}
      <header className="mb-14 border-b border-gray-100 pb-10">
        {editing ? (
          <input
            type="text"
            value={editData.title || ''}
            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
            className="font-serif text-4xl md:text-5xl font-bold leading-tight mb-4 w-full border-b border-gray-300 focus:outline-none focus:border-gray-600 bg-transparent"
          />
        ) : (
          <h1 className="font-serif text-4xl md:text-5xl font-bold leading-tight mb-4">
            {project.title}
          </h1>
        )}
        {project.industry_focus && (
          <span className="inline-block px-3 py-1 rounded-full text-sm font-sans" style={{ background: '#E8ECF2', color: '#1B2A4A' }}>
            {project.industry_focus}
          </span>
        )}
      </header>

      {/* Report Body */}
      <article>
        {editing ? (
          <section className="mb-10">
            <div className="flex items-baseline gap-3 mb-3">
              <span className="font-sans text-xs font-bold px-2 py-1 rounded-full text-white" style={{ background: '#1B2A4A' }}>
                1
              </span>
              <h2 className="font-serif text-2xl font-bold">Report</h2>
            </div>
            <Textarea
              value={editData.report || ''}
              onChange={(e) => setEditData({ ...editData, report: e.target.value })}
              className="font-sans text-sm min-h-[300px] leading-relaxed"
              placeholder={`Write the report here...`}
            />
          </section>
        ) : (
          <ReportSection title={report.title || 'Report'} content={report.report} number={1} />
        )}
      </article>

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-gray-100 text-center">
        <p className="text-sm font-sans text-gray-400">
          Generated by StrategyEngine AI • {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}