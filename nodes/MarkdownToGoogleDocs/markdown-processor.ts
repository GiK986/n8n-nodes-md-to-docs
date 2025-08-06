import { marked } from 'marked';
import * as cheerio from 'cheerio';
import type { Element, ChildNode } from 'domhandler';
import { isText, isTag } from 'domhandler';
import type {
	GoogleDocsRequest,
	ConversionResult,
	FormatRange,
	RowData,
	LineItem,
	LineItemList,
	LineMetadata,
	TextStyle,
	ProcessListItemsResult,
} from './types';

export class MarkdownProcessor {
	/**
	 * Convert markdown to Google Docs API requests using HTML parsing approach
	 * This method first converts markdown to HTML, then parses HTML elements
	 * to generate appropriate Google Docs API requests for each element.
	 */
	static convertMarkdownToApiRequests(
		markdownInput: string,
		documentTitle: string,
		outputFormat: string,
		initialInsertIndex: number = 1,
	): ConversionResult {
		// Fix escaped characters from n8n
		const cleanMarkdown = markdownInput.replace('\`', '`').replace('\n\n', '\n');

		// Convert markdown to HTML
		const html = marked.parse(cleanMarkdown, { async: false }) as string;

		// Load HTML with cheerio instead of jsdom
		const $ = cheerio.load(html);

		const requests: GoogleDocsRequest[] = [];
		let insertIndex = initialInsertIndex;

		// Process HTML elements - cheerio equivalent of document.body.childNodes
		$('body')
			.children()
			.each((_index, element) => {
				const elementRequests = this.processHtmlElement(element, insertIndex, $);
				if (elementRequests && elementRequests.length > 0) {
					requests.push(...elementRequests);
					// Update insertIndex based on text content added
					insertIndex = this.calculateNewIndex(elementRequests);
				}
			});

		if (outputFormat === 'single') {
			return {
				documentTitle,
				createDocumentRequest: {
					title: documentTitle,
				},
				batchUpdateRequest: {
					requests,
				},
			};
		} else {
			return {
				documentTitle,
				createDocumentRequest: {
					title: documentTitle,
				},
				batchUpdateRequest: {
					requests,
				},
				requests: requests.map((req, index) => ({
					requestId: index + 1,
					request: req,
				})),
			};
		}
	}

	/**
	 * Process individual HTML elements and convert them to Google Docs requests
	 */
	static processHtmlElement(
		element: Element | ChildNode,
		insertIndex: number,
		$: cheerio.CheerioAPI,
	): GoogleDocsRequest[] {
		const requests: GoogleDocsRequest[] = [];

		// Skip text nodes that are only whitespace
		if (isText(element) && $(element).text().trim() === '') {
			return requests;
		}

		if (!isTag(element)) {
			// Handle text nodes and other non-tag elements
			const textContent = $(element).text();
			if (textContent && textContent.trim()) {
				requests.push({
					insertText: {
						location: { index: insertIndex },
						text: textContent.trim() + '\n',
					},
				});
			}
			return requests;
		}

		switch (element.name.toUpperCase()) {
			case 'H1':
			case 'H2':
			case 'H3':
			case 'H4':
			case 'H5':
			case 'H6':
				return this.processHeading(element, insertIndex, $);

			case 'P':
				return this.processParagraph(element, insertIndex, $);

			case 'UL':
				return this.processUnorderedList(element, insertIndex, $);

			case 'OL':
				return this.processOrderedList(element, insertIndex, $);

			case 'TABLE':
				return this.processTable(element, insertIndex, $);

			case 'BLOCKQUOTE':
				return this.processBlockquote(element, insertIndex, $);

			case 'PRE':
				return this.processCodeBlock(element, insertIndex, $);

			case 'HR':
				return this.processHorizontalRule(insertIndex);

			case 'IMG':
				return this.processImage(element, insertIndex, $);

			default:
				// For other HTML elements, try to extract text content
				const textContent = $(element).text();
				if (textContent && textContent.trim()) {
					requests.push({
						insertText: {
							location: { index: insertIndex },
							text: textContent.trim() + '\n',
						},
					});
				}
				return requests;
		}
	}

	/**
	 * Process heading elements (H1-H6)
	 */
	static processHeading(
		element: Element,
		insertIndex: number,
		$: cheerio.CheerioAPI,
	): GoogleDocsRequest[] {
		const text = $(element).text();
		const headingLevel = parseInt(element.tagName!.charAt(1));
		const headingText = text + '\n';

		return [
			{
				insertText: {
					location: { index: insertIndex },
					text: headingText,
				},
			},
			{
				updateParagraphStyle: {
					range: {
						startIndex: insertIndex,
						endIndex: insertIndex + text.length,
					},
					paragraphStyle: {
						namedStyleType: this.getHeadingStyleType(headingLevel),
					},
					fields: 'namedStyleType',
				},
			},
		];
	}

	/**
	 * Process paragraph elements with inline formatting
	 */
	static processParagraph(
		element: Element,
		insertIndex: number,
		$: cheerio.CheerioAPI,
	): GoogleDocsRequest[] {
		const requests: GoogleDocsRequest[] = [];

		// Check if paragraph contains images or inline formatting
		const $element = $(element);
		const imgElements = $element.find('img');

		if (imgElements.length > 0 || this.hasInlineFormatting(element, $)) {
			return this.processParagraphWithInlineFormatting(element, insertIndex, $);
		}

		// Simple paragraph without formatting
		const text = $element.text();
		if (text && text.trim()) {
			requests.push({
				insertText: {
					location: { index: insertIndex },
					text: text + '\n',
				},
			});
		}

		return requests;
	}

	/**
	 * Check if element has inline formatting (bold, italic, links, etc.)
	 */
	static hasInlineFormatting(element: any, $: cheerio.CheerioAPI): boolean {
		const $element = $(element);
		const formattingTags = ['strong', 'b', 'em', 'i', 'code', 'a', 'br'];
		return formattingTags.some((tag) => $element.find(tag).length > 0);
	}

	/**
	 * Process paragraph with inline formatting and/or images
	 */
	static processParagraphWithInlineFormatting(
		element: Element,
		insertIndex: number,
		$: cheerio.CheerioAPI,
	): GoogleDocsRequest[] {
		const requests: GoogleDocsRequest[] = [];
		const $element = $(element);

		// Check if we have any IMG elements that need special handling
		const imgElements = $element.find('img');

		if (imgElements.length > 0) {
			// Process mixed content (text + images + formatting)
			return this.processMixedContent(element, insertIndex, $);
		}

		// Original inline formatting logic for text-only content
		const formatRanges: FormatRange[] = [];

		// Process child nodes to build text and track formatting
		const textContent = this.processChildNodes(element, formatRanges, $);
		const fullText = textContent + '\n';

		// Insert text
		requests.push({
			insertText: {
				location: { index: insertIndex },
				text: fullText,
			},
		});

		// Apply formatting
		for (const range of formatRanges) {
			const formatRequest = this.createFormatRequest(range, insertIndex);
			if (formatRequest) {
				requests.push(formatRequest);
			}
		}

		return requests;
	}

	/**
	 * Process mixed content (text + images + inline formatting)
	 */
	static processMixedContent(
		element: Element,
		insertIndex: number,
		$: cheerio.CheerioAPI,
	): GoogleDocsRequest[] {
		const requests: GoogleDocsRequest[] = [];
		let currentIndex = insertIndex;
		const $element = $(element);

		// Process all child nodes in order
		$element.contents().each((_index, child) => {
			if (child.type === 'text') {
				// Text node
				const text = $(child).text();
				if (text && text.trim()) {
					requests.push({
						insertText: {
							location: { index: currentIndex },
							text: text,
						},
					});
					currentIndex += text.length;
				}
			} else if (child.type === 'tag' && child.name === 'img') {
				// Image element
				const imageRequests = this.processImage(child, currentIndex, $);
				requests.push(...imageRequests);
				currentIndex = this.calculateNewIndex(imageRequests);
			} else if (isTag(child)) {
				// Other element - process with inline formatting if needed
				if (this.hasInlineFormatting(child, $)) {
					const formatRanges: FormatRange[] = [];
					const textContent = this.processChildNodes(child, formatRanges, $);

					if (textContent.trim()) {
						// Insert text
						requests.push({
							insertText: {
								location: { index: currentIndex },
								text: textContent,
							},
						});

						// Apply formatting
						for (const range of formatRanges) {
							const formatRequest = this.createFormatRequest(range, currentIndex);
							if (formatRequest) {
								requests.push(formatRequest);
							}
						}

						currentIndex += textContent.length;
					}
				} else {
					// Simple element
					const text = $(child).text();
					if (text && text.trim()) {
						requests.push({
							insertText: {
								location: { index: currentIndex },
								text: text,
							},
						});
						currentIndex += text.length;
					}
				}
			}
		});

		// Add paragraph ending newline
		requests.push({
			insertText: {
				location: { index: currentIndex },
				text: '\n',
			},
		});

		return requests;
	}

	/**
	 * Recursively process child nodes to extract text and formatting
	 */
	static processChildNodes(
		element: Element | ChildNode,
		formatRanges: FormatRange[],
		$: cheerio.CheerioAPI,
		baseOffset: number = 0,
	): string {
		let result = '';
		const $element = $(element);

		$element.contents().each((_index, node) => {
			if (node.type === 'text') {
				// Text node
				result += $(node).text().replace(/\n/g, '');
			} else if (node.type === 'tag' && node.name === 'br') {
				// BR tag - convert to newline
				result += '\n';
			} else if (isTag(node)) {
				// Element node
				const beforeLength = result.length;
				const childText = this.processChildNodes(node, formatRanges, $, baseOffset + beforeLength);
				result += childText;
				const afterLength = result.length;

				// Track formatting for this element
				if (beforeLength < afterLength) {
					const formatType = this.getFormatType(node.name);
					if (formatType) {
						const range = {
							start: baseOffset + beforeLength,
							end: baseOffset + afterLength,
							type: formatType,
						};

						// Add URL for links
						if (node.name === 'a') {
							const href = $(node).attr('href');
							if (href) {
								(range as any).url = href;
							}
						}

						formatRanges.push(range);
					}
				}
			}
		});

		return result;
	}

	/**
	 * Get format type from HTML tag name
	 */
	static getFormatType(nodeName: string): string | null {
		switch (nodeName?.toLowerCase()) {
			case 'strong':
			case 'b':
				return 'bold';
			case 'em':
			case 'i':
				return 'italic';
			case 'code':
				return 'code';
			case 'a':
				return 'link';
			default:
				return null;
		}
	}

	/**
	 * Create formatting request for a range
	 */
	static createFormatRequest(range: FormatRange, insertIndex: number): GoogleDocsRequest | null {
		let textStyle: TextStyle = {};
		let fields = '';

		switch (range.type) {
			case 'bold':
				textStyle.bold = true;
				fields = 'bold';
				break;
			case 'italic':
				textStyle.italic = true;
				fields = 'italic';
				break;
			case 'code':
				textStyle.weightedFontFamily = { fontFamily: 'Courier New' };
				textStyle.backgroundColor = {
					color: {
						rgbColor: { red: 0.95, green: 0.95, blue: 0.95 },
					},
				};
				fields = 'weightedFontFamily,backgroundColor';
				break;
			case 'link':
				if (range.url) {
					textStyle.link = { url: range.url };
					fields = 'link';
				} else {
					return null;
				}
				break;
			default:
				return null;
		}

		return {
			updateTextStyle: {
				range: {
					startIndex: insertIndex + range.start,
					endIndex: insertIndex + range.end,
				},
				textStyle,
				fields,
			},
		};
	}

	/**
	 * Process unordered list (UL)
	 */
	static processUnorderedList(
		element: Element,
		insertIndex: number,
		$: cheerio.CheerioAPI,
	): GoogleDocsRequest[] {
		// Check if this is a checkbox list by looking for input[type="checkbox"] elements
		const $element = $(element);
		const checkboxInputs = $element.find('input[type="checkbox"]');
		const isCheckboxList = checkboxInputs.length > 0;

		if (isCheckboxList) {
			return this.processList(element, insertIndex, 'BULLET_CHECKBOX', $);
		} else {
			return this.processList(element, insertIndex, 'BULLET_DISC_CIRCLE_SQUARE', $);
		}
	}

	/**
	 * Process ordered list (OL)
	 */
	static processOrderedList(
		element: Element,
		insertIndex: number,
		$: cheerio.CheerioAPI,
	): GoogleDocsRequest[] {
		return this.processList(element, insertIndex, 'NUMBERED_DECIMAL_ALPHA_ROMAN', $);
	}

	/**
	 * Process list elements (UL or OL) with proper nested support
	 */
	static processList(
		element: Element,
		insertIndex: number,
		bulletPreset: string,
		$: cheerio.CheerioAPI,
	): GoogleDocsRequest[] {
		const requests: GoogleDocsRequest[] = [];
		let currentIndex = insertIndex;

		const processedData = this.processListItemsRecursively(element, 0, bulletPreset, $);

		if (processedData.items.length === 0) {
			return requests;
		}

		// Phase 1: Insert all text and gather metadata
		const lineMetadata: LineMetadata[] = [];

		let fullTextToInsert = '';
		let initialListIndex = currentIndex;

		for (const item of processedData.items) {
			for (const line of item.lines) {
				const leadingTabs = line.isPrimary ? '\t'.repeat(item.level) : '';
				const textToInsert = leadingTabs + line.text;
				const lineTextForRequest = textToInsert + '\n';

				lineMetadata.push({
					line,
					level: item.level,
					startIndex: currentIndex,
					textToInsert: textToInsert,
				});

				fullTextToInsert += lineTextForRequest;
				currentIndex += lineTextForRequest.length;
			}
		}

		requests.push({
			insertText: { location: { index: initialListIndex }, text: fullTextToInsert },
		});

		// Phase 2: Create bullets for the entire list block
		const listEndIndex = initialListIndex + fullTextToInsert.length - 1;
		requests.push({
			createParagraphBullets: {
				range: { startIndex: initialListIndex, endIndex: listEndIndex },
				bulletPreset,
			},
		});

		// Phase 3: Apply corrections and inline formatting
		let totalTabsRemoved = 0;
		for (const meta of lineMetadata) {
			const adjustedStartIndex = meta.startIndex - totalTabsRemoved;
			const adjustedEndIndex = adjustedStartIndex + meta.textToInsert.length;

			// Apply inline formatting first
			for (const range of meta.line.formatRanges) {
				const formatRequest = this.createFormatRequest(range, adjustedStartIndex);
				if (formatRequest) {
					requests.push(formatRequest);
				}
			}

			if (!meta.line.isPrimary) {
				// This is a secondary line, remove its bullet and apply indentation
				requests.push({
					deleteParagraphBullets: {
						range: { startIndex: adjustedStartIndex, endIndex: adjustedEndIndex },
					},
				});

				requests.push({
					updateParagraphStyle: {
						range: { startIndex: adjustedStartIndex, endIndex: adjustedEndIndex },
						paragraphStyle: {
							indentStart: { magnitude: 36 * (meta.level + 1), unit: 'PT' },
							indentFirstLine: { magnitude: 36 * (meta.level + 1), unit: 'PT' },
						},
						fields: 'indentStart,indentFirstLine',
					},
				});
			}

			if (meta.line.isPrimary) {
				totalTabsRemoved += meta.level;
			}
		}

		// Apply spacing like blockquote - spaceAbove to first item, spaceBelow to last item
		const firstItemMeta = lineMetadata[0];
		const lastItemMeta = lineMetadata[lineMetadata.length - 1];

		if (firstItemMeta) {
			requests.push({
				updateParagraphStyle: {
					range: {
						startIndex: firstItemMeta.startIndex - totalTabsRemoved,
						endIndex:
							firstItemMeta.startIndex - totalTabsRemoved + firstItemMeta.textToInsert.length,
					},
					paragraphStyle: {
						spaceAbove: { magnitude: 12, unit: 'PT' },
					},
					fields: 'spaceAbove',
				},
			});
		}

		if (lastItemMeta) {
			requests.push({
				updateParagraphStyle: {
					range: {
						startIndex: lastItemMeta.startIndex - totalTabsRemoved,
						endIndex: lastItemMeta.startIndex - totalTabsRemoved + lastItemMeta.textToInsert.length,
					},
					paragraphStyle: {
						spaceBelow: { magnitude: 12, unit: 'PT' },
					},
					fields: 'spaceBelow',
				},
			});
		}

		return requests;
	}

	/**
	 * Recursively process list items to extract text, formatting, and nesting levels
	 */
	static processListItemsRecursively(
		element: Element,
		level: number,
		bulletPreset: string | undefined,
		$: cheerio.CheerioAPI,
	): ProcessListItemsResult {
		const items: LineItemList[] = [];

		const $element = $(element);

		// Get direct children li elements only (not nested ones)
		$element.children('li').each((_index, listItem) => {
			const $listItem = $(listItem);
			const lines: LineItem[] = [];

			let currentLineNodes: any[] = [];
			let isPrimaryLine = true;

			// Check for checkbox prefix only for primary line
			const checkboxInput = $listItem.find('input[type="checkbox"]').first();
			let checkboxPrefix = '';
			if (checkboxInput.length > 0 && bulletPreset === 'BULLET_CHECKBOX') {
				checkboxPrefix = checkboxInput.prop('checked') ? '✅ ' : '❌ ';
			}

			// Process content, handling BR tags for line breaks
			$listItem.contents().each((_i, child) => {
				if (child.type === 'tag' && (child.name === 'ul' || child.name === 'ol')) {
					// Skip nested lists for now, they'll be processed separately
					return;
				}

				if (child.type === 'tag' && child.name === 'br') {
					const formatRanges: any[] = [];
					const text = this.processChildNodesFromArray(currentLineNodes, formatRanges, $);
					if (text.trim() || lines.length > 0) {
						const trimmedText = text.trim();
						lines.push({ text: trimmedText, isPrimary: isPrimaryLine, formatRanges });
					}
					currentLineNodes = [];
					isPrimaryLine = false;
				} else {
					currentLineNodes.push(child);
				}
			});

			// Process remaining nodes
			if (currentLineNodes.length > 0) {
				const formatRanges: any[] = [];
				const text = this.processChildNodesFromArray(currentLineNodes, formatRanges, $);
				if (text.trim()) {
					const trimmedText = text.trim();
					lines.push({ text: trimmedText, isPrimary: isPrimaryLine, formatRanges });
				}
			}

			// Prepend checkbox prefix to the first line if it exists
			if (checkboxPrefix && lines.length > 0) {
				lines[0].text = checkboxPrefix + lines[0].text;
				for (const range of lines[0].formatRanges) {
					range.start += checkboxPrefix.length;
					range.end += checkboxPrefix.length;
				}
			}

			if (lines.length > 0) {
				items.push({
					level: level,
					lines: lines,
				});
			}

			// Process nested lists
			$listItem.children('ul, ol').each((_i, nestedList) => {
				const nestedResult = this.processListItemsRecursively(
					nestedList,
					level + 1,
					bulletPreset,
					$,
				);
				items.push(...nestedResult.items);
			});
		});

		return { items };
	}

	/**
	 * Helper method to process an array of nodes
	 */
	static processChildNodesFromArray(
		nodes: (Element | ChildNode)[],
		formatRanges: FormatRange[],
		$: cheerio.CheerioAPI,
		baseOffset: number = 0,
	): string {
		let result = '';

		for (const node of nodes) {
			if (node.type === 'text') {
				result += $(node).text();
			} else if (isTag(node)) {
				const beforeLength = result.length;
				const childText = this.processChildNodes(node, formatRanges, $, baseOffset + beforeLength);
				result += childText;
				const afterLength = result.length;

				if (beforeLength < afterLength) {
					const formatType = this.getFormatType(node.name);
					if (formatType) {
						const range: FormatRange = {
							start: baseOffset + beforeLength,
							end: baseOffset + afterLength,
							type: formatType,
						};

						if (node.name === 'a') {
							const href = $(node).attr('href');
							if (href) {
								range.url = href;
							}
						}

						formatRanges.push(range);
					}
				}
			}
		}

		return result;
	}

	/**
	 * Process table element with accurate cell indexing and formatting support
	 */
	static processTable(
		element: Element,
		insertIndex: number,
		$: cheerio.CheerioAPI,
	): GoogleDocsRequest[] {
		const requests: GoogleDocsRequest[] = [];
		const $element = $(element);

		// Extract table data with proper formatting support
		const rows = $element.find('tr');
		const tableData: RowData[][] = [];

		rows.each((rowIndex, row) => {
			const $row = $(row);
			const cells = $row.find('th, td');
			const rowData: RowData[] = [];

			cells.each((_cellIndex, cell) => {
				const $cell = $(cell);
				const isHeader = cell.name === 'th' || rowIndex === 0;
				const formatRanges: FormatRange[] = [];

				let cellContent = '';
				if (this.hasInlineFormatting(cell, $)) {
					cellContent = this.processChildNodes(cell, formatRanges, $);
				} else {
					cellContent = $cell.text().trim();
				}

				rowData.push({
					content: cellContent,
					formatRanges: formatRanges,
					isHeader: isHeader,
				});
			});
			tableData.push(rowData);
		});

		if (tableData.length === 0 || tableData[0].length === 0) {
			return requests;
		}

		try {
			// Create the table structure
			requests.push({
				insertTable: {
					rows: tableData.length,
					columns: tableData[0].length,
					location: { index: insertIndex },
				},
			});

			// Calculate cell positions and add content with formatting
			let currentCellIndex = insertIndex + 3; // +3 for first cell

			for (let rowIndex = 0; rowIndex < tableData.length; rowIndex++) {
				for (let colIndex = 0; colIndex < tableData[rowIndex].length; colIndex++) {
					const cellData = tableData[rowIndex][colIndex];
					const textPosition = currentCellIndex + 1;

					if (cellData.content) {
						// Insert cell text
						requests.push({
							insertText: {
								location: { index: textPosition },
								text: cellData.content,
							},
						});

						// Apply inline formatting
						for (const range of cellData.formatRanges) {
							const formatRequest = this.createFormatRequest(range, textPosition);
							if (formatRequest) {
								requests.push(formatRequest);
							}
						}

						// Apply header formatting
						if (cellData.isHeader) {
							requests.push({
								updateTextStyle: {
									range: {
										startIndex: textPosition,
										endIndex: textPosition + cellData.content.length,
									},
									textStyle: {
										bold: true,
									},
									fields: 'bold',
								},
							});

							requests.push({
								updateParagraphStyle: {
									range: {
										startIndex: textPosition,
										endIndex: textPosition + cellData.content.length,
									},
									paragraphStyle: {
										alignment: 'CENTER',
									},
									fields: 'alignment',
								},
							});
						}

						currentCellIndex += cellData.content.length + 2;
					} else {
						// Empty cell
						requests.push({
							insertText: {
								location: { index: textPosition },
								text: '\n',
							},
						});
						currentCellIndex += 2;
					}
				}

				currentCellIndex += 1;
			}

			// Add extra line break after the table
			requests.push({
				insertText: {
					location: { index: currentCellIndex },
					text: '\n',
				},
			});
		} catch (error) {
			// Fallback: Insert table as formatted text
			return this.processTableAsText(
				tableData.map((row) => row.map((cell) => cell.content)),
				insertIndex,
			);
		}

		return requests;
	}

	/**
	 * Fallback method to insert table as formatted text
	 */
	static processTableAsText(tableData: string[][], insertIndex: number): GoogleDocsRequest[] {
		const requests: GoogleDocsRequest[] = [];

		let tableText = '\n[Table Content]\n';

		if (tableData.length > 0) {
			tableText += 'Headers: ' + tableData[0].join(', ') + '\n';

			for (let i = 1; i < tableData.length; i++) {
				tableText += `Row ${i}: ` + tableData[i].join(', ') + '\n';
			}
		}

		tableText += '\n';

		requests.push({
			insertText: {
				location: { index: insertIndex },
				text: tableText,
			},
		});

		return requests;
	}

	/**
	 * Process blockquote element with inline formatting support
	 */
	static processBlockquote(
		element: Element,
		insertIndex: number,
		$: cheerio.CheerioAPI,
	): GoogleDocsRequest[] {
		const requests: GoogleDocsRequest[] = [];
		const $element = $(element);

		let fullText = '';
		const formatRanges: FormatRange[] = [];

		// Check if blockquote has inline formatting
		if (this.hasInlineFormatting(element, $)) {
			// Process with inline formatting
			const textContent = this.processChildNodes(element, formatRanges, $);
			fullText = textContent + '\n';
		} else {
			// Simple blockquote without formatting
			const text = $element.text().trim();
			fullText = text + '\n';
		}

		// Insert text
		requests.push({
			insertText: {
				location: { index: insertIndex },
				text: fullText,
			},
		});

		// Apply formatting
		for (const range of formatRanges) {
			const formatRequest = this.createFormatRequest(range, insertIndex);
			if (formatRequest) {
				requests.push(formatRequest);
			}
		}

		// Apply blockquote paragraph style
		requests.push({
			updateParagraphStyle: {
				range: {
					startIndex: insertIndex,
					endIndex: insertIndex + fullText.length - 1,
				},
				paragraphStyle: {
					indentStart: {
						magnitude: 36,
						unit: 'PT',
					},
					indentFirstLine: {
						magnitude: 36,
						unit: 'PT',
					},
					borderLeft: {
						color: {
							color: {
								rgbColor: {
									red: 0.8,
									green: 0.8,
									blue: 0.8,
								},
							},
						},
						width: {
							magnitude: 3,
							unit: 'PT',
						},
						dashStyle: 'SOLID',
						padding: {
							magnitude: 8,
							unit: 'PT',
						},
					},
				},
				fields: 'indentStart,indentFirstLine,borderLeft',
			},
		});

		// split the text by newlines and get the first line and the last line
		const lines = fullText.trim().split('\n');
		const firstLine = lines[0];
		const lastLine = lines[lines.length - 1];

		// add updateParagraphStyle spaceAbove to the first line and spaceBelow to the last line
		if (firstLine.trim() && lastLine.trim()) {
			requests.push({
				updateParagraphStyle: {
					range: {
						startIndex: insertIndex,
						endIndex: insertIndex + firstLine.length,
					},
					paragraphStyle: {
						spaceAbove: {
							magnitude: 12,
							unit: 'PT',
						},
					},
					fields: 'spaceAbove',
				},
			});

			requests.push({
				updateParagraphStyle: {
					range: {
						startIndex: insertIndex + fullText.length - lastLine.length + 1,
						endIndex: insertIndex + fullText.length - 1,
					},
					paragraphStyle: {
						spaceBelow: {
							magnitude: 12,
							unit: 'PT',
						},
					},
					fields: 'spaceBelow',
				},
			});
		}

		return requests;
	}

	/**
	 * Process code block (PRE element)
	 */
	static processCodeBlock(
		element: Element,
		insertIndex: number,
		$: cheerio.CheerioAPI,
	): GoogleDocsRequest[] {
		const text = $(element).text();

		return [
			{
				insertText: {
					location: { index: insertIndex },
					text: text + '\n',
				},
			},
			{
				updateTextStyle: {
					range: {
						startIndex: insertIndex,
						endIndex: insertIndex + text.length,
					},
					textStyle: {
						weightedFontFamily: {
							fontFamily: 'Courier New',
						},
						backgroundColor: {
							color: {
								rgbColor: {
									red: 0.95,
									green: 0.95,
									blue: 0.95,
								},
							},
						},
					},
					fields: 'weightedFontFamily,backgroundColor',
				},
			},
		];
	}

	/**
	 * Process horizontal rule
	 */
	static processHorizontalRule(insertIndex: number): GoogleDocsRequest[] {
		const hrText = '\n';

		return [
			{
				insertText: {
					location: { index: insertIndex },
					text: hrText,
				},
			},
			{
				updateParagraphStyle: {
					range: {
						startIndex: insertIndex,
						endIndex: insertIndex + hrText.length,
					},
					paragraphStyle: {
						borderBottom: {
							color: {
								color: {
									rgbColor: {
										red: 0.5,
										green: 0.5,
										blue: 0.5,
									},
								},
							},
							width: {
								magnitude: 1,
								unit: 'PT',
							},
							dashStyle: 'SOLID',
							padding: {
								magnitude: 6,
								unit: 'PT',
							},
						},
						spaceAbove: {
							magnitude: 6,
							unit: 'PT',
						},
						spaceBelow: {
							magnitude: 6,
							unit: 'PT',
						},
					},
					fields: 'borderBottom,spaceAbove,spaceBelow',
				},
			},
			{
				insertText: {
					location: { index: insertIndex + 1 },
					text: hrText,
				},
			},
		];
	}

	/**
	 * Calculate new insert index after adding requests
	 */
	static calculateNewIndex(requests: GoogleDocsRequest[]): number {
		const lastInsertTextRequest = requests.filter((req) => req.insertText).pop();

		if (
			lastInsertTextRequest &&
			lastInsertTextRequest.insertText &&
			lastInsertTextRequest.insertText.location
		) {
			const lastIndex = lastInsertTextRequest.insertText.location.index;
			const lastTextLength = lastInsertTextRequest.insertText.text.length;
			let newIndex = lastIndex + lastTextLength;

			return newIndex;
		}

		return 1;
	}

	/**
	 * Process image elements (IMG) using Google Docs API insertInlineImage
	 */
	static processImage(
		element: Element,
		insertIndex: number,
		$: cheerio.CheerioAPI,
	): GoogleDocsRequest[] {
		const $element = $(element);
		const src = $element.attr('src') || '';
		const alt = $element.attr('alt') || 'Image';
		const width = $element.attr('width');
		const height = $element.attr('height');

		// Validate URL - must be publicly accessible and under 2KB
		if (!src || src.length > 2000) {
			return this.processImageFallback(alt, src, insertIndex);
		}

		// Check if URL looks like a valid image URL
		if (!this.isValidImageUrl(src)) {
			return this.processImageFallback(alt, src, insertIndex);
		}

		const requests: GoogleDocsRequest[] = [];

		// add newline before the image
		requests.push({
			insertText: {
				location: { index: insertIndex },
				text: '\n',
			},
		});

		// Move index after the newline
		insertIndex += 1;

		// Create insertInlineImage request
		const imageRequest: any = {
			insertInlineImage: {
				uri: src,
				location: { index: insertIndex },
			},
		};

		// Add optional size if specified
		if (width || height) {
			imageRequest.insertInlineImage.objectSize = {};

			if (width) {
				const widthValue = this.parseImageDimension(width);
				if (widthValue > 0) {
					imageRequest.insertInlineImage.objectSize.width = {
						magnitude: widthValue,
						unit: 'PT',
					};
				}
			}

			if (height) {
				const heightValue = this.parseImageDimension(height);
				if (heightValue > 0) {
					imageRequest.insertInlineImage.objectSize.height = {
						magnitude: heightValue,
						unit: 'PT',
					};
				}
			}
		}

		requests.push(imageRequest);

		// add newline after the image
		requests.push({
			insertText: {
				location: { index: insertIndex + 1 },
				text: '\n',
			},
		});

		return requests;
	}

	/**
	 * Fallback method for problematic images - creates styled text placeholder
	 */
	static processImageFallback(alt: string, src: string, insertIndex: number): GoogleDocsRequest[] {
		const displayText = `📷 ${alt} invalid source address!`;
		const sourceText = src ? `\nSource: ${src}` : '';
		const fullText = `${displayText}${sourceText}\n\n`;

		const requests: GoogleDocsRequest[] = [];

		// Insert the placeholder text
		requests.push({
			insertText: {
				location: { index: insertIndex },
				text: fullText,
			},
		});

		// Style the image placeholder (bold and with background color)
		requests.push({
			updateTextStyle: {
				range: {
					startIndex: insertIndex,
					endIndex: insertIndex + displayText.length,
				},
				textStyle: {
					bold: true,
					backgroundColor: {
						color: {
							rgbColor: { red: 0.9, green: 0.95, blue: 1.0 },
						},
					},
				},
				fields: 'bold,backgroundColor',
			},
		});

		// Style the source text if present (italic and smaller)
		if (sourceText) {
			requests.push({
				updateTextStyle: {
					range: {
						startIndex: insertIndex + displayText.length + 1,
						endIndex: insertIndex + displayText.length + sourceText.length,
					},
					textStyle: {
						italic: true,
						fontSize: { magnitude: 9, unit: 'PT' },
					},
					fields: 'italic,fontSize',
				},
			});
		}

		return requests;
	}

	/**
	 * Validate if URL looks like a valid image URL
	 */
	static isValidImageUrl(url: string): boolean {
		try {
			const parsedUrl = new URL(url);

			if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
				return false;
			}

			const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
			const pathname = parsedUrl.pathname.toLowerCase();
			const hasImageExtension = imageExtensions.some((ext) => pathname.endsWith(ext));

			const isImageService = /\.(googleapis|imgur|cloudinary|unsplash|pexels)\./.test(
				parsedUrl.hostname,
			);

			return hasImageExtension || isImageService;
		} catch {
			return false;
		}
	}

	/**
	 * Parse image dimension from string (supports px, pt, or plain numbers)
	 */
	static parseImageDimension(dimension: string): number {
		if (!dimension) return 0;

		const numericValue = parseFloat(dimension.replace(/[^\d.]/g, ''));

		if (isNaN(numericValue) || numericValue <= 0) {
			return 0;
		}

		if (dimension.toLowerCase().includes('px')) {
			return numericValue * 0.75;
		}

		return numericValue;
	}

	/**
	 * Get heading style type for Google Docs
	 */
	static getHeadingStyleType(depth: number): string {
		const styles = ['HEADING_1', 'HEADING_2', 'HEADING_3', 'HEADING_4', 'HEADING_5', 'HEADING_6'];
		return styles[depth - 1] || 'NORMAL_TEXT';
	}
}
