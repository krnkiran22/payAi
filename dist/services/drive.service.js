var _a;
import { google } from 'googleapis';
import fs from 'fs';
import { config } from '../config/envs.js';
export class DriveService {
    static getAuth() {
        const auth = new google.auth.GoogleAuth({
            keyFile: config.GOOGLE_SERVICE_ACCOUNT_JSON,
            scopes: ['https://www.googleapis.com/auth/drive'],
        });
        return auth;
    }
    static async getOrCreateFolder(folderName, parentId) {
        const q = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' ${parentId ? `and '${parentId}' in parents` : ''} and trashed=false`;
        const res = await this.drive.files.list({ q, fields: 'files(id, name)' });
        if (res.data.files && res.data.files.length > 0) {
            return res.data.files[0].id;
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
        return folder.data.id;
    }
    static async uploadFile(filePath, fileName, mimeType, parentFolderId) {
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
    static async setupDirectoryStructure(username, category, isPayment = false) {
        // 1. Root /Bills/
        const rootId = config.GOOGLE_DRIVE_ROOT_FOLDER_ID || await this.getOrCreateFolder('Bills');
        if (isPayment) {
            // /Bills/payment_proofs/username/
            const paymentProofsId = await this.getOrCreateFolder('payment_proofs', rootId);
            const userFolderId = await this.getOrCreateFolder(username, paymentProofsId);
            return userFolderId;
        }
        else {
            // /Bills/username/category/
            const userFolderId = await this.getOrCreateFolder(username, rootId);
            const categoryFolderId = await this.getOrCreateFolder(category, userFolderId);
            return categoryFolderId;
        }
    }
}
_a = DriveService;
DriveService.drive = google.drive({ version: 'v3', auth: _a.getAuth() });
