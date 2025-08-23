import type { IExecuteFunctions, IHttpRequestMethods } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { DocumentExportResult } from './types';

export class GoogleDocsExporter {
	static async exportGoogleDoc(
		executeFunctions: IExecuteFunctions,
		documentId: string,
		exportFormat: string,
		outputFileName?: string,
		outputOptions?: any,
	): Promise<DocumentExportResult> {
		try {
			// First, get document metadata to retrieve title
			const docMetadata = await executeFunctions.helpers.httpRequestWithAuthentication.call(
				executeFunctions,
				'googleDocsOAuth2Api',
				{
					method: 'GET' as IHttpRequestMethods,
					url: `https://www.googleapis.com/drive/v3/files/${documentId}`,
					qs: {
						fields: 'name,size',
					},
				},
			);

			const documentTitle = docMetadata.name;

			// Export the document using Drive API
			const exportResponse = await executeFunctions.helpers.httpRequestWithAuthentication.call(
				executeFunctions,
				'googleDocsOAuth2Api',
				{
					method: 'GET' as IHttpRequestMethods,
					url: `https://www.googleapis.com/drive/v3/files/${documentId}/export`,
					qs: {
						mimeType: exportFormat,
					},
					encoding: exportFormat.includes('text/') ? 'text' : 'arraybuffer',
					returnFullResponse: true,
				},
			);

			// Determine output mode automatically based on format
			let outputMode: 'content' | 'binary' | 'drive';
			if (exportFormat === 'application/pdf') {
				outputMode = 'binary';
			} else {
				outputMode = 'content'; // text/markdown, text/plain
			}

			// Check if user wants to also save to Google Drive (if targetFolderId is provided)
			const targetFolderId = outputOptions?.targetFolderId;
			const saveToGoogleDrive = targetFolderId && (typeof targetFolderId === 'object' ? targetFolderId.value : targetFolderId);

			// Determine file extension based on MIME type
			const fileExtensions: { [key: string]: string } = {
				'text/markdown': 'md',
				'application/pdf': 'pdf',
				'text/plain': 'txt',
			};

			const fileExtension = fileExtensions[exportFormat] || 'bin';
			
			// Use document title if no custom filename provided or if it's empty
			let fileName: string;
			if (outputFileName && outputFileName.trim()) {
				fileName = outputFileName.trim();
			} else {
				fileName = documentTitle.replace(/[^\p{L}\p{N}\s-]/gu, '').trim();
			}
			
			const fullFileName = `${fileName}.${fileExtension}`;

			// Get content and size
			const content = exportResponse.body;
			const contentLength = exportResponse.headers['content-length'];
			const fileSizeBytes = contentLength ? parseInt(contentLength, 10) : Buffer.byteLength(content);

			let result: DocumentExportResult = {
				success: true,
				documentId,
				documentTitle,
				exportFormat,
				fileName: fullFileName,
				mimeType: exportFormat,
				fileExtension,
				fileSizeBytes,
				outputMode,
				message: `Document "${documentTitle}" exported successfully as ${fileExtension.toUpperCase()} (${this.formatFileSize(fileSizeBytes)})`,
			};

			// Handle Google Drive save (optional, regardless of output mode)
			if (saveToGoogleDrive) {
				// Save to Google Drive using multipart upload
				const targetFolder = typeof targetFolderId === 'object' ? targetFolderId.value : targetFolderId || 'root';
				
				// First create the file metadata
				const metadata = {
					name: fullFileName,
					...(targetFolder !== 'root' ? { parents: [targetFolder] } : {}),
				};

				// Create file with metadata first
				const createResponse = await executeFunctions.helpers.httpRequestWithAuthentication.call(
					executeFunctions,
					'googleDocsOAuth2Api',
					{
						method: 'POST' as IHttpRequestMethods,
						url: 'https://www.googleapis.com/drive/v3/files',
						body: metadata,
					},
				);

				// Then upload the content
				await executeFunctions.helpers.httpRequestWithAuthentication.call(
					executeFunctions,
					'googleDocsOAuth2Api',
					{
						method: 'PATCH' as IHttpRequestMethods,
						url: `https://www.googleapis.com/upload/drive/v3/files/${createResponse.id}?uploadType=media`,
						headers: {
							'Content-Type': exportFormat,
						},
						body: content,
					},
				);

				result.savedFileId = createResponse.id;
				result.savedFileUrl = `https://drive.google.com/file/d/${createResponse.id}/view`;
				result.targetFolderId = targetFolder;
				result.message += ` and saved to Google Drive as "${fullFileName}"`;
			}

			// Set content based on output mode (only if NOT saving to Drive)
			if (!saveToGoogleDrive) {
				if (outputMode === 'binary') {
					result.content = content; // Will be handled as binary data by main node
				} else if (outputMode === 'content') {
					result.content = content; // Text content
				}
			}

			return result;
		} catch (error) {
			if (error.response?.status === 404) {
				throw new NodeOperationError(
					executeFunctions.getNode(),
					`Document with ID "${documentId}" not found. Please verify the document ID and ensure you have access to it.`,
				);
			} else if (error.response?.status === 403) {
				throw new NodeOperationError(
					executeFunctions.getNode(),
					`Access denied to document "${documentId}". Please ensure you have read permissions for this document.`,
				);
			} else if (error.response?.status === 400) {
				throw new NodeOperationError(
					executeFunctions.getNode(),
					`Invalid export format "${exportFormat}" for this document type.`,
				);
			}

			throw new NodeOperationError(
				executeFunctions.getNode(),
				`Failed to export document: ${error.response?.data?.error?.message || error.message}`,
			);
		}
	}

	private static formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}
}