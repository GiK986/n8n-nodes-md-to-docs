import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { markdownToDocsFields, markdownToDocsOperations } from './MarkdownToDocsDescription';
import { resourceLocatorMethods } from './resource-locators';
import { MarkdownProcessor } from './markdown-processor';
import { GoogleDocsAPI } from './google-docs-api';
import { IAdditionalOptions } from './types';

class MarkdownToGoogleDocs implements INodeType {
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
		properties: [...markdownToDocsOperations, ...markdownToDocsFields],
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
					markdownInput = this.getNodeParameter('markdownInput', itemIndex, '') as string;
					documentTitle = this.getNodeParameter('documentTitle', itemIndex) as string;
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

						const additionalOptions = this.getNodeParameter(
							'additionalOptions',
							itemIndex,
							{},
						) as IAdditionalOptions;

						const useTemplate = additionalOptions.templateSettings !== undefined;
						const usePlaceholders =
							useTemplate &&
							additionalOptions.templateSettings?.values.placeholders?.placeholderSettings !==
								undefined;

						// By default, we assume markdown input should be used.
						let useMarkdownInput = true;
						// It should only NOT be used if the user explicitly disables it in the placeholder settings.
						if (usePlaceholders) {
							useMarkdownInput =
								additionalOptions.templateSettings!.values.placeholders!.placeholderSettings!.values
									.useMarkdownInput !== false;
						}

						// Markdown input validation based on new structure
						if (!markdownInput.trim()) {
							// Only throw error if markdown is actually needed
							if (useMarkdownInput) {
								throw new NodeOperationError(this.getNode(), 'Markdown input is required', {
									itemIndex,
								});
							}
						}

						let templateDocumentId: string | undefined;
						if (useTemplate) {
							const templateDocumentParam = additionalOptions.templateSettings!.values
								.templateDocumentId as any;
							templateDocumentId =
								typeof templateDocumentParam === 'object' && templateDocumentParam.value
									? templateDocumentParam.value
									: templateDocumentParam;
						}

						let placeholderData: string | object | undefined;
						let mainContentPlaceholder: string | undefined;

						if (usePlaceholders) {
							placeholderData =
								additionalOptions.templateSettings!.values.placeholders!.placeholderSettings!.values
									.placeholderData;
							mainContentPlaceholder =
								additionalOptions.templateSettings!.values.placeholders!.placeholderSettings!.values
									.mainContentPlaceholder;

							if (typeof placeholderData === 'string') {
								try {
									placeholderData = JSON.parse(placeholderData);
								} catch (error) {
									throw new NodeOperationError(
										this.getNode(),
										`Invalid JSON in Placeholder Data: ${error.message}`,
										{ itemIndex },
									);
								}
							}
						}

						const driveId =
							typeof driveParam === 'object' ? driveParam.value : driveParam || 'My Drive';
						const folderId =
							typeof folderParam === 'object' ? folderParam.value : folderParam || 'root';
						const folderName =
							typeof folderParam === 'object'
								? folderParam.name
								: folderParam === 'root'
									? 'My Drive'
									: folderParam;

						result = await GoogleDocsAPI.createGoogleDocsDocumentWithAPI(
							this,
							useMarkdownInput ? markdownInput : '', // Pass markdown only if enabled
							documentTitle,
							driveId,
							folderId,
							folderName,
							useTemplate ? templateDocumentId : undefined,
							usePlaceholders ? placeholderData : undefined,
							usePlaceholders && useMarkdownInput ? mainContentPlaceholder : undefined,
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
					items.push({ json: this.getInputData(itemIndex)[0].json, error, pairedItem: itemIndex });
				} else {
					if (error.context) {
						error.context.itemIndex = itemIndex;
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
		}

		return [returnData];
	}
}

// Ensure proper CommonJS export for n8n
module.exports = { MarkdownToGoogleDocs };
