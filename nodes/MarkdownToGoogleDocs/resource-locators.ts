import type {
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodeListSearchItems,
	IHttpRequestMethods,
	IDataObject,
} from 'n8n-workflow';

function extractRLCValue(param: unknown): string {
	if (!param) return '';
	if (typeof param !== 'object') return String(param);
	const p = param as Record<string, unknown>;
	const rawValue = (p.value as string) || '';
	if (p.mode === 'url' && rawValue) {
		let m = /[?&/]folders\/([a-zA-Z0-9_-]+)/.exec(rawValue);
		if (m) return m[1];
		m = /\/document\/d\/([a-zA-Z0-9_-]+)/.exec(rawValue);
		if (m) return m[1];
	}
	return rawValue;
}

export const resourceLocatorMethods = {
	async getDrives(
		this: ILoadOptionsFunctions,
		filter?: string,
		paginationToken?: string,
	): Promise<INodeListSearchResult> {
		try {
			const results: INodeListSearchItems[] = [
				{
					name: 'My Drive',
					value: 'My Drive',
				},
				{
					name: 'Shared with Me',
					value: 'sharedWithMe',
				},
			];

			const response = await this.helpers.httpRequestWithAuthentication.call(
				this,
				'googleDocsOAuth2Api',
				{
					method: 'GET' as IHttpRequestMethods,
					url: 'https://www.googleapis.com/drive/v3/drives',
					qs: {
						pageSize: 100,
						useDomainAdminAccess: false, // Include organizational drives
					},
				},
			);

			if (response?.drives && Array.isArray(response.drives)) {
				for (const drive of response.drives) {
					if (drive.name && drive.id) {
						const driveItem = {
							name: drive.name as string,
							value: drive.id as string,
							url: `https://drive.google.com/drive/folders/${drive.id}`,
						};

						if (!filter || driveItem.name.toLowerCase().includes(filter.toLowerCase())) {
							results.push(driveItem);
						}
					}
				}
			}

			return {
				results: filter
					? results.filter((item) => item.name.toLowerCase().includes(filter.toLowerCase()))
					: results,
				paginationToken: response?.nextPageToken,
			};
		} catch (error) {
			// Return default options if there's an error
			return {
				results: [
					{
						name: 'My Drive',
						value: 'My Drive',
					},
					{
						name: 'Shared with Me',
						value: 'sharedWithMe',
					},
				],
			};
		}
	},

	async getFolders(
		this: ILoadOptionsFunctions,
		filter?: string,
		paginationToken?: string,
	): Promise<INodeListSearchResult> {
		try {
			const results: INodeListSearchItems[] =[];


			// Simple driveId parameter handling
			let driveId = 'My Drive';
			try {
				const driveParam = this.getNodeParameter('driveId', 0);
				driveId = extractRLCValue(driveParam) || 'My Drive';
			} catch {
				// Use default if parameter not available
			}

			const qs: IDataObject = {
				q: `mimeType = 'application/vnd.google-apps.folder'`,
				pageSize: 100,
				fields: 'files(id,name)',
				pageToken: paginationToken,
			};

			// Simple drive type handling
			if (driveId === 'sharedWithMe') {
				qs.q += ' and sharedWithMe = true';
			} else if (driveId && driveId !== 'My Drive') {
				qs.driveId = driveId;
				qs.corpora = "drive";
				qs.includeItemsFromAllDrives = true;
				qs.supportsAllDrives = true;
			}

			if (filter) {
				qs.q += ` and name contains '${filter.replace("'", "\\'")}'`;
			}

			const response = await this.helpers.httpRequestWithAuthentication.call(
				this,
				'googleDocsOAuth2Api',
				{
					method: 'GET' as IHttpRequestMethods,
					url: 'https://www.googleapis.com/drive/v3/files',
					qs,
				},
			);

			if (driveId === 'My Drive') {
				results.push({
					name: '/ (Root)',
					value: 'root',
				});
			}

			if (response?.files && Array.isArray(response.files)) {
				for (const folder of response.files) {
					if (folder.name && folder.id) {
						results.push({
							name: folder.name as string,
							value: folder.id as string,
							url: `https://drive.google.com/drive/folders/${folder.id}`,
						});
					}
				}
			}

			return {
				results,
				paginationToken: response?.nextPageToken,
			};
		} catch (error) {
			// Return root folder if there's an error
			return {
				results: [
					{
						name: '/ (Root)',
						value: 'root',
					},
				],
			};
		}
	},

	async getTemplateDocuments(
		this: ILoadOptionsFunctions,
		filter?: string,
		paginationToken?: string,
	): Promise<INodeListSearchResult> {
		try {
			const results: INodeListSearchItems[] = [];

			let folderId = '';
			try {
				const folderParam = this.getNodeParameter(
					'additionalOptions.templateSettings.values.templateFolderId',
					0,
				);
				folderId = extractRLCValue(folderParam);
			} catch (error) {
				// No folder selected, return empty results
				return { results: [] };
			}

			if (!folderId) {
				return { results: [] };
			}

			const qs: IDataObject = {
				q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.document' and trashed=false`,
				pageSize: 100,
				fields: 'files(id,name)',
				pageToken: paginationToken,
				includeItemsFromAllDrives: true,
				supportsAllDrives: true,
			};

			if (filter) {
				qs.q += ` and name contains '${filter.replace("'", "\\'")}'`;
			}

			const response = await this.helpers.httpRequestWithAuthentication.call(
				this,
				'googleDocsOAuth2Api',
				{
					method: 'GET' as IHttpRequestMethods,
					url: 'https://www.googleapis.com/drive/v3/files',
					qs,
				},
			);

			if (response?.files && Array.isArray(response.files)) {
				for (const doc of response.files) {
					if (doc.name && doc.id) {
						results.push({
							name: doc.name as string,
							value: doc.id as string,
							url: `https://docs.google.com/document/d/${doc.id}/edit`,
						});
					}
				}
			}

			return {
				results,
				paginationToken: response?.nextPageToken,
			};
		} catch (error) {
			return { results: [] };
		}
	},

	async getDocumentTabs(
		this: ILoadOptionsFunctions,
		filter?: string,
		_paginationToken?: string,
	): Promise<INodeListSearchResult> {
		const createNewTabItem = { name: 'Create New Tab', value: '__new_tab__' };

		try {
			let documentId = '';
			try {
				const docParam = this.getNodeParameter('updateDocumentId', 0);
				documentId = extractRLCValue(docParam);
			} catch {
				return { results: [createNewTabItem] };
			}

			if (!documentId) {
				return { results: [createNewTabItem] };
			}

			const response = await this.helpers.httpRequestWithAuthentication.call(
				this,
				'googleDocsOAuth2Api',
				{
					method: 'GET' as IHttpRequestMethods,
					url: `https://docs.googleapis.com/v1/documents/${documentId}`,
					qs: { fields: 'tabs.tabProperties' },
					headers: { 'X-Goog-Docs-Features': 'tab' },
				},
			);

			const results = [createNewTabItem];

			if (response?.tabs && Array.isArray(response.tabs)) {
				for (const tab of response.tabs) {
					const props = tab.tabProperties;
					if (props?.tabId) {
						const name = (props.title as string) || `Tab ${(props.index as number) + 1}`;
						if (!filter || name.toLowerCase().includes(filter.toLowerCase())) {
							results.push({ name, value: props.tabId as string });
						}
					}
				}
			}

			return { results };
		} catch {
			return { results: [createNewTabItem] };
		}
	},

	async getDocuments(
		this: ILoadOptionsFunctions,
		filter?: string,
		paginationToken?: string,
	): Promise<INodeListSearchResult> {
		try {
			const results: INodeListSearchItems[] = [];

			const qs: IDataObject = {
				q: `mimeType='application/vnd.google-apps.document' and trashed=false`,
				pageSize: 100,
				fields: 'files(id,name,modifiedTime)',
				orderBy: 'modifiedTime desc',
				pageToken: paginationToken,
				corpora: 'allDrives',
				supportsAllDrives: true,
				includeItemsFromAllDrives: true,
			};

			if (filter) {
				qs.q += ` and name contains '${filter.replace("'", "\\'")}'`;
			}

			const response = await this.helpers.httpRequestWithAuthentication.call(
				this,
				'googleDocsOAuth2Api',
				{
					method: 'GET' as IHttpRequestMethods,
					url: 'https://www.googleapis.com/drive/v3/files',
					qs,
				},
			);

			if (response?.files && Array.isArray(response.files)) {
				for (const doc of response.files) {
					if (doc.name && doc.id) {
						results.push({
							name: doc.name as string,
							value: doc.id as string,
							url: `https://docs.google.com/document/d/${doc.id}/edit`,
						});
					}
				}
			}

			return {
				results,
				paginationToken: response?.nextPageToken,
			};
		} catch (error) {
			return { results: [] };
		}
	},
};
