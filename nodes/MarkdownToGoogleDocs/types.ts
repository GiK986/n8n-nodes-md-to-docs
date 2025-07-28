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
		textStyle: {
			bold?: boolean;
			italic?: boolean;
			weightedFontFamily?: { fontFamily: string };
			backgroundColor?: any;
			link?: { url: string };
			fontSize?: {
				magnitude: number;
				unit: string;
			};
		};
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
	insertTable?: {
		location?: { index: number };
		endOfSegmentLocation?: { segmentId: string };
		rows: number;
		columns: number;
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
