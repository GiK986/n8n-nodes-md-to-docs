import type { IExecuteFunctions, IHttpRequestMethods } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { MarkdownProcessor } from './markdown-processor';
import type { DocumentCreationResult } from './types';
import type { GoogleDocsRequest } from './types';

export class GoogleDocsAPI {
	static async createGoogleDocsDocumentWithAPI(
		executeFunctions: IExecuteFunctions,
		markdownInput: string,
		documentTitle: string,
		driveId: string,
		folderId: string,
		folderName?: string,
		templateDocumentId?: string,
		placeholderData?: any,
		mainContentPlaceholder?: string,
	): Promise<DocumentCreationResult> {
		try {
			let documentId: string;
			let markdownInsertIndex = 1;

			if (templateDocumentId) {
				// Step 1: Copy the template
				const copyResponse = await executeFunctions.helpers.httpRequestWithAuthentication.call(
					executeFunctions,
					'googleDocsOAuth2Api',
					{
						method: 'POST' as IHttpRequestMethods,
						url: `https://www.googleapis.com/drive/v3/files/${templateDocumentId}/copy`,
						body: { name: documentTitle, parents: [folderId] },
					},
				);
				documentId = copyResponse.id;

				// Step 2: Replace simple placeholders in a dedicated batch
				if (placeholderData && Object.keys(placeholderData).length > 0) {
					const placeholderRequests: GoogleDocsRequest[] = [];
					for (const key in placeholderData) {
						if (
							Object.prototype.hasOwnProperty.call(placeholderData, key) &&
							`{{${key}}}` !== mainContentPlaceholder
						) {
							placeholderRequests.push({
								replaceAllText: {
									containsText: { text: `{{${key}}}`, matchCase: false },
									replaceText: String(placeholderData[key]),
								},
							});
						}
					}
					if (placeholderRequests.length > 0) {
						await executeFunctions.helpers.httpRequestWithAuthentication.call(
							executeFunctions,
							'googleDocsOAuth2Api',
							{
								method: 'POST' as IHttpRequestMethods,
								url: `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
								body: { requests: placeholderRequests },
							},
						);
					}
				}

				// Step 3: Prepare the body for Markdown content in a second, separate batch
				const contentRequests: GoogleDocsRequest[] = [];
				if (mainContentPlaceholder && mainContentPlaceholder.trim() !== '') {
					// Case A: Inject Markdown at a specific placeholder
					const doc = await executeFunctions.helpers.httpRequestWithAuthentication.call(
						executeFunctions,
						'googleDocsOAuth2Api',
						{
							method: 'GET' as IHttpRequestMethods,
							url: `https://docs.googleapis.com/v1/documents/${documentId}?fields=body.content`,
						},
					);
					let placeholderFound = false;
					if (doc.body && doc.body.content) {
						for (const element of doc.body.content) {
							if (element.paragraph) {
								for (const run of element.paragraph.elements) {
									if (run.textRun && run.textRun.content.includes(mainContentPlaceholder)) {
										const placeholderStartIndex =
											(run.startIndex || 0) + run.textRun.content.indexOf(mainContentPlaceholder);
										contentRequests.push({
											deleteContentRange: {
												range: {
													startIndex: placeholderStartIndex,
													endIndex: placeholderStartIndex + mainContentPlaceholder.length,
												},
											},
										});
										markdownInsertIndex = placeholderStartIndex;
										placeholderFound = true;
										break;
									}
								}
							}
							if (placeholderFound) break;
						}
					}
					if (!placeholderFound) {
						throw new NodeOperationError(
							executeFunctions.getNode(),
							'Placeholder not found in document. Please verify that the placeholder name matches between your template document and the parameter settings.',
						);
					}
				} else if (mainContentPlaceholder !== undefined) {
					// Case B: Clear the entire body
					const doc = await executeFunctions.helpers.httpRequestWithAuthentication.call(
						executeFunctions,
						'googleDocsOAuth2Api',
						{
							method: 'GET' as IHttpRequestMethods,
							url: `https://docs.googleapis.com/v1/documents/${documentId}?fields=body.content`,
						},
					);
					const content = doc.body.content;
					if (content && content.length > 1) {
						// Check for more than just start/end markers
						const lastElement = content[content.length - 1];
						if (lastElement.endIndex > 1) {
							contentRequests.push({
								deleteContentRange: {
									range: { startIndex: 1, endIndex: lastElement.endIndex - 1 },
								},
							});
						}
					}
				}

				if (contentRequests.length > 0) {
					await executeFunctions.helpers.httpRequestWithAuthentication.call(
						executeFunctions,
						'googleDocsOAuth2Api',
						{
							method: 'POST' as IHttpRequestMethods,
							url: `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
							body: { requests: contentRequests },
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

			// Step 3: Convert markdown and add content (if markdown is provided)
			if (markdownInput && markdownInput.trim()) {
				const apiRequests = MarkdownProcessor.convertMarkdownToApiRequests(
					markdownInput,
					'',
					'single',
					markdownInsertIndex,
				);

				if (apiRequests.batchUpdateRequest.requests.length > 0) {
					await executeFunctions.helpers.httpRequestWithAuthentication.call(
						executeFunctions,
						'googleDocsOAuth2Api',
						{
							method: 'POST' as IHttpRequestMethods,
							url: `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
							body: apiRequests.batchUpdateRequest,
						},
					);
				}
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
