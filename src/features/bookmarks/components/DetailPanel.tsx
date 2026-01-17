import React, { useState } from 'react';
import { 
  X, 
  ExternalLink, 
  Pencil, 
  Trash2, 
  FileText, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  Video, 
  File,
  Calendar,
  Tag,
  Play
} from 'lucide-react';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/shared/components/ui/drawer';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Separator } from '@/shared/components/ui/separator';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { cn } from '@/shared/lib/utils';
import type { Item } from '../types';
import { NotePreview } from './NotePreview';
import { parseNotes, getChecklistStats } from '../utils/notes-parser';
import { getVideoEmbedUrl, isVideoUrl as checkVideoUrl } from '../utils/video-utils';

interface DetailPanelProps {
  item: Item | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'video': return Video;
    case 'url': return LinkIcon;
    case 'note': return FileText;
    case 'image': return ImageIcon;
    case 'pdf': return File;
    default: return File;
  }
};

const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    video: 'Video',
    url: 'Article',
    note: 'Note',
    image: 'Image',
    pdf: 'PDF',
    file: 'File',
  };
  return labels[type] || 'Item';
};

const extractDomain = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
};

export const DetailPanel: React.FC<DetailPanelProps> = ({
  item,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}) => {
  const isMobile = useIsMobile();
  const [showEmbed, setShowEmbed] = useState(false);

  if (!item) return null;

  const TypeIcon = getTypeIcon(item.type);
  const typeLabel = getTypeLabel(item.type);
  const isVideo = item.type === 'video' || (item.content && checkVideoUrl(item.content));
  const isNote = item.type === 'note';
  const embedUrl = item.content ? getVideoEmbedUrl(item.content) : null;
  const domain = item.content ? extractDomain(item.content) : '';

  const PanelContent = (
    <div className="flex flex-col h-full">
      {/* Header with Close Button */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-muted">
            <TypeIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">{typeLabel}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Large Thumbnail / Preview */}
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
            {isNote ? (
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center p-6">
                <FileText className="h-16 w-16 text-muted-foreground/40" />
              </div>
            ) : embedUrl && showEmbed ? (
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={item.title}
              />
            ) : item.preview_image_url ? (
              <>
                <img
                  src={item.preview_image_url}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
                {isVideo && embedUrl && (
                  <button
                    onClick={() => setShowEmbed(true)}
                    className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
                  >
                    <div className="h-16 w-16 rounded-full bg-background/95 flex items-center justify-center shadow-xl">
                      <Play className="h-7 w-7 ml-1" fill="currentColor" />
                    </div>
                  </button>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <TypeIcon className="h-16 w-16 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <h2 className="text-xl font-semibold leading-tight">{item.title}</h2>
            {domain && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <LinkIcon className="h-3 w-3" />
                {domain}
              </p>
            )}
          </div>

          {/* URL (clickable) */}
          {item.content && !isNote && (
            <a
              href={item.content}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1.5 truncate"
            >
              <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{item.content}</span>
            </a>
          )}

          <Separator />

          {/* Summary / Description */}
          {item.summary && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Summary</h3>
              <p className="text-sm leading-relaxed">{item.summary}</p>
            </div>
          )}

          {/* Note Content */}
          {isNote && item.user_notes && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Note Content</h3>
                {(() => {
                  const notesData = parseNotes(item.user_notes);
                  const stats = getChecklistStats(notesData);
                  if (stats.total === 0) return null;
                  return (
                    <span className="text-xs text-muted-foreground">
                      {stats.completed}/{stats.total} complete
                    </span>
                  );
                })()}
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <NotePreview content={item.user_notes} />
              </div>
            </div>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="rounded-full">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Details
            </h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Created: {format(new Date(item.created_at), 'MMM d, yyyy \'at\' h:mm a')}</p>
              {item.updated_at !== item.created_at && (
                <p>Updated: {format(new Date(item.updated_at), 'MMM d, yyyy \'at\' h:mm a')}</p>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Action Buttons */}
      <div className="p-4 border-t bg-background">
        <div className="flex gap-2">
          {item.content && !isNote && (
            <Button
              variant="default"
              className="flex-1"
              onClick={() => window.open(item.content!, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Original
            </Button>
          )}
          {onEdit && (
            <Button variant="outline" size="icon" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button variant="outline" size="icon" onClick={onDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  // Use Drawer on mobile, Sheet on desktop
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="sr-only">
            <DrawerTitle>{item.title}</DrawerTitle>
          </DrawerHeader>
          {PanelContent}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md p-0 flex flex-col"
        onEscapeKeyDown={onClose}
        onInteractOutside={onClose}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{item.title}</SheetTitle>
        </SheetHeader>
        {PanelContent}
      </SheetContent>
    </Sheet>
  );
};
