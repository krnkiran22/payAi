import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
export class OcrService {
    static async performOcr(filePath) {
        try {
            // Preprocess image for better OCR
            const processedPath = path.join(path.dirname(filePath), `processed_${path.basename(filePath)}`);
            await sharp(filePath)
                .grayscale()
                .normalize()
                // .threshold() // Optional: can improve or worsen depending on image quality
                .toFile(processedPath);
            const worker = await createWorker('eng');
            const { data: { text } } = await worker.recognize(processedPath);
            await worker.terminate();
            // Clean up processed file
            try {
                await fs.unlink(processedPath);
            }
            catch (e) {
                console.error('Failed to delete temp processed file', e);
            }
            return text.trim();
        }
        catch (error) {
            console.error('OCR Error:', error);
            throw new Error('Failed to extract text from document');
        }
    }
}
