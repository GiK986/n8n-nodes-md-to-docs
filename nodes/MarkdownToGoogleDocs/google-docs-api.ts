import type { IExecuteFunctions, IHttpRequestMethods } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { MarkdownProcessor } from './markdown-processor';
import type { DocumentCreationResult } from './types';

export class GoogleDocsAPI {
	static async createGoogleDocsDocumentWithAPI(
		executeFunctions: IExecuteFunctions,
		markdownInput: string,
		documentTitle: string,
		driveId: string,
		folderId: string,
		folderName?: string,
	): Promise<DocumentCreationResult> {
		try {
			// Try using Google Drive API first (more efficient), fallback to Docs API + move if it fails
			let documentId: string;

			try {
				// Method 1: Create document directly in folder using Google Drive API
				const createDocumentRequest = {
					name: documentTitle,
					mimeType: 'application/vnd.google-apps.document',
					...(folderId && folderId !== 'root' ? { parents: [folderId] } : {}),
				};

				const documentResponse = await executeFunctions.helpers.httpRequestWithAuthentication.call(
					executeFunctions,
					'googleDocsOAuth2Api',
					{
						method: 'POST' as IHttpRequestMethods,
						url: 'https://www.googleapis.com/drive/v3/files',
						body: createDocumentRequest,
						headers: {
							'Content-Type': 'application/json',
						},
					},
				);

				documentId = documentResponse.id;
				executeFunctions.logger.info('Document created successfully using Google Drive API');
			} catch (driveError) {
				executeFunctions.logger.warn('Drive API failed, falling back to Docs API + move:', {
					error: driveError.message,
					status: driveError.response?.status,
				});

				// Method 2: Fallback - Create with Docs API then move if needed
				const createDocumentRequest = {
					title: documentTitle,
				};

				const documentResponse = await executeFunctions.helpers.httpRequestWithAuthentication.call(
					executeFunctions,
					'googleDocsOAuth2Api',
					{
						method: 'POST' as IHttpRequestMethods,
						url: 'https://docs.googleapis.com/v1/documents',
						body: createDocumentRequest,
						headers: {
							'Content-Type': 'application/json',
						},
					},
				);

				documentId = documentResponse.documentId;

				// Move document to the specified folder (if not root)
				if (folderId !== 'root') {
					await executeFunctions.helpers.httpRequestWithAuthentication.call(
						executeFunctions,
						'googleDocsOAuth2Api',
						{
							method: 'PATCH' as IHttpRequestMethods,
							url: `https://www.googleapis.com/drive/v3/files/${documentId}`,
							body: {
								parents: [folderId],
							},
							headers: {
								'Content-Type': 'application/json',
							},
						},
					);
				}
				executeFunctions.logger.info('Document created using Docs API and moved to folder');
			}

			// Use provided folder name or fallback to fetching it
			let finalFolderName = folderName || 'My Drive';
			if (!folderName && folderId !== 'root') {
				try {
					// Try to get folder name via API (e.g., when folder was entered via URL or legacy data)
					const folderResponse = await executeFunctions.helpers.httpRequestWithAuthentication.call(
						executeFunctions,
						'googleDocsOAuth2Api',
						{
							method: 'GET' as IHttpRequestMethods,
							url: `https://www.googleapis.com/drive/v3/files/${folderId}`,
							qs: {
								fields: 'name',
							},
						},
					);
					finalFolderName = folderResponse.name;
					executeFunctions.logger.info('Fetched folder name via API:', {
						folderName: finalFolderName,
					});
				} catch (folderError) {
					executeFunctions.logger.warn('Could not fetch folder name, using folder ID:', {
						folderId,
						error: folderError.message,
					});
					finalFolderName = folderId; // Fallback to folder ID if name can't be retrieved
				}
			}

			// Step 2: Convert markdown and add content
			const apiRequests = MarkdownProcessor.convertMarkdownToApiRequests(
				markdownInput,
				'',
				'single',
			);

			if (apiRequests.batchUpdateRequest.requests.length > 0) {
				await executeFunctions.helpers.httpRequestWithAuthentication.call(
					executeFunctions,
					'googleDocsOAuth2Api',
					{
						method: 'POST' as IHttpRequestMethods,
						url: `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
						body: apiRequests.batchUpdateRequest,
						headers: {
							'Content-Type': 'application/json',
						},
					},
				);
			}

			return {
				success: true,
				documentId,
				documentUrl: `https://docs.google.com/document/d/${documentId}/edit`,
				title: documentTitle,
				driveId,
				folderId,
				folderName: finalFolderName,
				message: `Document "${documentTitle}" has been created in folder "${finalFolderName}".`,
			};
		} catch (error) {
			// More detailed error handling with better diagnostics
			if (error.response?.status === 403) {
				const errorDetails = error.response?.data?.error;
				let detailedMessage = `Failed to create Google Docs document: Access forbidden (403).\n\n`;

				if (errorDetails?.message) {
					detailedMessage += `API Error: ${errorDetails.message}\n\n`;
				}

				detailedMessage += `Debug info:\n`;
				detailedMessage += `• Document title: ${documentTitle}\n`;
				detailedMessage += `• Folder ID: ${folderId}\n`;
				detailedMessage += `• Drive ID: ${driveId}\n\n`;

				detailedMessage += `This error often occurs when:\n`;
				detailedMessage += `1. The folder ID doesn't exist or you don't have access to it\n`;
				detailedMessage += `2. Missing required OAuth2 scope: https://www.googleapis.com/auth/drive\n`;
				detailedMessage += `3. The current scope https://www.googleapis.com/auth/drive.file is too restrictive\n\n`;

				detailedMessage += `Required Google OAuth2 scopes:\n`;
				detailedMessage += `• https://www.googleapis.com/auth/documents\n`;
				detailedMessage += `• https://www.googleapis.com/auth/drive (instead of drive.file)\n\n`;
				detailedMessage += `Please check:\n`;
				detailedMessage += `1. Your OAuth2 credentials are properly configured\n`;
				detailedMessage += `2. The required scopes are enabled in your Google Cloud Console\n`;
				detailedMessage += `3. The folder ID is correct and accessible`;

				throw new NodeOperationError(executeFunctions.getNode(), detailedMessage);
			} else if (error.response?.status === 401) {
				throw new NodeOperationError(
					executeFunctions.getNode(),
					`Failed to create Google Docs document: Unauthorized (401).\nPlease reconnect your Google OAuth2 credentials or check if they have expired.`,
				);
			} else if (error.response?.status === 404) {
				throw new NodeOperationError(
					executeFunctions.getNode(),
					`Failed to create Google Docs document: Not Found (404).\nThe requested folder or drive may not exist or you don't have access to it.`,
				);
			} else {
				const errorMessage =
					error.response?.data?.error?.message ||
					error.message ||
					error.response?.statusText ||
					'Unknown error';
				const statusCode = error.response?.status || 'Unknown';
				throw new NodeOperationError(
					executeFunctions.getNode(),
					`Failed to create Google Docs document: ${errorMessage} (Status: ${statusCode})`,
				);
			}
		}
	}

	static async testCredentials(
		executeFunctions: IExecuteFunctions,
	): Promise<{ success: boolean; message: string; details?: any }> {
		try {
			// Test Google Drive API access and get user info
			const driveResponse = await executeFunctions.helpers.httpRequestWithAuthentication.call(
				executeFunctions,
				'googleDocsOAuth2Api',
				{
					method: 'GET' as IHttpRequestMethods,
					url: 'https://www.googleapis.com/drive/v3/about',
					qs: {
						fields: 'user,storageQuota',
					},
				},
			);

			// Test Google Docs API access by trying to list recent documents
			const docsResponse = await executeFunctions.helpers.httpRequestWithAuthentication.call(
				executeFunctions,
				'googleDocsOAuth2Api',
				{
					method: 'GET' as IHttpRequestMethods,
					url: 'https://www.googleapis.com/drive/v3/files',
					qs: {
						q: "mimeType='application/vnd.google-apps.document'",
						pageSize: 1,
						fields: 'files(id,name)',
					},
				},
			);

			// Test folder listing to verify Drive permissions
			const foldersResponse = await executeFunctions.helpers.httpRequestWithAuthentication.call(
				executeFunctions,
				'googleDocsOAuth2Api',
				{
					method: 'GET' as IHttpRequestMethods,
					url: 'https://www.googleapis.com/drive/v3/files',
					qs: {
						q: "mimeType='application/vnd.google-apps.folder'",
						pageSize: 1,
						fields: 'files(id,name)',
					},
				},
			);

			return {
				success: true,
				message: `✅ All Google API permissions are working correctly for ${driveResponse.user?.emailAddress || 'your account'}`,
				details: {
					user: driveResponse.user?.emailAddress || 'Unknown',
					permissions: {
						driveAccess: true,
						docsAccess: true,
						folderAccess: true,
						documentsFound: docsResponse.files?.length || 0,
						foldersFound: foldersResponse.files?.length || 0,
					},
					scopes: [
						'https://www.googleapis.com/auth/documents',
						'https://www.googleapis.com/auth/drive.file',
					],
					testTime: new Date().toISOString(),
				},
			};
		} catch (error) {
			let troubleshooting = [];

			if (error.response?.status === 403) {
				troubleshooting.push('Check if required OAuth2 scopes are enabled in Google Cloud Console');
				troubleshooting.push('Verify that Google Docs API and Google Drive API are enabled');
			} else if (error.response?.status === 401) {
				troubleshooting.push('Reconnect your Google OAuth2 credentials');
				troubleshooting.push('Check if credentials have expired');
			}

			return {
				success: false,
				message: `❌ API permissions test failed: ${error.response?.status || 'Unknown'} - ${error.response?.data?.error?.message || error.message}`,
				details: {
					status: error.response?.status,
					statusText: error.response?.statusText,
					errorCode: error.response?.data?.error?.code,
					errorMessage: error.response?.data?.error?.message,
					troubleshooting,
					testTime: new Date().toISOString(),
				},
			};
		}
	}
}
