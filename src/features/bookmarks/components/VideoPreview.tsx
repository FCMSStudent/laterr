import { useState } from 'react';
import { Play, ExternalLink } from 'lucide-react';
import { AspectRatio } from '@/shared/components/ui/aspect-ratio';
import { Button } from '@/shared/components/ui/button';
import { ViewerShell } from './ViewerShell';
import { 
  isYouTubeUrl, 
  getYouTubeVideoId, 
  getYouTubeThumbnail,
  getVideoEmbedUrl,
  isVideoUrl 
} from '@/features/bookmarks/utils/video-utils';

interface VideoPreviewProps {
  url: string;
  title?: string;
  className?: string;
}

export const VideoPreview = ({ url, title, className = '' }: VideoPreviewProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const embedUrl = getVideoEmbedUrl(url);
  
  // Get thumbnail for YouTube
  const thumbnailUrl = isYouTubeUrl(url) 
    ? getYouTubeThumbnail(getYouTubeVideoId(url) || '')
    : null;

  if (!isVideoUrl(url)) {
    return null;
  }

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(true);
  };

  const handleOpenExternal = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <ViewerShell className={className}>
      <div className="relative w-full">
        <AspectRatio ratio={16 / 9}>
          {isPlaying && embedUrl ? (
            <iframe
              src={`${embedUrl}?autoplay=1`}
              title={title || 'Video player'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full rounded-lg"
            />
          ) : (
            <div className="relative w-full h-full group cursor-pointer rounded-lg overflow-hidden" onClick={handlePlayClick}>
              {thumbnailUrl ? (
                <img 
                  src={thumbnailUrl} 
                  alt={title || 'Video thumbnail'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to lower quality thumbnail
                    const target = e.target as HTMLImageElement;
                    if (target.src.includes('maxresdefault')) {
                      target.src = target.src.replace('maxresdefault', 'hqdefault');
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Play className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              
              {/* Smaller play button positioned in bottom-right corner */}
              <div className="absolute bottom-3 right-3 opacity-90 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  {/* Slight margin-left for visual centering of the play triangle icon */}
                  <Play className="h-5 w-5 text-primary-foreground ml-0.5" fill="currentColor" />
                </div>
              </div>
              
              {/* External link button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenExternal}
                className="absolute top-2 right-2 bg-background/80 hover:bg-background text-foreground h-8 w-8 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                aria-label="Open video in new tab"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          )}
        </AspectRatio>
      </div>
    </ViewerShell>
  );
};
