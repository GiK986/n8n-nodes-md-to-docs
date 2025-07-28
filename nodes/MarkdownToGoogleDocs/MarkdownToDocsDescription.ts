import type { INodeProperties } from 'n8n-workflow';
import { GOOGLE_DRIVE_FOLDER_URL_REGEX } from './types';

// Main operations for Markdown to Google Docs conversion
export const markdownToDocsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Create Document',
				value: 'createDocument',
				description: 'Directly create a Google Docs document',
				action: 'Directly create a google docs document',
			},
			{
				name: 'Convert to API Requests',
				value: 'convertToApiRequests',
				description: 'Convert Markdown to Google Docs API requests',
				action: 'Convert markdown to google docs api requests',
			},
			{
				name: 'Test API Permissions',
				value: 'testCredentials',
				description: 'Test Google API permissions required for document creation and folder access',
				action: 'Test google api permissions',
			},
		],
		default: 'createDocument',
	},
];

// Common properties for all operations
const commonProperties: INodeProperties[] = [
	{
		displayName: 'Markdown Input',
		name: 'markdownInput',
		type: 'string',
		typeOptions: {
			rows: 10,
		},
		default: '',
		required: true,
		description: 'The Markdown content to convert',
		placeholder: '# My Document\n\nThis is **bold** text with a [link](https://example.com).',
		displayOptions: {
			hide: {
				operation: ['testCredentials'],
			},
		},
	},
	{
		displayName: 'Document Title',
		name: 'documentTitle',
		type: 'string',
		default: 'Untitled Document',
		description: 'Title for the Google Docs document',
		displayOptions: {
			hide: {
				operation: ['testCredentials'],
			},
		},
	},
];

// Properties for convertToApiRequests operation
const convertToApiRequestsOperation: INodeProperties[] = [
	{
		displayName: 'Output Format',
		name: 'outputFormat',
		type: 'options',
		options: [
			{
				name: 'Single Request',
				value: 'single',
				description: 'Output as a single batchUpdate request',
			},
			{
				name: 'Multiple Requests',
				value: 'multiple',
				description: 'Output as separate API requests',
			},
		],
		default: 'single',
		displayOptions: {
			show: {
				operation: ['convertToApiRequests'],
			},
		},
	},
];

// Properties for createDocument operation
const createDocumentOperation: INodeProperties[] = [
	{
		displayName: 'Drive',
		name: 'driveId',
		type: 'resourceLocator',
		default: { mode: 'list', value: 'My Drive' },
		required: true,
		displayOptions: {
			show: {
				operation: ['createDocument'],
			},
		},
		modes: [
			{
				displayName: 'Drive',
				name: 'list',
				type: 'list',
				placeholder: 'Select a drive...',
				typeOptions: {
					searchListMethod: 'getDrives',
					searchable: true,
				},
			},
			{
				displayName: 'Link',
				name: 'url',
				type: 'string',
				placeholder: 'e.g. https://drive.google.com/drive/u/1/folders/0AIjtcbwnjtcbwn9PVA',
				extractValue: {
					type: 'regex',
					regex: GOOGLE_DRIVE_FOLDER_URL_REGEX,
				},
				validation: [
					{
						type: 'regex',
						properties: {
							regex: GOOGLE_DRIVE_FOLDER_URL_REGEX,
							errorMessage: 'Not a valid Google Drive URL',
						},
					},
				],
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				hint: 'The ID of the drive',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[a-zA-Z0-9\\-_]{2,}',
							errorMessage: 'Not a valid Google Drive ID',
						},
					},
				],
				url: '=https://drive.google.com/drive/folders/{{$value}}',
			},
		],
		description: 'The drive where to create the document',
	},
	{
		displayName: 'Folder',
		name: 'folderId',
		type: 'resourceLocator',
		default: { mode: 'list', value: 'root', cachedResultName: '/ (Root folder)' },
		required: true,
		displayOptions: {
			show: {
				operation: ['createDocument'],
			},
		},
		modes: [
			{
				displayName: 'Folder',
				name: 'list',
				type: 'list',
				placeholder: 'Select a folder...',
				typeOptions: {
					searchListMethod: 'getFolders',
					searchable: true,
				},
			},
			{
				displayName: 'Link',
				name: 'url',
				type: 'string',
				placeholder:
					'e.g. https://drive.google.com/drive/folders/1Tx9WHbA3wBpPB4C_HcoZDH9WZFWYxAMU',
				extractValue: {
					type: 'regex',
					regex: GOOGLE_DRIVE_FOLDER_URL_REGEX,
				},
				validation: [
					{
						type: 'regex',
						properties: {
							regex: GOOGLE_DRIVE_FOLDER_URL_REGEX,
							errorMessage: 'Not a valid Google Drive Folder URL',
						},
					},
				],
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. 1anGBg0b5re2VtF2bKu201_a-Vnz5BHq9Y4r-yBDAj5A',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[a-zA-Z0-9\\-_]{2,}',
							errorMessage: 'Not a valid Google Drive Folder ID',
						},
					},
				],
				url: '=https://drive.google.com/drive/folders/{{$value}}',
			},
		],
		description: 'The folder where to create the document',
	},
	{
		displayName: 'Use Template',
		name: 'useTemplate',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				operation: ['createDocument'],
			},
		},
		description: 'Whether to use a Google Docs template to create the document',
	},
	{
		displayName: 'Template Folder',
		name: 'templateFolderId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: {
			show: {
				operation: ['createDocument'],
				useTemplate: [true],
			},
		},
		modes: [
			{
				displayName: 'Folder',
				name: 'list',
				type: 'list',
				placeholder: 'Select a template folder...',
				typeOptions: {
					searchListMethod: 'getFolders',
					searchable: true,
				},
			},
			{
				displayName: 'Link',
				name: 'url',
				type: 'string',
				placeholder:
					'e.g. https://drive.google.com/drive/folders/1Tx9WHbA3wBpPB4C_HcoZDH9WZFWYxAMU',
				extractValue: {
					type: 'regex',
					regex: GOOGLE_DRIVE_FOLDER_URL_REGEX,
				},
				validation: [
					{
						type: 'regex',
						properties: {
							regex: GOOGLE_DRIVE_FOLDER_URL_REGEX,
							errorMessage: 'Not a valid Google Drive Folder URL',
						},
					},
				],
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. 1anGBg0b5re2VtF2bKu201_a-Vnz5BHq9Y4r-yBDAj5A',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[a-zA-Z0-9\\-_]{2,}',
							errorMessage: 'Not a valid Google Drive Folder ID',
						},
					},
				],
				url: '=https://drive.google.com/drive/folders/{{$value}}',
			},
		],
		description: 'The folder containing Google Docs templates',
	},
	{
		displayName: 'Template Document',
		name: 'templateDocumentId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: {
			show: {
				operation: ['createDocument'],
				useTemplate: [true],
			},
		},
		modes: [
			{
				displayName: 'Document',
				name: 'list',
				type: 'list',
				placeholder: 'Select a template document...',
				typeOptions: {
					searchListMethod: 'getTemplateDocuments',
					searchable: true,
				},
			},
			{
				displayName: 'Link',
				name: 'url',
				type: 'string',
				placeholder:
					'e.g. https://docs.google.com/document/d/195j9eDD3ccgjQRttHhYymF12r86v_EVYb-2G_9oPaAC/edit',
				extractValue: {
					type: 'regex',
					regex: GOOGLE_DRIVE_FOLDER_URL_REGEX, // Assuming template doc URL is similar to folder
				},
				validation: [
					{
						type: 'regex',
						properties: {
							regex: GOOGLE_DRIVE_FOLDER_URL_REGEX,
							errorMessage: 'Not a valid Google Doc URL',
						},
					},
				],
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. 195j9eDD3ccgjQRttHhYymF12r86v_EVYb-2G_9oPaAC',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[a-zA-Z0-9\\-_]{10,}',
							errorMessage: 'Not a valid Google Doc ID',
						},
					},
				],
				url: '=https://docs.google.com/document/d/{{$value}}/edit',
			},
		],
		description: 'The Google Docs template to use',
	},
];

// Properties for testCredentials operation
const testCredentialsOperation: INodeProperties[] = [
	// Currently no specific properties for test credentials operation
];

export const markdownToDocsFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                            Common Properties                               */
	/* -------------------------------------------------------------------------- */
	...commonProperties,

	/* -------------------------------------------------------------------------- */
	/*                        convertToApiRequests Operation                      */
	/* -------------------------------------------------------------------------- */
	...convertToApiRequestsOperation,

	/* -------------------------------------------------------------------------- */
	/*                          createDocument Operation                          */
	/* -------------------------------------------------------------------------- */
	...createDocumentOperation,

	/* -------------------------------------------------------------------------- */
	/*                         testCredentials Operation                          */
	/* -------------------------------------------------------------------------- */
	...testCredentialsOperation,
];
