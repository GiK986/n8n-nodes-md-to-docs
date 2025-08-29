// Google Drive folder URL regex pattern
export const GOOGLE_DRIVE_FOLDER_URL_REGEX =
	/(?:https?:\/\/)?(?:www\.)?drive\.google\.com\/drive\b.*[?&/]folders\/([a-zA-Z0-9-_]+)/;

export interface GoogleDocsRequest {
	insertText?: {
		location?: { index: number };
		endOfSegmentLocation?: { segmentId: string };
		text: string;
	};
	insertInlineImage?: {
		uri: string;
		location?: { index: number };
		endOfSegmentLocation?: { segmentId: string };
		objectSize?: {
			width?: {
				magnitude: number;
				unit: string;
			};
			height?: {
				magnitude: number;
				unit: string;
			};
		};
	};
	updateTextStyle?: {
		range: {
			startIndex: number;
			endIndex: number;
		};
		textStyle: TextStyle;
		fields: string;
	};
	updateParagraphStyle?: {
		range: {
			startIndex: number;
			endIndex: number;
		};
		paragraphStyle: {
			namedStyleType?: string;
			alignment?: string;
			bullet?: {
				listId: string;
				nestingLevel?: number;
			};
			indentFirstLine?: {
				magnitude: number;
				unit: string;
			};
			indentStart?: {
				magnitude: number;
				unit: string;
			};
			borderLeft?: {
				color: {
					color: {
						rgbColor: {
							red: number;
							green: number;
							blue: number;
						};
					};
				};
				width: {
					magnitude: number;
					unit: string;
				};
				dashStyle: string;
				padding: {
					magnitude: number;
					unit: string;
				};
			};
			borderBottom?: {
				color: {
					color: {
						rgbColor: {
							red: number;
							green: number;
							blue: number;
						};
					};
				};
				width: {
					magnitude: number;
					unit: string;
				};
				dashStyle: string;
				padding: {
					magnitude: number;
					unit: string;
				};
			};
			spaceAbove?: {
				magnitude: number;
				unit: string;
			};
			spaceBelow?: {
				magnitude: number;
				unit: string;
			};
		};
		fields: string;
	};
	createParagraphBullets?: {
		range: {
			startIndex: number;
			endIndex: number;
		};
		bulletPreset: string;
	};
	deleteParagraphBullets?: {
		range: {
			startIndex: number;
			endIndex: number;
		};
	};
	replaceAllText?: {
		replaceText: string;
		containsText: {
			text: string;
			matchCase: boolean;
		};
	};
	deleteContentRange?: {
		range: {
			startIndex: number;
			endIndex: number;
		};
	};
	insertTable?: {
		location?: { index: number };
		endOfSegmentLocation?: { segmentId: string };
		rows: number;
		columns: number;
	};
	insertPageBreak?: {
		location: { index: number };
	};
	updateTableCellStyle?: {
		tableRange: {
			tableCellLocation: {
				tableStartLocation: { index: number };
				rowIndex: number;
				columnIndex: number;
			};
			columnSpan?: number;
			rowSpan?: number;
		};
		tableCellStyle: {
			contentAlignment?: string;
		};
		fields: string;
	};
}

export interface IAdditionalOptions {
	templateSettings?: {
		values: {
			templateFolderId?: string;
			templateDocumentId?: string;
			placeholders?: {
				placeholderSettings?: {
					values: {
						placeholderData?: string | object;
						useMarkdownInput?: boolean;
						mainContentPlaceholder?: string;
					};
				};
			};
		};
	};
	pageBreakSettings?: {
		values: {
			pageBreakStrategy?: string;
			customPageBreakText?: string;
		};
	};
}

export interface ConversionResult {
	documentTitle: string;
	createDocumentRequest: {
		title: string;
	};
	batchUpdateRequest: {
		requests: GoogleDocsRequest[];
	};
	requests?: Array<{
		requestId: number;
		request: GoogleDocsRequest;
	}>;
}

export interface DocumentCreationResult {
	success: boolean;
	documentId: string;
	documentUrl: string;
	title: string;
	driveId?: string;
	folderId?: string;
	folderName?: string;
	templateFolderId?: string;
	templateDocumentId?: string;
	message: string;
}

export interface FormatRange {
	start: number;
	end: number;
	type: string;
	url?: string;
}

export interface LineItemList {
	level: number;
	lines: LineItem[];
}

export interface LineItem {
	text: string;
	isPrimary: boolean;
	formatRanges: FormatRange[];
}

export interface LineMetadata {
	line: LineItem;
	level: number;
	startIndex: number;
	textToInsert: string;
}

export interface RowData {
	content: string;
	formatRanges: FormatRange[];
	isHeader: boolean;
}

export interface TextStyle {
	bold?: boolean;
	italic?: boolean;
	weightedFontFamily?: { fontFamily: string };
	backgroundColor?: {
		color: {
			rgbColor: {
				red: number;
				green: number;
				blue: number;
			};
		};
	};
	link?: { url: string };
	fontSize?: {
		magnitude: number;
		unit: string;
	};
}

export interface ProcessListItemsResult {
	items: LineItemList[];
}

export interface DocumentExportResult {
	success: boolean;
	documentId: string;
	documentTitle: string;
	exportFormat: string;
	fileName: string;
	content?: string | Buffer;
	mimeType: string;
	fileExtension: string;
	fileSizeBytes: number;
	message: string;
	outputMode: 'content' | 'binary' | 'drive';
	savedFileId?: string;
	savedFileUrl?: string;
	targetFolderId?: string;
}
