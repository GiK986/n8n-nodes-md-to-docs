import { marked } from 'marked';
import { JSDOM } from 'jsdom';
import type { GoogleDocsRequest, ConversionResult } from './types';

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
		const cleanMarkdown = markdownInput.replace('\`', '`');

		// Convert markdown to HTML
		const html = marked.parse(cleanMarkdown, { async: false }) as string;
		const dom = new JSDOM(html);
		const document = dom.window.document;

		const requests: GoogleDocsRequest[] = [];
		let insertIndex = initialInsertIndex;

		// Process HTML elements
		const elements = document.body.childNodes;
		for (const element of elements) {
			const elementRequests = this.processHtmlElement(element, insertIndex);
			if (elementRequests && elementRequests.length > 0) {
				requests.push(...elementRequests);
				// Update insertIndex based on text content added
				insertIndex = this.calculateNewIndex(elementRequests);
			}
		}

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
	static processHtmlElement(element: any, insertIndex: number): GoogleDocsRequest[] {
		const requests: GoogleDocsRequest[] = [];

		// Skip text nodes that are only whitespace
		if (element.nodeType === 3 && element.textContent.trim() === '') {
			return requests;
		}

		switch (element.nodeName) {
			case 'H1':
			case 'H2':
			case 'H3':
			case 'H4':
			case 'H5':
			case 'H6':
				return this.processHeading(element, insertIndex);

			case 'P':
				return this.processParagraph(element, insertIndex);

			case 'UL':
				return this.processUnorderedList(element, insertIndex);

			case 'OL':
				return this.processOrderedList(element, insertIndex);

			case 'TABLE':
				return this.processTable(element, insertIndex);

			case 'BLOCKQUOTE':
				return this.processBlockquote(element, insertIndex);

			case 'PRE':
				return this.processCodeBlock(element, insertIndex);

			case 'HR':
				return this.processHorizontalRule(insertIndex);

			case 'IMG':
				return this.processImage(element, insertIndex);

			default:
				// For other elements or text nodes, try to extract text content
				if (element.textContent && element.textContent.trim()) {
					requests.push({
						insertText: {
							location: { index: insertIndex },
							text: element.textContent.trim() + '\n', // remove one newline
						},
					});
				}
				return requests;
		}
	}

	/**
	 * Process heading elements (H1-H6)
	 */
	static processHeading(element: any, insertIndex: number): GoogleDocsRequest[] {
		const text = element.textContent;
		const headingLevel = parseInt(element.nodeName.charAt(1));
		const headingText = text + '\n'; // remove one newline

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
	static processParagraph(element: any, insertIndex: number): GoogleDocsRequest[] {
		const requests: GoogleDocsRequest[] = [];

		// Check if paragraph contains images or inline formatting
		const imgElements = element.querySelectorAll('img');
		if (imgElements.length > 0 || this.hasInlineFormatting(element)) {
			return this.processParagraphWithInlineFormatting(element, insertIndex);
		}

		// Simple paragraph without formatting
		const text = element.textContent;
		if (text && text.trim()) {
			requests.push({
				insertText: {
					location: { index: insertIndex },
					text: text + '\n', // remove one newline
				},
			});
		}

		return requests;
	}

	/**
	 * Check if element has inline formatting (bold, italic, links, etc.)
	 */
	static hasInlineFormatting(element: any): boolean {
		const formattingTags = ['STRONG', 'B', 'EM', 'I', 'CODE', 'A', 'BR'];
		return formattingTags.some((tag) => element.querySelector(tag.toLowerCase()));
	}

	/**
	 * Process paragraph with inline formatting and/or images
	 */
	static processParagraphWithInlineFormatting(
		element: any,
		insertIndex: number,
	): GoogleDocsRequest[] {
		const requests: GoogleDocsRequest[] = [];

		// Check if we have any IMG elements that need special handling
		const imgElements = element.querySelectorAll('img');

		if (imgElements.length > 0) {
			// Process mixed content (text + images + formatting)
			return this.processMixedContent(element, insertIndex);
		}

		// Original inline formatting logic for text-only content
		const formatRanges: Array<{ start: number; end: number; type: string; url?: string }> = [];

		// Recursively process child nodes to build text and track formatting
		const textContent = this.processChildNodes(element.childNodes, formatRanges);

		const fullText = textContent + '\n'; // remove one newline

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
	static processMixedContent(element: any, insertIndex: number): GoogleDocsRequest[] {
		const requests: GoogleDocsRequest[] = [];
		let currentIndex = insertIndex;

		// Process all child nodes in order (text nodes, image elements, formatted elements)
		for (const child of element.childNodes) {
			if (child.nodeType === 3) {
				// Text node
				const text = child.textContent;
				if (text && text.trim()) {
					requests.push({
						insertText: {
							location: { index: currentIndex },
							text: text,
						},
					});
					currentIndex += text.length;
				}
			} else if (child.nodeType === 1 && child.nodeName === 'IMG') {
				// Image element
				const imageRequests = this.processImage(child, currentIndex);
				requests.push(...imageRequests);

				// Update index based on image requests
				currentIndex = this.calculateNewIndex(imageRequests);
			} else if (child.nodeType === 1) {
				// Other element - process with inline formatting if needed
				if (this.hasInlineFormatting(child)) {
					const formatRanges: Array<{ start: number; end: number; type: string; url?: string }> =
						[];
					const textContent = this.processChildNodes(child.childNodes, formatRanges);

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
					const text = child.textContent;
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
		}

		// Add paragraph ending newline
		requests.push({
			insertText: {
				location: { index: currentIndex },
				text: '\n',
			},
		});

		return requests;
	} /**
	 * Recursively process child nodes to extract text and formatting
	 */
	static processChildNodes(
		childNodes: any[],
		formatRanges: Array<{ start: number; end: number; type: string; url?: string }>,
		baseOffset: number = 0,
	): string {
		let result = '';

		for (const node of childNodes) {
			if (node.nodeType === 3) {
				// Text node
				result += node.textContent;
			} else if (node.nodeName === 'BR') {
				// BR tag - convert to newline
				result += '\n';
			} else {
				// Element node
				const beforeLength = result.length;
				const childText = this.processChildNodes(
					node.childNodes,
					formatRanges,
					baseOffset + beforeLength,
				);
				result += childText;
				const afterLength = result.length;

				// Track formatting for this element
				if (beforeLength < afterLength) {
					const formatType = this.getFormatType(node.nodeName);
					if (formatType) {
						const range = {
							start: baseOffset + beforeLength,
							end: baseOffset + afterLength,
							type: formatType,
						};

						// Add URL for links
						if (node.nodeName === 'A' && node.href) {
							(range as any).url = node.href;
						}

						formatRanges.push(range);
					}
				}
			}
		}

		return result;
	}

	/**
	 * Get format type from HTML tag name
	 */
	static getFormatType(nodeName: string): string | null {
		switch (nodeName) {
			case 'STRONG':
			case 'B':
				return 'bold';
			case 'EM':
			case 'I':
				return 'italic';
			case 'CODE':
				return 'code';
			case 'A':
				return 'link';
			default:
				return null;
		}
	}

	/**
	 * Create formatting request for a range
	 */
	static createFormatRequest(
		range: { start: number; end: number; type: string; url?: string },
		insertIndex: number,
	): GoogleDocsRequest | null {
		let textStyle: any = {};
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
	static processUnorderedList(element: any, insertIndex: number): GoogleDocsRequest[] {
		// Check if this is a checkbox list by looking for input[type="checkbox"] elements
		const checkboxInputs = element.querySelectorAll('input[type="checkbox"]');
		const isCheckboxList = checkboxInputs.length > 0;

		if (isCheckboxList) {
			// Use special checkbox bullet preset for checkbox lists
			return this.processList(element, insertIndex, 'BULLET_CHECKBOX');
		} else {
			// Use regular bullet preset for normal lists
			return this.processList(element, insertIndex, 'BULLET_DISC_CIRCLE_SQUARE');
		}
	}

	/**
	 * Process ordered list (OL)
	 */
	static processOrderedList(element: any, insertIndex: number): GoogleDocsRequest[] {
		return this.processList(element, insertIndex, 'NUMBERED_DECIMAL_ALPHA_ROMAN');
	}

	/**
	 * Process list elements (UL or OL) with proper nested support
	 */
	static processList(element: any, insertIndex: number, bulletPreset: string): GoogleDocsRequest[] {
		const requests: GoogleDocsRequest[] = [];
		let currentIndex = insertIndex;

		const processedData = this.processListItemsRecursively(element, 0, bulletPreset);

		if (processedData.items.length === 0) {
			return requests;
		}

		// Phase 1: Insert all text and gather metadata
		const lineMetadata: Array<{
			line: {
				text: string;
				isPrimary: boolean;
				formatRanges: Array<{ start: number; end: number; type: string; url?: string }>;
			};
			level: number;
			startIndex: number;
			textToInsert: string;
		}> = [];

		let fullTextToInsert = '';
		let initialListIndex = currentIndex;

		// Add a newline before the list to ensure proper separation
		requests.push({ insertText: { location: { index: currentIndex }, text: '\n' } });
		currentIndex++;
		initialListIndex++;

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
		const listEndIndex = initialListIndex + fullTextToInsert.length - 1; // Exclude final newline
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

		// Add a final newline for separation after the list
		const finalEndIndex = listEndIndex - totalTabsRemoved;
		requests.push({
			insertText: {
				location: { index: finalEndIndex + 1 },
				text: '\n',
			},
		});

		return requests;
	}

	/**
	 * Recursively process list items to extract text, formatting, and nesting levels
	 */
	static processListItemsRecursively(
		element: any,
		level: number,
		bulletPreset?: string,
	): {
		items: Array<{
			level: number;
			lines: Array<{
				text: string;
				isPrimary: boolean;
				formatRanges: Array<{ start: number; end: number; type: string; url?: string }>;
			}>;
		}>;
	} {
		const items: Array<{
			level: number;
			lines: Array<{
				text: string;
				isPrimary: boolean;
				formatRanges: Array<{ start: number; end: number; type: string; url?: string }>;
			}>;
		}> = [];

		// Get direct children li elements only (not nested ones)
		const directListItems = Array.from(element.children).filter(
			(child: any) => child.nodeName === 'LI',
		);

		for (const listItem of directListItems) {
			const lines: Array<{
				text: string;
				isPrimary: boolean;
				formatRanges: Array<{ start: number; end: number; type: string; url?: string }>;
			}> = [];
			let currentLineNodes: any[] = [];
			let isPrimaryLine = true;

			// Check for checkbox prefix only for primary line
			const checkboxInput = (listItem as any).querySelector('input[type="checkbox"]');
			let checkboxPrefix = '';
			if (checkboxInput && bulletPreset === 'BULLET_CHECKBOX') {
				checkboxPrefix = checkboxInput.checked ? '✅ ' : '❌ ';
			}

			const nonNestedChildren = Array.from((listItem as any).childNodes).filter(
				(child: any) => (child as any).nodeName !== 'UL' && (child as any).nodeName !== 'OL',
			);

			for (const child of nonNestedChildren as Node[]) {
				if (child.nodeName === 'BR') {
					const formatRanges: any[] = [];
					const text = this.processChildNodes(currentLineNodes, formatRanges);
					if (text.trim() || lines.length > 0) {
						const trimmedText = text.trim();
						const leadingSpaces = text.length - text.trimStart().length;
						if (leadingSpaces > 0) {
							for (const range of formatRanges) {
								range.start = Math.max(0, range.start - leadingSpaces);
								range.end = Math.max(0, range.end - leadingSpaces);
							}
						}
						lines.push({ text: trimmedText, isPrimary: isPrimaryLine, formatRanges });
					}
					currentLineNodes = [];
					isPrimaryLine = false;
				} else {
					currentLineNodes.push(child);
				}
			}

			if (currentLineNodes.length > 0) {
				const formatRanges: any[] = [];
				const text = this.processChildNodes(currentLineNodes, formatRanges);
				if (text.trim()) {
					const trimmedText = text.trim();
					const leadingSpaces = text.length - text.trimStart().length;
					if (leadingSpaces > 0) {
						for (const range of formatRanges) {
							range.start = Math.max(0, range.start - leadingSpaces);
							range.end = Math.max(0, range.end - leadingSpaces);
						}
					}
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
			const nestedLists = Array.from((listItem as any).children).filter(
				(child: any) => child.nodeName === 'UL' || child.nodeName === 'OL',
			);

			for (const nestedList of nestedLists) {
				const nestedResult = this.processListItemsRecursively(nestedList, level + 1, bulletPreset);
				items.push(...nestedResult.items);
			}
		}

		return { items };
	}

	/**
	 * Process table element with accurate cell indexing and formatting support
	 */
	static processTable(element: any, insertIndex: number): GoogleDocsRequest[] {
		const requests: GoogleDocsRequest[] = [];

		// Extract table data with proper formatting support
		const rows = element.querySelectorAll('tr');
		const tableData: Array<
			Array<{
				content: string;
				formatRanges: Array<{ start: number; end: number; type: string; url?: string }>;
				isHeader: boolean;
			}>
		> = [];

		for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
			const row = rows[rowIndex];
			const cells = row.querySelectorAll('th, td');
			const rowData: Array<{
				content: string;
				formatRanges: Array<{ start: number; end: number; type: string; url?: string }>;
				isHeader: boolean;
			}> = [];

			for (const cell of cells) {
				const isHeader = cell.nodeName === 'TH' || rowIndex === 0; // First row or TH elements
				const formatRanges: Array<{ start: number; end: number; type: string; url?: string }> = [];

				// Use processChildNodes to extract text and formatting from cell content
				let cellContent = '';
				if (this.hasInlineFormatting(cell)) {
					cellContent = this.processChildNodes(cell.childNodes, formatRanges);
				} else {
					cellContent = cell.textContent.trim();
				}

				rowData.push({
					content: cellContent,
					formatRanges: formatRanges,
					isHeader: isHeader,
				});
			}
			tableData.push(rowData);
		}

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

						// Apply inline formatting from processChildNodes
						for (const range of cellData.formatRanges) {
							const formatRequest = this.createFormatRequest(range, textPosition);
							if (formatRequest) {
								requests.push(formatRequest);
							}
						}

						// Apply header formatting (bold + center alignment)
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

						currentCellIndex += cellData.content.length + 2; // +2 for cell boundary
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

				// Add extra spacing between rows
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

		// Add header if exists
		if (tableData.length > 0) {
			tableText += 'Headers: ' + tableData[0].join(', ') + '\n';

			// Add data rows
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
	static processBlockquote(element: any, insertIndex: number): GoogleDocsRequest[] {
		const requests: GoogleDocsRequest[] = [];

		// Check if blockquote has inline formatting
		if (this.hasInlineFormatting(element)) {
			// Process with inline formatting
			const formatRanges: Array<{ start: number; end: number; type: string; url?: string }> = [];
			const textContent = this.processChildNodes(element.childNodes, formatRanges);
			const fullText = textContent + '\n'; // remove one newline

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
						endIndex: insertIndex + fullText.length - 1, // -2 for the \n\n | -1 for the \n
					},
					paragraphStyle: {
						indentStart: {
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
					fields: 'indentStart,borderLeft',
				},
			});
		} else {
			// Simple blockquote without formatting
			const text = element.textContent.trim();
			const fullText = text + '\n'; // remove one newline

			requests.push({
				insertText: {
					location: { index: insertIndex },
					text: fullText,
				},
			});

			// Apply blockquote paragraph style
			requests.push({
				updateParagraphStyle: {
					range: {
						startIndex: insertIndex,
						endIndex: insertIndex + fullText.length - 1, // -2 for the \n\n | -1 for the \n
					},
					paragraphStyle: {
						indentStart: {
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
					fields: 'indentStart,borderLeft',
				},
			});
		}

		return requests;
	}

	/**
	 * Process code block (PRE element)
	 */
	static processCodeBlock(element: any, insertIndex: number): GoogleDocsRequest[] {
		const text = element.textContent;

		return [
			{
				insertText: {
					location: { index: insertIndex },
					text: text + '\n', // remove one newline
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
		// Since Google Docs API doesn't support direct HorizontalRule insertion,
		// we'll create a paragraph with a bottom border to simulate a horizontal line
		const hrText = '\n'; // Empty paragraph that will have a bottom border

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
		// Find the last insertText request to get the most accurate next position
		const lastInsertTextRequest = requests.filter((req) => req.insertText).pop();

		if (
			lastInsertTextRequest &&
			lastInsertTextRequest.insertText &&
			lastInsertTextRequest.insertText.location
		) {
			// Calculate next index based on the last text insertion
			const lastIndex = lastInsertTextRequest.insertText.location.index;
			const lastTextLength = lastInsertTextRequest.insertText.text.length;
			let newIndex = lastIndex + lastTextLength;

			return newIndex;
		}

		// This should never happen as we always have insertText requests
		return 1;
	}

	/**
	 * Process image elements (IMG) using Google Docs API insertInlineImage
	 */
	static processImage(element: any, insertIndex: number): GoogleDocsRequest[] {
		const src = element.getAttribute('src') || '';
		const alt = element.getAttribute('alt') || 'Image';
		const width = element.getAttribute('width');
		const height = element.getAttribute('height');

		// Validate URL - must be publicly accessible and under 2KB
		if (!src || src.length > 2000) {
			// Fallback to text representation for invalid URLs
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
				text: '\n', // Add a newline before the image
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

		// add newline after the image (no alt text caption for valid images)
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
						startIndex: insertIndex + displayText.length + 1, // +1 for newline
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

			// Check if it's HTTP/HTTPS
			if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
				return false;
			}

			// Check for common image extensions
			const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
			const pathname = parsedUrl.pathname.toLowerCase();
			const hasImageExtension = imageExtensions.some((ext) => pathname.endsWith(ext));

			// Accept if has image extension or looks like an image service URL
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

		// Remove units and parse number
		const numericValue = parseFloat(dimension.replace(/[^\d.]/g, ''));

		if (isNaN(numericValue) || numericValue <= 0) {
			return 0;
		}

		// Convert pixels to points if needed (1px = 0.75pt approximately)
		if (dimension.toLowerCase().includes('px')) {
			return numericValue * 0.75;
		}

		// Default to points or treat plain numbers as points
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
