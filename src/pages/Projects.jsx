import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { demoApiClient } from '@/lib/demoApiClient';
import { Link } from 'react-router-dom';
import { Plus, Search, SortAsc, SortDesc, Trash2, Pencil, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import NewProjectModal from '@/components/dashboard/NewProjectModal';
import EditProjectModal from '@/components/dashboard/EditProjectModal';
import ProjectCard from '@/components/dashboard/ProjectCard';
import { toast } from '@/components/ui/use-toast';

export default function Projects() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('-created_date');
  const [showNew, setShowNew] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [deletingProject, setDeletingProject] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => demoApiClient.entities.StrategyProject.list(),
  });
  const projects = Array.isArray(data) ? data : [];

  const filtered = useMemo(() => {
    let list = projects;

    // Filter by status tab
    if (filter !== 'all') {
      list = list.filter(p => {
        if (filter === 'active') return ['running', 'awaiting_review'].includes(p.status);
        if (filter === 'completed') return p.status === 'completed';
        if (filter === 'draft') return p.status === 'draft';
        return true;
      });
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.industry_focus?.toLowerCase().includes(q) ||
        p.company_context?.toLowerCase().includes(q)
      );
    }

    // Sort
    list = [...list].sort((a, b) => {
      const asc = !sort.startsWith('-');
      const field = sort.replace('-', '');
      const av = a[field] || '';
      const bv = b[field] || '';
      if (av < bv) return asc ? -1 : 1;
      if (av > bv) return asc ? 1 : -1;
      return 0;
    });

    return list;
  }, [projects, filter, search, sort]);

  const handleDelete = async () => {
    if (!deletingProject) return;
    if (demoApiClient.entities?.StrategyProject?.delete) {
      await demoApiClient.entities.StrategyProject.delete(deletingProject.id);
    }
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    toast({ description: 'Project deleted' });
    setDeletingProject(null);
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['projects'] });

  return (
    <div className="max-w-[1000px] mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl font-bold">All Projects</h1>
        <Button onClick={() => setShowNew(true)} className="font-sans text-sm text-white gap-2" style={{ background: '#1B2A4A' }}>
          <Plus className="w-4 h-4" /> New Project
        </Button>
      </div>

      {/* Search + Sort */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 font-sans text-sm"
            placeholder="Search by title, industry, context..."
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
            <SelectItem value="-title"><span>Title Z–A</span></SelectItem>
            <SelectItem value="status"><span>Status</span></SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status Tabs */}
      <Tabs value={filter} onValueChange={setFilter} className="mb-8">
        <TabsList className="font-sans">
          <TabsTrigger value="all"><span>All ({projects.length})</span></TabsTrigger>
          <TabsTrigger value="active"><span>Active</span></TabsTrigger>
          <TabsTrigger value="completed"><span>Completed</span></TabsTrigger>
          <TabsTrigger value="draft"><span>Drafts</span></TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(p => (
            <div key={p.id} className="relative group">
              <ProjectCard project={p} />
              {/* Action overlay */}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 bg-white border border-gray-100 shadow-sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="font-sans text-sm">
                    <DropdownMenuItem onClick={() => setEditingProject(p)}><Pencil className="w-4 h-4 mr-2" /> <span>Edit Project</span></DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600" onClick={() => setDeletingProject(p)}><Trash2 className="w-4 h-4 mr-2" /> <span>Delete</span></DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 font-sans py-12">No projects match this filter.</p>
          )}
        </div>
      )}

      <NewProjectModal open={showNew} onClose={() => setShowNew(false)} onCreated={refresh} />

      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSaved={refresh}
        />
      )}

      <AlertDialog open={!!deletingProject} onOpenChange={() => setDeletingProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader className="">
            <AlertDialogTitle className="font-serif"><span>Delete project?</span></AlertDialogTitle>
            <AlertDialogDescription className="font-sans text-sm"><span>This will permanently delete "{deletingProject?.title}" and all its steps. This cannot be undone.</span></AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="">
            <AlertDialogCancel className="font-sans"><span>Cancel</span></AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="font-sans bg-red-600 hover:bg-red-700"><span>Delete</span></AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}