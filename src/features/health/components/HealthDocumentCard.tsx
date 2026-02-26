import { Badge } from "@/shared/components/ui";
import { Button } from "@/shared/components/ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui";
import { AspectRatio } from "@/shared/components/ui";
import { 
  MoreVertical, Trash2, FileText, TestTube, Pill, Scan, 
  Shield, Syringe, ClipboardCheck, Forward, Calendar, Building
} from "lucide-react";
import { format } from "date-fns";
import type { HealthDocument, DocumentType } from "@/features/health/types";
import { DOCUMENT_TYPES } from "@/features/health/constants";

interface HealthDocumentCardProps {
  document: HealthDocument;
  onClick: () => void;
  onDelete?: (id: string) => void;
}

const DOCUMENT_ICONS: Record<DocumentType, React.ReactNode> = {
  lab_result: <TestTube className="h-5 w-5" />,
  prescription: <Pill className="h-5 w-5" />,
  medical_report: <FileText className="h-5 w-5" />,
  imaging: <Scan className="h-5 w-5" />,
  insurance: <Shield className="h-5 w-5" />,
  vaccination: <Syringe className="h-5 w-5" />,
  discharge_summary: <ClipboardCheck className="h-5 w-5" />,
  referral: <Forward className="h-5 w-5" />,
};

export const HealthDocumentCard = ({
  document,
  onClick,
  onDelete,
}: HealthDocumentCardProps) => {
  const docType = document.document_type as DocumentType;
  const typeInfo = DOCUMENT_TYPES[docType];
  const icon = DOCUMENT_ICONS[docType] || <FileText className="h-5 w-5" />;

  const handleMenuAction = useCallback((e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  }, []);

  const handleTriggerClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // Check if file is an image for preview
  const isImage = document.file_type?.startsWith('image/');
  const isPdf = document.file_type === 'application/pdf';

  return (
    <div
      role="article"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      className="glass-card rounded-2xl p-6 cursor-pointer hover:scale-[1.02] premium-transition hover:shadow-2xl group overflow-hidden relative"
      style={{ borderLeftWidth: '4px', borderLeftColor: typeInfo?.color || 'hsl(var(--primary))' }}
    >
      {/* Actions menu */}
      <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 premium-transition">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={handleTriggerClick}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full glass-light hover:shadow-md">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {onDelete && (
              <DropdownMenuItem
                onClick={(e) => handleMenuAction(e, () => onDelete(document.id))}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Preview thumbnail */}
      <AspectRatio ratio={16 / 9} className="mb-4">
        <div className="flex items-center justify-center w-full h-full rounded-xl bg-muted/30">
          <div className="text-muted-foreground/40 scale-150">
            {icon}
          </div>
        </div>
      </AspectRatio>

      <div className="space-y-3">
        {/* Type Badge */}
        <Badge 
          variant="secondary" 
          className="text-xs"
          style={{ backgroundColor: `${typeInfo?.color}20`, color: typeInfo?.color }}
        >
          {icon}
          <span className="ml-1">{typeInfo?.label || docType}</span>
        </Badge>

        {/* Title */}
        <h3 className="font-bold text-base line-clamp-2 leading-snug tracking-tight">
          {document.title}
        </h3>

        {/* Provider */}
        {document.provider_name && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building className="w-3 h-3" />
            <span className="line-clamp-1">{document.provider_name}</span>
          </div>
        )}

        {/* Date */}
        {document.visit_date && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>{format(new Date(document.visit_date), 'MMM d, yyyy')}</span>
          </div>
        )}

        {/* Summary preview */}
        {document.summary && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {document.summary}
          </p>
        )}

        {/* Tags */}
        {document.tags && document.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {document.tags.slice(0, 3).map((tag, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
            {document.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{document.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
