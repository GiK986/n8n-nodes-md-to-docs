import type { INodeProperties } from 'n8n-workflow';
import { GOOGLE_DOC_URL_REGEX, GOOGLE_DRIVE_FOLDER_URL_REGEX } from './types';

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
				name: 'Update Existing Document',
				value: 'updateDocument',
				description: 'Append, overwrite, or insert Markdown content into an existing Google Doc',
				action: 'Update an existing google docs document',
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
			operation: ['testCredentials', 'exportGoogleDoc', 'updateDocument'],
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
			operation: ['createDocument', 'convertToApiRequests', 'updateDocument'],
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
			operation: ['createDocument', 'convertToApiRequests', 'updateDocument'],
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
										regex: GOOGLE_DOC_URL_REGEX,
									},
									validation: [
										{
											type: 'regex',
											properties: {
												regex: GOOGLE_DOC_URL_REGEX,
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
													displayName: 'Main Content Placeholder',
													name: 'mainContentPlaceholder',
													type: 'string',
													default: '{{MainContent}}',
													description:
														'The exact token in your template (e.g. `{{MainContent}}`) that will be replaced by the parsed Markdown Input. The token must sit on its own line in the template — its containing paragraph is replaced by the rendered markdown blocks.',
													displayOptions: {
														show: {
															useMarkdownInput: [true],
														},
													},
												},
												{
													displayName: 'Parse Placeholder Values As Markdown',
													name: 'parsePlaceholderMarkdown',
													type: 'boolean',
													default: false,
													description:
														'Whether placeholder values containing block-level markdown should be rendered as formatted Google Docs content. Block-level means a value with a newline, or one that starts with a heading (`#`), list (`-`, `*`, `1.`), blockquote (`>`), table (`|`), or code fence (```` ``` ````). Single-line values without those markers — including ones with only inline markdown like `**bold**` or `[link](URL)` — are still inserted as literal text via a direct text swap, so they stay inside their surrounding paragraph. Off keeps every value as a literal text swap (the original behavior).',
												},
												{
													displayName: 'Placeholder Data (JSON)',
													name: 'placeholderData',
													type: 'json',
													default: '{}',
													description:
														'A JSON object of key-value pairs for placeholders. By default every value is inserted as literal text (e.g. `**Acme**` will show the asterisks). Enable "Parse Placeholder Values As Markdown" below to render block-level markdown (headings, lists, tables, multi-line content) as formatted Google Docs.',
													hint: `e.g. { "placeholderName": "placeholderValue", "Date": "{{ $now.format('yyyy-MM-dd') }}" }`,
												},
												{
													displayName: 'Use Markdown Input',
													name: 'useMarkdownInput',
													type: 'boolean',
													default: true,
													description:
														'Whether the Markdown Input field above should be parsed and injected into the template at the Main Content Placeholder position below. This is independent of the per-placeholder markdown setting above — Main Content always uses the full markdown pipeline.',
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
				placeholder:
					'e.g. https://docs.google.com/document/d/195j9eDD3ccgjQRttHhYymF12r86v_EVYb-2G_9oPaAC/edit',
				extractValue: {
					type: 'regex',
					regex: GOOGLE_DOC_URL_REGEX,
				},
				validation: [
					{
						type: 'regex',
						properties: {
							regex: GOOGLE_DOC_URL_REGEX,
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
		description:
			'Custom filename for the exported file (optional - will use document title if empty)',
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

// Properties for updateDocument operation
const updateDocumentOperation: INodeProperties[] = [
	{
		displayName: 'Document',
		name: 'updateDocumentId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: {
			show: {
				operation: ['updateDocument'],
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
				placeholder:
					'e.g. https://docs.google.com/document/d/195j9eDD3ccgjQRttHhYymF12r86v_EVYb-2G_9oPaAC/edit',
				extractValue: {
					type: 'regex',
					regex: GOOGLE_DOC_URL_REGEX,
				},
				validation: [
					{
						type: 'regex',
						properties: {
							regex: GOOGLE_DOC_URL_REGEX,
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
		description: 'The Google Docs document to update',
	},
	{
		displayName: 'Update Mode',
		name: 'updateMode',
		type: 'options',
		default: 'append',
		displayOptions: {
			show: {
				operation: ['updateDocument'],
			},
		},
		options: [
			{
				name: 'Append to End',
				value: 'append',
				description: 'Add content after the last character of the document',
			},
			{
				name: 'Overwrite Entire Document',
				value: 'overwrite',
				description: 'Clear all existing content and formatting, then write fresh',
			},
			{
				name: 'Insert After Section Heading',
				value: 'insertAfterHeading',
				description: 'Insert content at the end of a named section, before the next heading',
			},
			{
				name: 'Insert at Index',
				value: 'insertAt',
				description: 'Insert content at a specific character position (advanced)',
			},
		],
		description: 'How to write the Markdown content into the existing document',
	},
	{
		displayName: 'Section Heading',
		name: 'sectionHeading',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['updateDocument'],
				updateMode: ['insertAfterHeading'],
			},
		},
		description:
			'The text of the heading to search for (case-insensitive). Content is inserted at the end of that section — after the last paragraph before the next heading of the same or higher level.',
		placeholder: 'e.g. Meeting Notes',
	},
	{
		displayName: 'Start Index',
		name: 'insertIndex',
		type: 'number',
		default: 1,
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				operation: ['updateDocument'],
				updateMode: ['insertAt'],
			},
		},
		description:
			'The 1-based character position in the document body where content will be inserted. Warning: this index becomes invalid if the document content changes between workflow runs.',
		hint: 'Use the Google Docs API or Convert to API Requests operation to find the correct index.',
	},
	{
		displayName: 'Update Options',
		name: 'updateOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: ['updateDocument'],
			},
		},
		options: [
			{
				displayName: 'New Tab Title',
				name: 'newTabTitle',
				type: 'string',
				default: '',
				placeholder: 'e.g. Meeting Notes',
				description:
					'Title for the new tab when "+ Create New Tab" is selected. If empty, a unique name is auto-generated (e.g. "New Tab 2").',
			},
			{
				displayName: 'Tab',
				name: 'updateTabId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				description:
					'The tab to write content to. Choose "+ Create New Tab", select an existing tab, or enter a tab ID. Leave empty to use the default (first) tab.',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a tab or create a new one...',
						typeOptions: {
							searchListMethod: 'getDocumentTabs',
							searchable: true,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'e.g. t.0',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '.+',
									errorMessage: 'Tab ID cannot be empty when using ID mode',
								},
							},
						],
					},
				],
			},
		],
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
	/*                         updateDocument Operation                           */
	/* -------------------------------------------------------------------------- */
	...updateDocumentOperation,

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
