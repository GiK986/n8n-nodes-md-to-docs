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
		templateDocumentId?: string,
	): Promise<DocumentCreationResult> {
		try {
			let documentId: string;

			if (templateDocumentId) {
				// Use template
				const copyResponse = await executeFunctions.helpers.httpRequestWithAuthentication.call(
					executeFunctions,
					'googleDocsOAuth2Api',
					{
						method: 'POST' as IHttpRequestMethods,
						url: `https://www.googleapis.com/drive/v3/files/${templateDocumentId}/copy`,
						body: {
							name: documentTitle,
							parents: [folderId],
						},
						headers: {
							'Content-Type': 'application/json',
						},
					},
				);
				documentId = copyResponse.id;

				// Clear the copied document's body
				const doc = await executeFunctions.helpers.httpRequestWithAuthentication.call(
					executeFunctions,
					'googleDocsOAuth2Api',
					{
						method: 'GET' as IHttpRequestMethods,
						url: `https://docs.googleapis.com/v1/documents/${documentId}`,
					},
				);

				const content = doc.body.content;
				if (content && content.length > 2) {
					const requests = [
						{
							deleteContentRange: {
								range: {
									startIndex: 1,
									endIndex: content[content.length - 1].endIndex - 1,
								},
							},
						},
					];

					await executeFunctions.helpers.httpRequestWithAuthentication.call(
						executeFunctions,
						'googleDocsOAuth2Api',
						{
							method: 'POST' as IHttpRequestMethods,
							url: `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
							body: { requests },
							headers: {
								'Content-Type': 'application/json',
							},
						},
					);
				}
			} else {
				// Create a new blank document
				try {
					const createDocumentRequest = {
						name: documentTitle,
						mimeType: 'application/vnd.google-apps.document',
						...(folderId && folderId !== 'root' ? { parents: [folderId] } : {}),
					};

					const documentResponse =
						await executeFunctions.helpers.httpRequestWithAuthentication.call(
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
				} catch (error) {
					throw new NodeOperationError(executeFunctions.getNode(), error);
				}
			}

			let finalFolderName = folderName || 'My Drive';

			if (!folderName && folderId !== 'root') {
				try {
					// Try to get folder name via API
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
				} catch (folderError) {
					executeFunctions.logger.warn('Could not fetch folder name, using folder ID:', {
						folderId,
						error: folderError.message,
					});
					finalFolderName = folderId; // Fallback to folder ID
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
			throw new NodeOperationError(executeFunctions.getNode(), error);
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
