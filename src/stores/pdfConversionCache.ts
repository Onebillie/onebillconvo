// Cache for storing converted PDF images to avoid re-processing
interface PDFCache {
  images: string[];
  timestamp: number;
}

const pdfCache = new Map<string, PDFCache>();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export const getPDFFromCache = (url: string): string[] | null => {
  const cached = pdfCache.get(url);
  if (!cached) return null;
  
  // Check if cache is still valid
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    pdfCache.delete(url);
    return null;
  }
  
  return cached.images;
};

export const setPDFToCache = (url: string, images: string[]) => {
  pdfCache.set(url, {
    images,
    timestamp: Date.now(),
  });
};

export const clearPDFCache = (url?: string) => {
  if (url) {
    pdfCache.delete(url);
  } else {
    pdfCache.clear();
  }
};
