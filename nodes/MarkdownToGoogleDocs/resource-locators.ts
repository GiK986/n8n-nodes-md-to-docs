import type {
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodeListSearchItems,
	IHttpRequestMethods,
	IDataObject,
} from 'n8n-workflow';

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
						pageSize: 200,
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
			const results: INodeListSearchItems[] = [
				{
					name: '/ (Root)',
					value: 'root',
				},
			];

			// Simple driveId parameter handling
			let driveId = 'My Drive';
			try {
				const driveParam = this.getNodeParameter('driveId', 0);
				if (driveParam && typeof driveParam === 'object' && 'value' in driveParam) {
					driveId = (driveParam as any).value;
				} else if (typeof driveParam === 'string') {
					driveId = driveParam;
				}
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
				const folderParam = this.getNodeParameter('templateFolderId', 0);
				if (folderParam && typeof folderParam === 'object' && 'value' in folderParam) {
					folderId = (folderParam as any).value;
				} else if (typeof folderParam === 'string') {
					folderId = folderParam;
				}
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
