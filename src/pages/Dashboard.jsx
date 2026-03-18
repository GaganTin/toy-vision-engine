import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Workflow, BarChart3, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, Link } from 'react-router-dom';
import ProjectCard from '@/components/dashboard/ProjectCard';
import NewProjectModal from '@/components/dashboard/NewProjectModal';
import { demoApiClient } from '@/lib/demoApiClient';

export default function Dashboard() {
  const [showNew, setShowNew] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => demoApiClient.entities.StrategyProject.list(),
  });
  const projects = Array.isArray(data) ? data : [];

  const stats = {
    total: projects.length,
    active: projects.filter(p => ['running', 'awaiting_review'].includes(p.status)).length,
    completed: projects.filter(p => p.status === 'completed').length,
  };

  return (
    <div className="max-w-[1000px] mx-auto px-6 py-12">
      {/* Hero */}
      <div className="mb-12">
        <h1 className="font-serif text-4xl md:text-5xl font-bold leading-tight mb-3">
          Strategy Engine
        </h1>
        <p className="text-lg text-gray-500 font-serif max-w-xl leading-relaxed">
          AI-powered competitive strategy for the collectible toy industry. 
          From market research to actionable recommendations.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          { label: 'Total Projects', value: stats.total, icon: Workflow },
          { label: 'Active', value: stats.active, icon: BarChart3 },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2 },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="p-5 rounded-xl bg-gray-50 border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4" style={{ color: '#1B2A4A' }} />
              <span className="text-xs font-sans font-medium text-gray-500 uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-3xl font-serif font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-serif text-2xl font-bold">Your Projects</h2>
        <div className="flex items-center gap-2">
          <Link to="/Projects">
            <Button variant="outline" className="font-sans text-sm gap-2">
              Show All Projects
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Button
            onClick={() => setShowNew(true)}
            className="font-sans text-sm text-white gap-2"
            style={{ background: '#1B2A4A' }}
          >
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </div>
      </div>

      {/* Project List */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-gray-200 rounded-xl">
          <Workflow className="w-12 h-12 mx-auto mb-4" style={{ color: '#CCC' }} />
          <h3 className="font-serif text-xl font-semibold mb-2">No projects yet</h3>
          <p className="text-gray-500 font-sans text-sm mb-6">
            Start your first AI-powered strategy analysis
          </p>
          <Button
            onClick={() => setShowNew(true)}
            className="font-sans text-white"
            style={{ background: '#1B2A4A' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create First Project
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map(p => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}

      <NewProjectModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['projects'] })}
      />
    </div>
  );
}