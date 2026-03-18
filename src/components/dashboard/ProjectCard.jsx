import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle2, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const statusConfig = {
  draft: { label: 'Draft', icon: Clock, color: 'bg-gray-100 text-gray-600' },
  running: { label: 'In Progress', icon: Loader2, color: 'bg-blue-50 text-blue-700' },
  awaiting_review: { label: 'Needs Review', icon: AlertCircle, color: 'text-white', navy: true },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'bg-green-50 text-green-700' },
  failed: { label: 'Failed', icon: AlertCircle, color: 'bg-red-50 text-red-700' },
};

export default function ProjectCard({ project }) {
  const config = statusConfig[project.status] || statusConfig.draft;
  const StatusIcon = config.icon;
  const progress = project.status === 'completed' ? 100 :
    project.current_layer ? Math.round(((project.current_layer - 1) * 33) + ((project.current_step || 1) * 11)) : 0;

  return (
    <Link
      to={`/Workflow?projectId=${project.id}`}
      className="group block border border-gray-100 rounded-xl p-6 hover:shadow-md hover:border-gray-200 transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-serif text-lg font-semibold group-hover:underline decoration-1 underline-offset-4">
            {project.title}
          </h3>
          {project.industry_focus && (
            <p className="text-sm font-sans text-gray-500 mt-1">{project.industry_focus}</p>
          )}
        </div>
        <Badge
          className={`font-sans text-xs ${config.color}`}
          style={config.navy ? { background: '#1B2A4A' } : {}}
        >
          <StatusIcon className={`w-3 h-3 mr-1 ${project.status === 'running' ? 'animate-spin' : ''}`} />
          {config.label}
        </Badge>
      </div>

      {project.company_context && (
        <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-4">
          {project.company_context}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Progress bar */}
          <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: '#1B2A4A' }}
            />
          </div>
          <span className="text-xs font-sans text-gray-400">
            {project.created_date && format(new Date(project.created_date), 'MMM d, yyyy')}
          </span>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
      </div>
    </Link>
  );
}