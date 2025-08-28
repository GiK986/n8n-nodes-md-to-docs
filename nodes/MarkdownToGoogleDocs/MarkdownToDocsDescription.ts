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
				name: 'Export Google Doc',
				value: 'exportGoogleDoc',
				description: 'Export a Google Docs document to various formats',
				action: 'Export google docs document to different formats',
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

const documentTitleProperty: INodeProperties = {
	displayName: 'Document Title',
	name: 'documentTitle',
	type: 'string',
	default: 'Untitled Document',
	description: 'Title for the Google Docs document',
	displayOptions: {
		hide: {
			operation: ['testCredentials', 'exportGoogleDoc'],
		},
	},
};

const markdownInputProperty: INodeProperties = {
	displayName: 'Markdown Input',
	name: 'markdownInput',
	type: 'string',
	typeOptions: {
		rows: 4,
	},
	default: '',
	description: 'The Markdown content to convert or inject',
	placeholder: '# My Document...',
	displayOptions: {
		show: {
			operation: ['createDocument', 'convertToApiRequests'],
		},
		hide: {
			operation: ['testCredentials', 'exportGoogleDoc'],
		},
	},
};

const markdownInputNotice: INodeProperties = {
	displayName:
		"Warning: The 'Markdown Input' field is empty. This may cause an error if it is required for your selected options.",
	name: 'markdownInputNotice',
	type: 'notice',
	default: undefined,
	displayOptions: {
		show: {
			operation: ['createDocument', 'convertToApiRequests'],
			markdownInput: [''],
		},
	},
};

const additionalOptions: INodeProperties = {
	displayName: 'Additional Options',
	name: 'additionalOptions',
	type: 'collection',
	placeholder: 'Add Options',
	default: {},
	options: [
		// Option 1: Template Group
		{
			displayName: 'Template Settings',
			name: 'templateSettings',
			type: 'fixedCollection',
			default: {},
			placeholder: 'Template Settings',
			typeOptions: {
				multipleValues: false,
			},
			options: [
				{
					name: 'values',
					displayName: 'Values',
					values: [
						{
							displayName: 'Template Folder',
							name: 'templateFolderId',
							type: 'resourceLocator',
							default: { mode: 'list', value: '' },
							required: true,
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
						{
							displayName: 'Placeholders',
							name: 'placeholders',
							type: 'collection',
							placeholder: 'Add Placeholders',
							default: {},
							options: [
								// Option 2: Placeholders Group
								{
									displayName: 'Placeholder Settings',
									name: 'placeholderSettings',
									type: 'fixedCollection',
									default: {},
									placeholder: 'Placeholder Settings',
									typeOptions: {
										multipleValues: false,
									},
									options: [
										{
											name: 'values',
											displayName: 'Values',
											values: [
												{
													displayName: 'Placeholder Data (JSON)',
													name: 'placeholderData',
													type: 'json',
													default: '{}',
													description: 'A JSON object of key-value pairs for placeholders',
													hint: `e.g. { "placeholderName": "placeholderValue", "Date": "{{ $now.format('yyyy-MM-dd') }}" }`,
												},
												{
													displayName: 'Use Markdown Input',
													name: 'useMarkdownInput',
													type: 'boolean',
													default: true,
													description: 'Whether to use the Markdown Input field content',
												},
												{
													displayName: 'Main Content Placeholder',
													name: 'mainContentPlaceholder',
													type: 'string',
													default: '{{MainContent}}',
													description: 'The placeholder to be replaced by the Markdown content',
													displayOptions: {
														show: {
															useMarkdownInput: [true],
														},
													},
												},
											],
										},
									],
								},
							],
						},
					],
				},
			],
		},
		// Page Break Settings
		{
			displayName: 'Page Break Settings',
			name: 'pageBreakSettings',
			type: 'fixedCollection',
			default: {},
			placeholder: 'Add Page Break Settings',
			typeOptions: {
				multipleValues: false,
			},
			options: [
				{
					name: 'values',
					displayName: 'Values',
					values: [
						{
							displayName: 'Page Break Strategy',
							name: 'pageBreakStrategy',
							type: 'options',
							default: 'h2',
							options: [
								{
									name: 'Before H1 Headings',
									value: 'h1',
									description: 'Add page break before each H1 heading (except first)',
								},
								{
									name: 'Before H2 Headings',
									value: 'h2',
									description: 'Add page break before each H2 heading',
								},
								{
									name: 'Custom Text Replacement',
									value: 'custom',
									description: 'Replace custom text markers with page breaks',
								},
							],
							description: 'Strategy for inserting page breaks in the document',
						},
						{
							displayName: 'Custom Page Break Text',
							name: 'customPageBreakText',
							type: 'string',
							default: '<!-- pagebreak -->',
							placeholder: 'e.g. <!-- pagebreak --> or ---pagebreak---',
							displayOptions: {
								show: {
									pageBreakStrategy: ['custom'],
								},
							},
							description: 'Custom text that will be replaced with page breaks',
						},
					],
				},
			],
		},
	],
	displayOptions: {
		show: {
			operation: ['createDocument', 'convertToApiRequests'],
		},
	},
};

// Common properties for createDocument and convertToApiRequests operations
const commonProperties: INodeProperties[] = [
	documentTitleProperty,
	markdownInputProperty,
	markdownInputNotice,
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

// Properties for exportGoogleDoc operation
const exportGoogleDocOperation: INodeProperties[] = [
	{
		displayName: 'Document',
		name: 'documentId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: {
			show: {
				operation: ['exportGoogleDoc'],
			},
		},
		modes: [
			{
				displayName: 'Document',
				name: 'list',
				type: 'list',
				placeholder: 'Select a document...',
				typeOptions: {
					searchListMethod: 'getDocuments',
					searchable: true,
				},
			},
			{
				displayName: 'Link',
				name: 'url',
				type: 'string',
				placeholder: 'e.g. https://docs.google.com/document/d/195j9eDD3ccgjQRttHhYymF12r86v_EVYb-2G_9oPaAC/edit',
				extractValue: {
					type: 'regex',
					regex: /(?:https?:\/\/)?(?:www\.)?docs\.google\.com\/document\/d\/([a-zA-Z0-9-_]+)/,
				},
				validation: [
					{
						type: 'regex',
						properties: {
							regex: /(?:https?:\/\/)?(?:www\.)?docs\.google\.com\/document\/d\/([a-zA-Z0-9-_]+)/,
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
		description: 'The Google Docs document to export',
	},
	{
		displayName: 'Export Format',
		name: 'exportFormat',
		type: 'options',
		options: [
			{
				name: 'Markdown',
				value: 'text/markdown',
				description: 'Export as Markdown (.md)',
			},
			{
				name: 'PDF',
				value: 'application/pdf',
				description: 'Export as PDF (.pdf)',
			},
			{
				name: 'Plain Text',
				value: 'text/plain',
				description: 'Export as plain text (.txt)',
			},
		],
		default: 'text/markdown',
		displayOptions: {
			show: {
				operation: ['exportGoogleDoc'],
			},
		},
		description: 'The format to export the document to',
	},
	{
		displayName: 'Output File Name',
		name: 'outputFileName',
		type: 'string',
		default: '',
		placeholder: 'e.g. my-document (optional - uses document title if empty)',
		displayOptions: {
			show: {
				operation: ['exportGoogleDoc'],
			},
		},
		description: 'Custom filename for the exported file (optional - will use document title if empty)',
	},
	{
		displayName: 'Output Options',
		name: 'outputOptions',
		type: 'collection',
		placeholder: 'Add Output Options',
		default: {},
		displayOptions: {
			show: {
				operation: ['exportGoogleDoc'],
			},
		},
		options: [
			{
				displayName: 'Save to Google Drive Folder',
				name: 'targetFolderId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
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
						placeholder: 'e.g. https://drive.google.com/drive/folders/1Tx9WHbA3wBpPB4C_HcoZDH9WZFWYxAMU',
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
				description: 'Save the exported file to this Google Drive folder (optional)',
			},
		],
	},
];

// Properties for createDocument operation
const createDocumentOperation: INodeProperties[] = [
	// Group 1: Core Document Details
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
];


export const markdownToDocsFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                        convertToApiRequests Operation                      */
	/* -------------------------------------------------------------------------- */
	...convertToApiRequestsOperation,

	/* -------------------------------------------------------------------------- */
	/*                          createDocument Operation                          */
	/* -------------------------------------------------------------------------- */
	...createDocumentOperation,

	/* -------------------------------------------------------------------------- */
	/*                         exportGoogleDoc Operation                          */
	/* -------------------------------------------------------------------------- */
	...exportGoogleDocOperation,

	/* -------------------------------------------------------------------------- */
	/*                            Common Properties                               */
	/* -------------------------------------------------------------------------- */
	...commonProperties,

	/* -------------------------------------------------------------------------- */
	/*                        Additional Options                                  */
	/* -------------------------------------------------------------------------- */
	additionalOptions,

];
