/**
 * Detect if a URL is a YouTube video
 */
export const isYouTubeUrl = (url: string): boolean => {
  return url.includes('youtube.com') || url.includes('youtu.be');
};

/**
 * Extract YouTube video ID from various URL formats
 */
export const getYouTubeVideoId = (url: string): string | null => {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
    /youtube\.com\/v\/([^?]+)/,
    /youtube\.com\/shorts\/([^?]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

/**
 * Get YouTube thumbnail URL
 */
export const getYouTubeThumbnail = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};

/**
 * Detect if a URL is a Vimeo video
 */
export const isVimeoUrl = (url: string): boolean => {
  return url.includes('vimeo.com');
};

/**
 * Extract Vimeo video ID
 */
export const getVimeoVideoId = (url: string): string | null => {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
};

/**
 * Check if URL is a video platform
 */
export const isVideoUrl = (url: string): boolean => {
  return isYouTubeUrl(url) || isVimeoUrl(url);
};

/**
 * Get embed URL for a video
 */
export const getVideoEmbedUrl = (url: string): string | null => {
  if (isYouTubeUrl(url)) {
    const videoId = getYouTubeVideoId(url);
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
  }

  if (isVimeoUrl(url)) {
    const videoId = getVimeoVideoId(url);
    if (videoId) {
      return `https://player.vimeo.com/video/${videoId}`;
    }
  }

  return null;
};
