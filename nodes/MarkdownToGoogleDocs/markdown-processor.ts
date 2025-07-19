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
		apiReadyFormat: boolean = false,
	): ConversionResult {
		// Fix escaped characters from n8n
		const cleanMarkdown = markdownInput.replace('\`', '`'); // Fix single backtick escape for testing strings
		// .replace(/\\n/g, '\n')
		// .replace(/\\t/g, '\t')
		// .replace(/\\`/g, '`')
		// .replace(/\\"/g, '"');

		// Convert markdown to HTML
		const html = marked.parse(cleanMarkdown, { async: false }) as string;
		const dom = new JSDOM(html);
		const document = dom.window.document;

		const requests: GoogleDocsRequest[] = [];
		let insertIndex = 1; // Start after document title

		// // Add document title
		// if (documentTitle) {
		// 	requests.push({
		// 		insertText: {
		// 			location: { index: 1 },
		// 			text: documentTitle + '\n\n',
		// 		},
		// 	});
		// 	insertIndex += documentTitle.length + 2;
		// }

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

		// Check if paragraph has inline formatting
		if (this.hasInlineFormatting(element)) {
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
		const formattingTags = ['STRONG', 'B', 'EM', 'I', 'CODE', 'A'];
		return formattingTags.some((tag) => element.querySelector(tag.toLowerCase()));
	}

	/**
	 * Process paragraph with inline formatting
	 */
	static processParagraphWithInlineFormatting(
		element: any,
		insertIndex: number,
	): GoogleDocsRequest[] {
		const requests: GoogleDocsRequest[] = [];
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
		return this.processList(element, insertIndex, 'BULLET_DISC_CIRCLE_SQUARE');
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

		// Process list items recursively to handle nesting
		const processedData = this.processListItemsRecursively(element, 0);

		// Store formatting data to apply AFTER createParagraphBullets
		const formattingData: Array<{
			range: { start: number; end: number; type: string; url?: string };
			itemStartIndex: number; // Start of the item WITH tabs
			itemLevel: number; // Number of tabs that will be removed
		}> = [];

		// adding a newline before the list
		requests.push({
			insertText: {
				location: { index: insertIndex },
				text: '\n', // Add a newline before the list
			},
		});
		// Move index after the newline
		currentIndex += 1;


		// Insert all text content with leading tabs for nesting levels
		// Google Docs API determines nesting by counting leading tabs
		for (const item of processedData.items) {
			// Add leading tabs based on nesting level for Google Docs API
			const leadingTabs = '\t'.repeat(item.level);
			const textWithTabs = leadingTabs + item.text;

			requests.push({
				insertText: {
					location: { index: currentIndex },
					text: textWithTabs + '\n',
				},
			});

			// Store formatting data for later application (AFTER createParagraphBullets)
			for (const range of item.formatRanges) {
				formattingData.push({
					range: {
						start: range.start, // Keep original range (relative to item text WITHOUT tabs)
						end: range.end, // Keep original range (relative to item text WITHOUT tabs)
						type: range.type,
						url: range.url,
					},
					itemStartIndex: currentIndex, // Start of the item (WITH tabs)
					itemLevel: item.level, // Number of tabs that will be removed from this item
				});
			}

			currentIndex += textWithTabs.length + 1; // +1 for newline
		}

		// Apply bullet formatting with proper nesting levels using Google Docs standard
		if (processedData.items.length > 0) {
			// Calculate the actual end index of the list content (without extra newline)
			const listStartIndex = insertIndex + 1; // Start after the initial newline
			const listEndIndex = currentIndex - 1; // End of actual list content

			// First, create the paragraph bullets for the entire list
			// Note: This will remove the leading tabs and change indices of subsequent text
			requests.push({
				createParagraphBullets: {
					range: {
						startIndex: listStartIndex,
						endIndex: listEndIndex,
					},
					bulletPreset,
				},
			});

			// Now apply all inline formatting AFTER createParagraphBullets

			for (const formatData of formattingData) {
				// For each formatData, we need to calculate how many tabs were removed
				// from ALL items that appear BEFORE this item in the list
				let tabsRemovedBefore = 0;
				let currentPos = insertIndex;

				// Go through all items and count tabs from items that come before this formatData
				for (const item of processedData.items) {
					const itemTextWithTabs = '\t'.repeat(item.level) + item.text;
					const itemStartPos = currentPos;

					if (itemStartPos === formatData.itemStartIndex) {
						// Found our item - stop counting tabs
						break;
					} else if (itemStartPos < formatData.itemStartIndex) {
						// This item comes before ours - count its tabs
						tabsRemovedBefore += item.level;
					}

					currentPos += itemTextWithTabs.length + 1; // Move to next item position
				}

				const adjustedBaseIndex = formatData.itemStartIndex - tabsRemovedBefore;

				const formatRequest = this.createFormatRequest(
					{
						start: formatData.range.start,
						end: formatData.range.end,
						type: formatData.range.type,
						url: formatData.range.url,
					},
					adjustedBaseIndex,
				);
				if (formatRequest) {
					requests.push(formatRequest);
				}
			}
		}

		// Add extra line break after the list (AFTER createParagraphBullets)
		// Calculate the correct position after all tabs are removed
		// The list ends at listEndIndex (which is currentIndex - 1)
		// After createParagraphBullets, tabs are removed, so we need to adjust
		const tabsRemoved = processedData.items.reduce((total, item) => total + item.level, 0);
		const adjustedEndIndex = currentIndex - 1 - tabsRemoved; // listEndIndex after tab removal

		requests.push({
			insertText: {
				location: { index: adjustedEndIndex + 1 }, // Insert after the adjusted list end
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
	): {
		items: Array<{
			text: string;
			level: number;
			formatRanges: Array<{ start: number; end: number; type: string; url?: string }>;
		}>;
	} {
		const items: Array<{
			text: string;
			level: number;
			formatRanges: Array<{ start: number; end: number; type: string; url?: string }>;
		}> = [];

		// Get direct children li elements only (not nested ones)
		const directListItems = Array.from(element.children).filter(
			(child: any) => child.nodeName === 'LI',
		);

		for (const listItem of directListItems) {
			const formatRanges: Array<{ start: number; end: number; type: string; url?: string }> = [];

			// Extract text content from this list item (excluding nested lists)
			// Process ALL child nodes together to maintain proper formatting positions
			const nonNestedChildren = Array.from((listItem as any).childNodes).filter(
				(child: any) => (child as any).nodeName !== 'UL' && (child as any).nodeName !== 'OL',
			);

			// Process all non-nested children together like in processParagraphWithInlineFormatting
			const itemText = this.processChildNodes(nonNestedChildren, formatRanges);

			// Add this item
			items.push({
				text: itemText.trim(),
				level: level,
				formatRanges: formatRanges,
			});

			// Process nested lists
			const nestedLists = Array.from((listItem as any).children).filter(
				(child: any) => child.nodeName === 'UL' || child.nodeName === 'OL',
			);

			for (const nestedList of nestedLists) {
				const nestedResult = this.processListItemsRecursively(nestedList, level + 1);
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
			console.warn('Table insertion failed, using text fallback:', error);
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
	 * Get heading style type for Google Docs
	 */
	static getHeadingStyleType(depth: number): string {
		const styles = ['HEADING_1', 'HEADING_2', 'HEADING_3', 'HEADING_4', 'HEADING_5', 'HEADING_6'];
		return styles[depth - 1] || 'NORMAL_TEXT';
	}
}
