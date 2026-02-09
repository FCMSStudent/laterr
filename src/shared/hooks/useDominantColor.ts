import { useState, useEffect, useRef } from 'react';
import ColorThief from 'colorthief';

// Simple in-memory cache for dominant colors to avoid redundant processing
// Limited to 100 entries to prevent memory leaks
const MAX_CACHE_SIZE = 100;
const colorCache = new Map<string, string | null>();

/**
 * Hook to extract the dominant color from an image URL.
 * Returns an RGB color string that can be used in CSS.
 * Optimized with an internal cache to prevent redundant extractions for same URLs.
 */
export function useDominantColor(imageUrl: string | null | undefined) {
    const [color, setColor] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const imgRef = useRef<HTMLImageElement | null>(null);

    useEffect(() => {
        if (!imageUrl) {
            setColor(null);
            return;
        }

        // Check cache first
        if (colorCache.has(imageUrl)) {
            setColor(colorCache.get(imageUrl)!);
            return;
        }

        setIsLoading(true);
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        imgRef.current = img;

        img.onload = () => {
            try {
                const colorThief = new ColorThief();
                const dominantColor = colorThief.getColor(img);
                if (dominantColor) {
                    const colorStr = `rgb(${dominantColor[0]}, ${dominantColor[1]}, ${dominantColor[2]})`;

                    // Maintain cache size
                    if (colorCache.size >= MAX_CACHE_SIZE) {
                        const firstKey = colorCache.keys().next().value;
                        if (firstKey) colorCache.delete(firstKey);
                    }

                    colorCache.set(imageUrl, colorStr);
                    setColor(colorStr);
                } else {
                    colorCache.set(imageUrl, null);
                    setColor(null);
                }
            } catch (error) {
                // Fallback to null if color extraction fails (e.g., CORS issues)
                colorCache.set(imageUrl, null);
                setColor(null);
            } finally {
                setIsLoading(false);
            }
        };

        img.onerror = () => {
            colorCache.set(imageUrl, null);
            setColor(null);
            setIsLoading(false);
        };

        img.src = imageUrl;

        return () => {
            imgRef.current = null;
        };
    }, [imageUrl]);

    return { color, isLoading };
}
