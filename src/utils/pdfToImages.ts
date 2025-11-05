import * as pdfjsLib from 'pdfjs-dist';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface PDFToImagesOptions {
  scale?: number;
  format?: 'png' | 'jpeg';
  quality?: number;
}

export const convertPDFToImages = async (
  pdfUrl: string,
  options: PDFToImagesOptions = {},
  onProgress?: (current: number, total: number) => void
): Promise<string[]> => {
  const { scale = 2.0, format = 'png', quality = 0.95 } = options;
  
  try {
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;
    
    const numPages = pdf.numPages;
    const images: string[] = [];
    
    // Convert each page to an image
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      
      // Get viewport at desired scale
      const viewport = page.getViewport({ scale });
      
      // Create canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Failed to get canvas context');
      }
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Render PDF page to canvas
      // @ts-ignore - pdfjs types require canvas property but it's not needed
      const renderTask = page.render({
        canvasContext: context,
        viewport: viewport,
      });
      
      await renderTask.promise;
      
      // Convert canvas to base64 image
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const imageData = canvas.toDataURL(mimeType, quality);
      images.push(imageData);
      
      // Report progress
      if (onProgress) {
        onProgress(pageNum, numPages);
      }
    }
    
    return images;
  } catch (error) {
    console.error('Error converting PDF to images:', error);
    throw error;
  }
};
