import type { IExecuteFunctions, IHttpRequestMethods } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { MarkdownProcessor } from './markdown-processor';
import type { DocumentCreationResult, DocumentUpdateResult, GoogleDocsRequest } from './types';

export class GoogleDocsAPI {
	private static addTabIdToRequests(
		requests: GoogleDocsRequest[],
		tabId: string,
	): GoogleDocsRequest[] {
		return requests.map((req) => {
			const r = { ...req };
			if (r.insertText) {
				r.insertText = { ...r.insertText };
				if (r.insertText.location)
					r.insertText.location = { ...r.insertText.location, tabId };
				if (r.insertText.endOfSegmentLocation)
					r.insertText.endOfSegmentLocation = { ...r.insertText.endOfSegmentLocation, tabId };
			}
			if (r.updateTextStyle)
				r.updateTextStyle = { ...r.updateTextStyle, range: { ...r.updateTextStyle.range, tabId } };
			if (r.updateParagraphStyle)
				r.updateParagraphStyle = {
					...r.updateParagraphStyle,
					range: { ...r.updateParagraphStyle.range, tabId },
				};
			if (r.deleteContentRange)
				r.deleteContentRange = {
					...r.deleteContentRange,
					range: { ...r.deleteContentRange.range, tabId },
				};
			if (r.createParagraphBullets)
				r.createParagraphBullets = {
					...r.createParagraphBullets,
					range: { ...r.createParagraphBullets.range, tabId },
				};
			if (r.deleteParagraphBullets)
				r.deleteParagraphBullets = {
					...r.deleteParagraphBullets,
					range: { ...r.deleteParagraphBullets.range, tabId },
				};
			if (r.insertTable) {
				r.insertTable = { ...r.insertTable };
				if (r.insertTable.location)
					r.insertTable.location = { ...r.insertTable.location, tabId };
				if (r.insertTable.endOfSegmentLocation)
					r.insertTable.endOfSegmentLocation = {
						...r.insertTable.endOfSegmentLocation,
						tabId,
					};
			}
			if (r.insertInlineImage) {
				r.insertInlineImage = { ...r.insertInlineImage };
				if (r.insertInlineImage.location)
					r.insertInlineImage.location = { ...r.insertInlineImage.location, tabId };
				if (r.insertInlineImage.endOfSegmentLocation)
					r.insertInlineImage.endOfSegmentLocation = {
						...r.insertInlineImage.endOfSegmentLocation,
						tabId,
					};
			}
			if (r.updateTableCellStyle)
				r.updateTableCellStyle = {
					...r.updateTableCellStyle,
					tableRange: {
						...r.updateTableCellStyle.tableRange,
						tableCellLocation: {
							...r.updateTableCellStyle.tableRange.tableCellLocation,
							tableStartLocation: {
								...r.updateTableCellStyle.tableRange.tableCellLocation.tableStartLocation,
								tabId,
							},
						},
					},
				};
			if (r.insertPageBreak)
				r.insertPageBreak = {
					...r.insertPageBreak,
					location: { ...r.insertPageBreak.location, tabId },
				};
			return r;
		});
	}

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
		pageBreakStrategy?: string,
		customPageBreakText?: string,
		parsePlaceholderMarkdown: boolean = false,
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
						qs: {
							includeItemsFromAllDrives: true,
							supportsAllDrives: true,
						},
					},
				);
				documentId = copyResponse.id;

				// Step 2: Replace placeholders.
				// Phase 2a — plain text swap via replaceAllText. Handles every placeholder when
				// the markdown toggle is off, and the no-block-markdown subset when it's on.
				// Phase 2b — for placeholders with block-level markdown values (only when the
				// toggle is on), walk the doc, collect every occurrence, then issue a single
				// batchUpdate in reverse-index order so earlier indices stay valid as later
				// edits land.
				if (placeholderData && Object.keys(placeholderData).length > 0) {
					const plainRequests: GoogleDocsRequest[] = [];
					const markdownKeys: Array<{ token: string; value: string }> = [];

					for (const key in placeholderData) {
						if (!Object.prototype.hasOwnProperty.call(placeholderData, key)) continue;
						const token = `{{${key}}}`;
						if (token === mainContentPlaceholder) continue;

						const rawValue = String(placeholderData[key]);
						const isMarkdown =
							parsePlaceholderMarkdown && MarkdownProcessor.hasBlockMarkdown(rawValue);

						if (isMarkdown) {
							markdownKeys.push({ token, value: rawValue });
						} else {
							plainRequests.push({
								replaceAllText: {
									containsText: { text: token, matchCase: false },
									replaceText: rawValue,
								},
							});
						}
					}

					// Phase 2a
					if (plainRequests.length > 0) {
						await executeFunctions.helpers.httpRequestWithAuthentication.call(
							executeFunctions,
							'googleDocsOAuth2Api',
							{
								method: 'POST' as IHttpRequestMethods,
								url: `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
								body: { requests: plainRequests },
							},
						);
					}

					// Phase 2b — reverse-order walk for markdown-bound placeholders.
					if (markdownKeys.length > 0) {
						const doc = await executeFunctions.helpers.httpRequestWithAuthentication.call(
							executeFunctions,
							'googleDocsOAuth2Api',
							{
								method: 'GET' as IHttpRequestMethods,
								url: `https://docs.googleapis.com/v1/documents/${documentId}?fields=body.content`,
							},
						);

						type Occurrence = { startIndex: number; length: number; value: string };
						const occurrences: Occurrence[] = [];

						if (doc.body && doc.body.content) {
							for (const element of doc.body.content) {
								if (!element.paragraph) continue;
								for (const run of element.paragraph.elements) {
									if (!run.textRun || typeof run.textRun.content !== 'string') continue;
									const runStart = run.startIndex || 0;
									const runText: string = run.textRun.content;
									const runTextLower = runText.toLowerCase();

									for (const { token, value } of markdownKeys) {
										const tokenLower = token.toLowerCase();
										let searchFrom = 0;
										while (true) {
											const hit = runTextLower.indexOf(tokenLower, searchFrom);
											if (hit === -1) break;
											occurrences.push({
												startIndex: runStart + hit,
												length: token.length,
												value,
											});
											searchFrom = hit + token.length;
										}
									}
								}
							}
						}

						if (occurrences.length > 0) {
							occurrences.sort((a, b) => b.startIndex - a.startIndex);

							const markdownRequests: GoogleDocsRequest[] = [];
							for (const occ of occurrences) {
								markdownRequests.push({
									deleteContentRange: {
										range: {
											startIndex: occ.startIndex,
											endIndex: occ.startIndex + occ.length,
										},
									},
								});

								const conversion = MarkdownProcessor.convertMarkdownToApiRequests(
									occ.value,
									'',
									'single',
									occ.startIndex,
								);
								markdownRequests.push(...conversion.batchUpdateRequest.requests);
							}

							await executeFunctions.helpers.httpRequestWithAuthentication.call(
								executeFunctions,
								'googleDocsOAuth2Api',
								{
									method: 'POST' as IHttpRequestMethods,
									url: `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
									body: { requests: markdownRequests },
								},
							);
						}
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
								qs: {
									includeItemsFromAllDrives: true,
									supportsAllDrives: true,
								},
								headers: {
									'Content-Type': 'application/json',
								},
							},
						);
					documentId = documentResponse.id;
					executeFunctions.logger.info('Document created successfully using Google Drive API');
				} catch (error) {
					// Enhanced error logging for debugging
					console.log('=== DOCUMENT CREATION ERROR ===');
					console.log('Error message:', error.message);
					console.log('HTTP Status:', error.response?.status);
					console.log('Status Text:', error.response?.statusText);
					console.log('Error Code:', error.response?.data?.error?.code);
					console.log('Google API Error:', error.response?.data?.error?.message);
					console.log('Full error data:', JSON.stringify(error.response?.data, null, 2));
					console.log('folderId:', folderId);
					console.log('driveId:', driveId);
					console.log('===============================');

					executeFunctions.logger.error('Document creation failed:', {
						error: error.message,
						status: error.response?.status,
						statusText: error.response?.statusText,
						errorCode: error.response?.data?.error?.code,
						errorMessage: error.response?.data?.error?.message,
						folderId,
						driveId,
					});

					// Provide specific error messages based on the error type
					if (error.response?.status === 404) {
						throw new NodeOperationError(
							executeFunctions.getNode(),
							`Folder with ID "${folderId}" was not found. Please verify the folder exists and you have access to it. If this is a Shared Drive folder, ensure you have the correct permissions.`,
						);
					} else if (error.response?.status === 403) {
						throw new NodeOperationError(
							executeFunctions.getNode(),
							`Permission denied when creating document in folder "${folderId}". Please check your Google Drive permissions for this folder.`,
						);
					} else {
						throw new NodeOperationError(executeFunctions.getNode(), error);
					}
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
								includeItemsFromAllDrives: true,
								supportsAllDrives: true,
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
					pageBreakStrategy,
					customPageBreakText,
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

	static async updateGoogleDocsDocument(
		executeFunctions: IExecuteFunctions,
		documentId: string,
		markdownInput: string,
		updateMode: 'append' | 'overwrite' | 'insertAt',
		insertIndex?: number,
		tabId?: string,
		newTabTitle?: string,
	): Promise<DocumentUpdateResult> {
		try {
			if (!markdownInput.trim()) {
				throw new NodeOperationError(
					executeFunctions.getNode(),
					'Markdown input is required for the Update Existing Document operation.',
				);
			}

			let resolvedTabId = tabId;

			if (tabId === '__new_tab__') {
				const tabsResp = await executeFunctions.helpers.httpRequestWithAuthentication.call(
					executeFunctions,
					'googleDocsOAuth2Api',
					{
						method: 'GET' as IHttpRequestMethods,
						url: `https://docs.googleapis.com/v1/documents/${documentId}`,
						qs: { fields: 'tabs.tabProperties' },
						headers: { 'X-Goog-Docs-Features': 'tab' },
					},
				);

				const existingTitles = new Set<string>();
				if (tabsResp?.tabs && Array.isArray(tabsResp.tabs)) {
					for (const tab of tabsResp.tabs) {
						if (tab.tabProperties?.title) existingTitles.add(tab.tabProperties.title as string);
					}
				}

				let candidate = newTabTitle || `New Tab ${existingTitles.size + 1}`;
				let suffix = 2;
				while (existingTitles.has(candidate)) {
					candidate = `${newTabTitle || 'New Tab'} ${suffix++}`;
				}

				const createTabResp = await executeFunctions.helpers.httpRequestWithAuthentication.call(
					executeFunctions,
					'googleDocsOAuth2Api',
					{
						method: 'POST' as IHttpRequestMethods,
						url: `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
						body: {
							requests: [{ addDocumentTab: { tabProperties: { title: candidate } } }],
						},
						headers: { 'X-Goog-Docs-Features': 'tab' },
					},
				);
				resolvedTabId = createTabResp?.replies?.[0]?.addDocumentTab?.tabProperties
					?.tabId as string | undefined;
				if (!resolvedTabId) {
					throw new NodeOperationError(
						executeFunctions.getNode(),
						'Failed to create new tab. The Google Docs API did not return a tab ID.',
					);
				}
			}

			const baseHeaders: Record<string, string> = {};
			if (resolvedTabId) {
				baseHeaders['X-Goog-Docs-Features'] = 'tab';
			}

			let insertAt: number;

			if (updateMode === 'append' || updateMode === 'overwrite') {
				const getQs: Record<string, string | boolean> = resolvedTabId
					? { fields: 'tabs.tabProperties,tabs.documentTab.body.content', includeTabsContent: true }
					: { fields: 'body.content' };

				const doc = await executeFunctions.helpers.httpRequestWithAuthentication.call(
					executeFunctions,
					'googleDocsOAuth2Api',
					{
						method: 'GET' as IHttpRequestMethods,
						url: `https://docs.googleapis.com/v1/documents/${documentId}`,
						qs: getQs,
						headers: baseHeaders,
					},
				);

				let content;
				if (resolvedTabId) {
					const targetTab = (doc.tabs as any[])?.find(
						(t: any) => t.tabProperties?.tabId === resolvedTabId,
					);
					content = targetTab?.documentTab?.body?.content;
				} else {
					content = doc.body?.content;
				}
				if (!content || content.length === 0) {
					throw new NodeOperationError(
						executeFunctions.getNode(),
						'Could not read document content. Verify the document exists and you have edit access.',
					);
				}

				const lastElement = content[content.length - 1];
				const endIndex = lastElement.endIndex as number | undefined;
				if (typeof endIndex !== 'number' || !Number.isFinite(endIndex)) {
					throw new NodeOperationError(
						executeFunctions.getNode(),
						'Could not determine document end index. The document structure may be unexpected.',
					);
				}

				if (updateMode === 'overwrite') {
					const clearRequests: GoogleDocsRequest[] = [];

					if (endIndex > 2) {
						clearRequests.push({
							deleteContentRange: {
								range: {
									startIndex: 1,
									endIndex: endIndex - 1,
									...(resolvedTabId ? { tabId: resolvedTabId } : {}),
								},
							},
						});
						clearRequests.push({
							updateParagraphStyle: {
								range: {
									startIndex: 1,
									endIndex: 2,
									...(resolvedTabId ? { tabId: resolvedTabId } : {}),
								},
								paragraphStyle: { namedStyleType: 'NORMAL_TEXT' },
								fields: 'namedStyleType',
							},
						});
					}

					await executeFunctions.helpers.httpRequestWithAuthentication.call(
						executeFunctions,
						'googleDocsOAuth2Api',
						{
							method: 'POST' as IHttpRequestMethods,
							url: `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
							body: { requests: clearRequests },
							headers: baseHeaders,
						},
					);

					insertAt = 1;
				} else {
					insertAt = Math.max(1, endIndex - 1);
				}
			} else {
				insertAt = insertIndex ?? 1;
			}

			const apiRequests = MarkdownProcessor.convertMarkdownToApiRequests(
				markdownInput,
				'',
				'single',
				insertAt,
			);

			if (apiRequests.batchUpdateRequest.requests.length > 0) {
				const requests = resolvedTabId
					? GoogleDocsAPI.addTabIdToRequests(apiRequests.batchUpdateRequest.requests, resolvedTabId)
					: apiRequests.batchUpdateRequest.requests;

				await executeFunctions.helpers.httpRequestWithAuthentication.call(
					executeFunctions,
					'googleDocsOAuth2Api',
					{
						method: 'POST' as IHttpRequestMethods,
						url: `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
						body: { requests },
						headers: baseHeaders,
					},
				);
			}

			return {
				success: true,
				documentId,
				documentUrl: `https://docs.google.com/document/d/${documentId}/edit`,
				updateMode,
				insertAt,
				...(resolvedTabId ? { tabId: resolvedTabId } : {}),
				message: `Document updated successfully (mode: ${updateMode}, insertAt: ${insertAt}).`,
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
						includeItemsFromAllDrives: true,
						supportsAllDrives: true,
					},
				},
			);
			// Test Google Shared Drives access
			const sharedDrivesResponse =
				await executeFunctions.helpers.httpRequestWithAuthentication.call(
					executeFunctions,
					'googleDocsOAuth2Api',
					{
						method: 'GET' as IHttpRequestMethods,
						url: 'https://www.googleapis.com/drive/v3/drives',
						qs: {
							pageSize: 1,
							fields: 'drives(name,id)',
							includeItemsFromAllDrives: true,
							supportsAllDrives: true,
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
						includeItemsFromAllDrives: true,
						supportsAllDrives: true,
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
						includeItemsFromAllDrives: true,
						supportsAllDrives: true,
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
						folderAccess: foldersResponse.files?.length ? true : false,
						sharedDrivesAccess: sharedDrivesResponse.drives?.length ? true : false,
						documentsFound: docsResponse.files?.length || 0,
						foldersFound: foldersResponse.files?.length || 0,
						sharedDrivesFound: sharedDrivesResponse.drives?.length || 0,
					},
					scopes: [
						'https://www.googleapis.com/auth/documents',
						'https://www.googleapis.com/auth/drive',
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
