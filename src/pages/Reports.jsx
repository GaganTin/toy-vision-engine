import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FileText, ChevronRight, Award, Trash2, Mail, Search, SortAsc } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { demoApiClient } from '@/lib/demoApiClient';
import { toast } from '@/components/ui/use-toast';

export default function Reports() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('-created_date');
  const [deletingId, setDeletingId] = useState(null);
  const [sharingReport, setSharingReport] = useState(null);
  const [shareEmail, setShareEmail] = useState('');
  const [sharing, setSharing] = useState(false);
  const queryClient = useQueryClient();

  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => demoApiClient.entities.StrategyProject.list(),
  });
  const projects = Array.isArray(projectsData) ? projectsData : [];

  const { data: reportsData } = useQuery({
    queryKey: ['all-reports'],
    queryFn: () => demoApiClient.entities.StrategyReport.list(),
  });
  const reports = Array.isArray(reportsData) ? reportsData : [];

  // Expose only saved reports to the Reports listing (exclude generated unsaved drafts)
  const savedReports = (reports || []).filter(r => r.saved !== false);

  const reportMap = {};
  savedReports.forEach(r => { reportMap[r.project_id] = r; });

  const projectMap = {};
  projects.forEach(p => { projectMap[p.id] = p; });

  const completedProjects = useMemo(() => {
    let list = projects.filter(p => reportMap[p.id]);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.industry_focus?.toLowerCase().includes(q)
      );
    }

    list = [...list].sort((a, b) => {
      const asc = !sort.startsWith('-');
      const field = sort.replace('-', '');
      const av = (field === 'score' ? reportMap[a.id]?.overall_score : a[field]) || '';
      const bv = (field === 'score' ? reportMap[b.id]?.overall_score : b[field]) || '';
      if (av < bv) return asc ? -1 : 1;
      if (av > bv) return asc ? 1 : -1;
      return 0;
    });

    return list;
  }, [projects, reports, search, sort]);

  const handleDelete = async () => {
    if (!deletingId) return;
    const report = savedReports.find(r => r.project_id === deletingId) || reports.find(r => r.project_id === deletingId);
    if (report) await demoApiClient.entities.StrategyReport.delete(report.id);
    queryClient.invalidateQueries({ queryKey: ['all-reports'] });
    toast({ description: 'Report deleted' });
    setDeletingId(null);
  };

  const handleShare = async () => {
    if (!shareEmail || !sharingReport) return;
    setSharing(true);
    // Email sending is not supported in demo mode
    toast({ description: `Report shared to ${shareEmail}` });
    setSharing(false);
    setSharingReport(null);
    setShareEmail('');
  };

  const deletingProject = projects.find(p => p.id === deletingId);

  return (
    <div className="max-w-[1000px] mx-auto px-6 py-12">
      <h1 className="font-serif text-3xl font-bold mb-2">Strategy Reports</h1>
      <p className="text-gray-500 font-serif mb-8">Completed strategy analyses ready for review and export.</p>

      {/* Search + Sort */}
      <div className="flex gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 font-sans text-sm"
            placeholder="Search reports..."
          />
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-44 font-sans text-sm">
            <span>Sort by</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="-created_date"><span>Newest first</span></SelectItem>
            <SelectItem value="created_date"><span>Oldest first</span></SelectItem>
            <SelectItem value="title"><span>Title A–Z</span></SelectItem>
            <SelectItem value="-score"><span>Highest score</span></SelectItem>
            <SelectItem value="score"><span>Lowest score</span></SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
        </div>
      ) : completedProjects.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-gray-200 rounded-xl">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="font-serif text-xl font-semibold mb-2">No reports yet</h3>
          <p className="text-gray-500 font-sans text-sm">Reports appear here once a strategy project is completed.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {completedProjects.map(project => {
            const report = reportMap[project.id];
            return (
              <div key={project.id} className="group flex items-center justify-between p-6 border border-gray-100 rounded-xl hover:shadow-md hover:border-gray-200 transition-all">
                <Link
                  to={`/Report?projectId=${project.id}&from=reports`}
                  className="flex items-center gap-4 flex-1 min-w-0"
                >
                  <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#E8ECF2' }}>
                    <FileText className="w-5 h-5" style={{ color: '#1B2A4A' }} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-serif text-lg font-semibold group-hover:underline decoration-1 underline-offset-4 truncate">
                      {project.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      {project.industry_focus && (
                        <span className="text-xs font-sans text-gray-500">{project.industry_focus}</span>
                      )}
                      <span className="text-xs font-sans text-gray-400">
                        {project.completed_at && format(new Date(project.completed_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </Link>
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  {report?.overall_score != null && (
                    <div className="flex items-center gap-1.5 mr-2">
                      <Award className="w-4 h-4" style={{ color: '#1B2A4A' }} />
                      <span className="font-sans text-sm font-semibold" style={{ color: '#1B2A4A' }}>
                        {report.overall_score}/100
                      </span>
                    </div>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-blue-600" title="Share via email" onClick={() => { setSharingReport(report); setShareEmail(''); }}>
                    <Mail className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600" title="Delete report" onClick={() => setDeletingId(project.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirm */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader className="">
            <AlertDialogTitle className="font-serif"><span>Delete report?</span></AlertDialogTitle>
            <AlertDialogDescription className="font-sans text-sm"><span>This will permanently delete the report for "{deletingProject?.title}". This cannot be undone.</span></AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="">
            <AlertDialogCancel className="font-sans"><span>Cancel</span></AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="font-sans bg-red-600 hover:bg-red-700"><span>Delete</span></AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Modal */}
      <Dialog open={!!sharingReport} onOpenChange={() => setSharingReport(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="">
            <DialogTitle className="font-serif text-xl"><span>Share Report</span></DialogTitle>
            <DialogDescription className="font-sans text-sm"><span>Send this report to an email address.</span></DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="font-sans text-sm font-medium"><span>Recipient Email</span></Label>
              <Input
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                className="mt-1.5 font-sans"
                placeholder="colleague@company.com"
                type="email"
              />
            </div>
            <Button onClick={handleShare} disabled={!shareEmail || sharing} className="w-full font-sans text-white" style={{ background: '#1B2A4A' }}>
              {sharing ? <span className="animate-spin mr-2">⏳</span> : <Mail className="w-4 h-4 mr-2" />}<span>Send Report Link</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}