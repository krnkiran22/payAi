import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

export class OcrService {
    static async performOcr(filePath: string): Promise<string> {
        try {
            // Preprocess image for better OCR
            const processedPath = path.join(path.dirname(filePath), `processed_${path.basename(filePath)}`);

            await sharp(filePath)
                .resize({ width: 2000, withoutEnlargement: true }) // Upscale if small for better OCR
                .grayscale()
                .normalize()
                .sharpen()
                .threshold(180) // Convert to high-contrast black/white
                .toFile(processedPath);

            const worker = await createWorker('eng');
            const { data: { text } } = await worker.recognize(processedPath);
            await worker.terminate();

            // Clean up processed file
            try {
                await fs.unlink(processedPath);
            } catch (e) {
                console.error('Failed to delete temp processed file', e);
            }

            return text.trim();
        } catch (error) {
            console.error('OCR Error:', error);
            throw new Error('Failed to extract text from document');
        }
    }

    // PDF handling would go here using a lib like pdf-img-convert or similar
    // For MVP, we'll assume images.
}
