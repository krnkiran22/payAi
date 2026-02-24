import { google } from 'googleapis';
import fs from 'fs';
import { config } from '../config/envs.js';

import { getGoogleAuth } from '../utils/auth.utils.js';

export class DriveService {
    private static _drive: any = null;

    private static get drive() {
        if (!this._drive) {
            try {
                this._drive = google.drive({ version: 'v3', auth: this.getAuth() });
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Unknown error';
                console.error(`❌ Failed to initialize Google Drive client: ${msg}`);
                throw new Error(`Google Drive setup failed: ${msg}`);
            }
        }
        return this._drive;
    }

    private static getAuth() {
        const credentials = getGoogleAuth();
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/drive'],
        });
        return auth;
    }

    static async getOrCreateFolder(folderName: string, parentId?: string): Promise<string> {
        const q = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' ${parentId ? `and '${parentId}' in parents` : ''} and trashed=false`;
        const res = await this.drive.files.list({ q, fields: 'files(id, name)' });

        if (res.data.files && res.data.files.length > 0) {
            return res.data.files[0].id!;
        }

        const fileMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: parentId ? [parentId] : [],
        };

        const folder = await this.drive.files.create({
            requestBody: fileMetadata,
            fields: 'id',
        });

        return folder.data.id!;
    }

    static async uploadFile(filePath: string, fileName: string, mimeType: string, parentFolderId: string) {
        const res = await this.drive.files.create({
            requestBody: {
                name: fileName,
                parents: [parentFolderId],
            },
            media: {
                mimeType: mimeType,
                body: fs.createReadStream(filePath),
            },
            fields: 'id, webViewLink',
        });

        return {
            id: res.data.id,
            webViewLink: res.data.webViewLink,
        };
    }

    static async setupDirectoryStructure(username: string, category: string, isPayment: boolean = false): Promise<string> {
        // 1. Root /Bills/
        const rootId = config.GOOGLE_DRIVE_ROOT_FOLDER_ID || await this.getOrCreateFolder('Bills');

        if (isPayment) {
            // /Bills/payment_proofs/username/
            const paymentProofsId = await this.getOrCreateFolder('payment_proofs', rootId);
            const userFolderId = await this.getOrCreateFolder(username, paymentProofsId);
            return userFolderId;
        } else {
            // /Bills/username/category/
            const userFolderId = await this.getOrCreateFolder(username, rootId);
            const categoryFolderId = await this.getOrCreateFolder(category, userFolderId);
            return categoryFolderId;
        }
    }
}
