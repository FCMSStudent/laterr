import { useState, useEffect, useRef } from 'react';
import ColorThief from 'colorthief';

/**
 * Hook to extract the dominant color from an image URL.
 * Returns an RGB color string that can be used in CSS.
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

        setIsLoading(true);
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        imgRef.current = img;

        img.onload = () => {
            try {
                const colorThief = new ColorThief();
                const dominantColor = colorThief.getColor(img);
                if (dominantColor) {
                    setColor(`rgb(${dominantColor[0]}, ${dominantColor[1]}, ${dominantColor[2]})`);
                }
            } catch (error) {
                // Fallback to null if color extraction fails (e.g., CORS issues)
                setColor(null);
            } finally {
                setIsLoading(false);
            }
        };

        img.onerror = () => {
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
