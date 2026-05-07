'use client';

import { useState } from 'react';
import { Plus, FolderOpen, Trash2, Edit2, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Section } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SectionSidebarProps {
  sections: Section[];
  activeSectionId: string | null;
  onSelectSection: (sectionId: string) => void;
  onCreateSection: (name: string) => void;
  onRenameSection: (sectionId: string, newName: string) => void;
  onDeleteSection: (sectionId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function SectionSidebar({
  sections,
  activeSectionId,
  onSelectSection,
  onCreateSection,
  onRenameSection,
  onDeleteSection,
  isCollapsed,
  onToggleCollapse,
}: SectionSidebarProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Section | null>(null);

  const handleCreate = () => {
    if (newSectionName.trim()) {
      onCreateSection(newSectionName.trim());
      setNewSectionName('');
      setIsCreating(false);
    }
  };

  const handleStartEdit = (section: Section) => {
    setEditingId(section.id);
    setEditName(section.name);
  };

  const handleSaveEdit = () => {
    if (editingId && editName.trim()) {
      onRenameSection(editingId, editName.trim());
      setEditingId(null);
      setEditName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      onDeleteSection(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-14 border-r border-border bg-card flex flex-col items-center py-4 gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
        <div className="w-8 h-px bg-border my-2" />
        {sections.map((section) => (
          <Button
            key={section.id}
            variant="ghost"
            size="icon"
            onClick={() => onSelectSection(section.id)}
            className={cn(
              "w-10 h-10 rounded-lg",
              activeSectionId === section.id
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            title={section.name}
          >
            <FolderOpen className="w-5 h-5" />
          </Button>
        ))}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            onToggleCollapse();
            setIsCreating(true);
          }}
          className="text-muted-foreground hover:text-foreground mt-auto"
          title="Create new section"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Sections</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {sections.map((section) => (
              <div
                key={section.id}
                className={cn(
                  "group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
                  activeSectionId === section.id
                    ? "bg-primary/20 text-primary"
                    : "hover:bg-secondary text-foreground"
                )}
                onClick={() => editingId !== section.id && onSelectSection(section.id)}
              >
                <FolderOpen className="w-4 h-4 flex-shrink-0" />
                
                {editingId === section.id ? (
                  <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-7 text-sm bg-input"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveEdit}>
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancelEdit}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 truncate text-sm">{section.name}</span>
                    <div className="hidden group-hover:flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(section);
                        }}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(section);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {isCreating ? (
              <div className="flex items-center gap-1 p-2">
                <Input
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  placeholder="Section name..."
                  className="h-8 text-sm bg-input"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate();
                    if (e.key === 'Escape') {
                      setIsCreating(false);
                      setNewSectionName('');
                    }
                  }}
                />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCreate}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setIsCreating(false);
                    setNewSectionName('');
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:text-foreground"
                onClick={() => setIsCreating(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Section
              </Button>
            )}
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-border">
          <div className="text-xs text-muted-foreground">
            {sections.length} section{sections.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Section?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently delete &quot;{deleteTarget?.name}&quot; and all its saved documents, 
              test history, and question data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Section
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
