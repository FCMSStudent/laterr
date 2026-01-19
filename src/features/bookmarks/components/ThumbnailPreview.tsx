import { useState } from 'react';
import { ExternalLink, Image as ImageIcon } from 'lucide-react';
import { AspectRatio } from '@/shared/components/ui/aspect-ratio';
import { Button } from '@/shared/components/ui/button';

interface ThumbnailPreviewProps {
  imageUrl: string;
  linkUrl?: string;
  title?: string;
  className?: string;
  onClick?: () => void;
}

export const ThumbnailPreview = ({ 
  imageUrl, 
  linkUrl, 
  title, 
  className = '',
  onClick 
}: ThumbnailPreviewProps) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
    } else if (linkUrl) {
      e.stopPropagation();
      window.open(linkUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleExternalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (linkUrl) {
      window.open(linkUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (imageError || !imageUrl) {
    return (
      <div className={`rounded-xl overflow-hidden bg-muted ${className}`}>
        <AspectRatio ratio={16 / 9}>
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
          </div>
        </AspectRatio>
      </div>
    );
  }

  return (
    <div 
      className={`relative rounded-xl overflow-hidden bg-muted group cursor-pointer ${className}`}
      onClick={handleClick}
    >
      <AspectRatio ratio={16 / 9}>
        {!imageLoaded && (
          <div className="absolute inset-0 bg-muted animate-pulse" />
        )}
        <img 
          src={imageUrl} 
          alt={title || 'Preview'}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          {linkUrl && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-background/90 px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium">
                <ExternalLink className="h-4 w-4" />
                Open Link
              </div>
            </div>
          )}
        </div>
      </AspectRatio>
      
      {/* External link button */}
      {linkUrl && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExternalClick}
          className="absolute top-2 right-2 bg-background/80 hover:bg-background text-foreground h-8 w-8 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
          aria-label="Open link in new tab"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
