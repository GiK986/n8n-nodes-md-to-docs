import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';

import { nodeProperties } from './node-properties';
import { resourceLocatorMethods } from './resource-locators';
import { MarkdownProcessor } from './markdown-processor';
import { GoogleDocsAPI } from './google-docs-api';

export class MarkdownToGoogleDocs implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Markdown to Google Docs',
		name: 'markdownToGoogleDocs',
		icon: 'file:markdownToGoogleDocs.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Transform Markdown content into Google Docs API requests',
		defaults: {
			name: 'Markdown to Google Docs',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'googleDocsOAuth2Api',
				required: true,
			},
		],
		requestDefaults: {
			headers: {
				Accept: 'application/json',
			},
		},
		properties: nodeProperties,
	};

	methods = {
		listSearch: resourceLocatorMethods,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const operation = this.getNodeParameter('operation', itemIndex) as string;

				// Only get markdown and title parameters for operations that need them
				let markdownInput = '';
				let documentTitle = '';

				if (operation !== 'testCredentials') {
					markdownInput = this.getNodeParameter('markdownInput', itemIndex) as string;
					documentTitle = this.getNodeParameter('documentTitle', itemIndex) as string;

					// Markdown input is required for all operations except testCredentials
					if (!markdownInput.trim()) {
						throw new NodeOperationError(this.getNode(), 'Markdown input is required', {
							itemIndex,
						});
					}
				}

				let result: any;

				switch (operation) {
					case 'convertToApiRequests':
						const outputFormat = this.getNodeParameter('outputFormat', itemIndex) as string;
						result = MarkdownProcessor.convertMarkdownToApiRequests(
							markdownInput,
							documentTitle,
							outputFormat,
						);
						break;

					case 'createDocument':
						const driveParam = this.getNodeParameter('driveId', itemIndex) as any;
						const folderParam = this.getNodeParameter('folderId', itemIndex) as any;

						const driveId =
							typeof driveParam === 'object' ? driveParam.value : driveParam || 'My Drive';
						const folderId =
							typeof folderParam === 'object' ? folderParam.value : folderParam || 'root';
						const folderName =
							typeof folderParam === 'object' ? folderParam.name : folderParam === 'root'	? 'My Drive' : folderParam;

						result = await GoogleDocsAPI.createGoogleDocsDocumentWithAPI(
							this,
							markdownInput,
							documentTitle,
							driveId,
							folderId,
							folderName,
						);
						break;

					case 'testCredentials':
						result = await GoogleDocsAPI.testCredentials(this);
						break;

					default:
						throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, {
							itemIndex,
						});
				}

				returnData.push({
					json: result,
					pairedItem: { item: itemIndex },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error.message },
						pairedItem: { item: itemIndex },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
