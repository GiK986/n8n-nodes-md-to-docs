# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.2] - 2025-09-11

### Fixed

- **Shared Drive API Optimization**: Simplified and optimized Google Drive API parameter handling
  - Removed conditional `needsSharedDriveParams` logic - now always applies `supportsAllDrives` and `includeItemsFromAllDrives` parameters for all Drive API calls
  - These parameters are safely ignored for personal accounts and enable proper Shared Drive access for enterprise accounts
  - Removed unnecessary parameters from Google Docs API calls (batchUpdate operations don't need Drive-specific parameters)
- **Enhanced Error Handling**: Added comprehensive error logging and specific error messages for document creation failures
  - Added detailed console logging for debugging document creation issues
  - Improved error messages with specific guidance for 404 (folder not found) and 403 (permission denied) errors
- **Resource Locator Improvements**: Better folder listing behavior for Shared Drives
  - Fixed root folder display logic to only show for My Drive operations
  - Added proper corpora parameter for Shared Drive folder searches
- **OAuth Scope Update**: Changed from `drive.file` to `drive` scope for broader Google Drive access

### Technical

- Cleaned up API parameter handling across all Google Drive operations
- Enhanced credential testing with comprehensive Shared Drive support verification
- Improved folder name resolution with proper Drive API parameters

## [0.5.1] - 2025-09-10

### Fixed

- **Shared Drive Support**: Fixed timeout issues when creating documents in Google Shared Drives
  - Added automatic detection of Shared Drive operations based on `driveId` parameter
  - Include required `supportsAllDrives` and `includeItemsFromAllDrives` parameters for Shared Drive API calls
  - Applied fix to template copying, document creation, and folder name fetching operations
  - Maintains full backward compatibility with My Drive operations

## [0.5.0] - 2025-08-29

### Added

- **Page Break Control**: New page break functionality with multiple strategies
  - **H2 Strategy**: Automatically insert page breaks before each H2 heading (default)
  - **H1 Strategy**: Insert page breaks before each H1 heading (except the first)
  - **Custom Strategy**: Replace custom text markers (e.g., `<!-- pagebreak -->`) with page breaks
  - New `Page Break Settings` in Additional Options with grouped UI using fixedCollection
  - Proper index calculation accounting for page breaks taking 2 positions (break + newline)

- **Table Vertical Alignment**: Global vertical centering for all table cells
  - All table cells now have `contentAlignment: "MIDDLE"` for consistent vertical centering
  - Preserves existing header row formatting (bold + horizontal center + vertical center)
  - Uses proper Google Docs API `updateTableCellStyle` with correct `tableRange` structure
  - Applied after table content creation for proper API sequencing

### Technical

- Extended `GoogleDocsRequest` type with `insertPageBreak` and `updateTableCellStyle` interfaces
- Added page break processing logic in `processHeading` with proper index management
- Updated `calculateNewIndex` to account for page break positioning
- Implemented custom text replacement for page break markers using regex escaping
- Added support for `tableStartLocation` with correct index offset (+1) for table styling

### Fixed

- **Empty Table Cell Handling**: Removed unnecessary text insertion for empty table cells
- **Page Break Positioning**: Correct sequence of page break → heading → content for clean document flow
- **Table Cell Index Calculation**: Fixed `tableStartLocation` index to use `insertIndex + 1` for proper API compatibility

## [0.4.0] - 2025-08-23

### Added

- **Google Docs Export Operation**: New `exportGoogleDoc` operation to export existing Google Docs to various formats
  - Export to Markdown (.md), PDF (.pdf), or Plain Text (.txt)
  - Automatic output mode determination (content for text formats, binary for PDF)
  - Optional Google Drive save functionality with folder selection
  - Document resource locator for easy document selection (list/URL/ID modes)
  - Custom filename support with Unicode character handling
  - Proper binary data handling for PDF exports in n8n workflows

### Fixed

- **Checkbox Formatting**: Fixed formatting range calculation for bold text in checkbox list items
  - Adjusted range start/end by -1 offset to account for checkbox prefix positioning
  - Bold text in `- [x] **task**` format now renders correctly in Google Docs

### Technical

- Added DocumentExportResult interface for type safety
- Created GoogleDocsExporter class for export operations
- Extended resource locators with getDocuments method for document selection
- Enhanced main node with export operation handling and binary data processing

## [0.3.6] - 2025-08-23

### Fixed

- **List Index Calculations**: Fixed incorrect index calculations for list elements after bullet processing
  - Corrected calculateNewIndex() method to properly account for tab removal in bullet lists
  - Resolved paragraph styling range errors that occurred when tabs are stripped by Google Docs API
  - Lists with nested items now render with correct formatting and spacing

## [0.3.5] - 2025-08-07

### Fixed

- **Package Loading**: Resolved critical n8n compatibility issues
  - Fixed "Class could not be found" errors in n8n installations
  - Restored proper TypeScript named exports (exports.MarkdownToGoogleDocs)
  - Added cheerio and marked as runtime dependencies for self-hosted installations
  - Requires n8n server restart after installation for proper loading

### Technical Notes

- Versions 0.3.1-0.3.4 were deprecated due to class loading issues
- Self-hosted n8n installations now work properly with runtime dependencies
- Cloud version compatibility may require bundled approach (future consideration)

## [0.3.1] - 2025-08-06 (DEPRECATED)

### Changed

- **Performance Improvements**: Migrated from jsdom to cheerio for HTML parsing
  - Significantly reduced bundle size by removing heavy jsdom dependency
  - Faster HTML processing with cheerio's server-side DOM manipulation
  - Improved build performance by switching from TypeScript compiler to esbuild
- **Enhanced TypeScript Support**: Added proper type safety throughout the codebase
  - Introduced proper TypeScript types from domhandler (Element, ChildNode)
  - Added type guards (isTag, isText) for runtime type safety
  - Comprehensive type definitions for FormatRange, LineMetadata, and TextStyle interfaces
- **Code Quality**: Improved code maintainability and reliability
  - Fixed all unused variable warnings
  - Better error handling and edge case coverage
  - Consistent API usage across all DOM operations

### Fixed

- **Improved Spacing**: Enhanced visual formatting for lists and blockquotes
  - Lists and blockquotes now use proper paragraph spacing instead of manual newlines
  - Better separation between document elements without excessive whitespace
  - Consistent spacing behavior across different content types

### Technical

- Moved `cheerio` and `marked` to devDependencies for cleaner production installs
- Updated build system to use esbuild for better bundling performance
- Removed jsdom dependency entirely
- Enhanced type definitions in types.ts for better developer experience

## [0.3.0] - 2025-08-01

### ⚠️ Breaking Changes

- **UI Overhaul for Templates**: The node's UI for handling templates has been redesigned to support the new placeholder system.
  - The `useTemplate` toggle has been **removed**. Template usage is now enabled by adding "Template Settings" from the new `Additional Options` menu.
  - The `templateFolderId` and `templateDocumentId` fields have been **moved** inside the new "Template Settings" group.
  - **Action Required**: Workflows using the old template system **must be reconfigured** to use the new `Additional Options` structure.

### Added

- **Text Placeholder Support**: Added support for replacing text placeholders within the template.
  - Replaces text placeholders like `{{key}}` anywhere in a template (header, footer, body) by providing a corresponding key-value pair in the `placeholderData` field.
  - Supports n8n expressions for on-the-fly value generation.
- **Conditional Markdown Injection**:
  - A `useMarkdownInput` toggle now controls whether the Markdown content is injected into the document.
  - An optional `mainContentPlaceholder` field allows injecting Markdown at a specific location (e.g., `{{MainContent}}`) within the template body.
- **UI Enhancements**:
  - Added a `notice` to warn users when the `markdownInput` field is empty but might be required.
  - Improved hints and placeholder examples for a better user experience.

### Changed

- **New UI Structure**: All optional features (Templates, Placeholders) are now grouped under a single, cleaner `Additional Options` collection. This simplifies the main interface and progressively discloses complexity.

## [0.2.1] - 2025-07-28

### Fixed

- Reworked list processing to correctly handle multi-line and deeply nested list items. This resolves issues with incorrect indentation and formatting on nested content.

## [0.2.0] - 2025-07-28
<!-- markdownlint-disable MD024 -->
### Added

- **Template System**: Users can now create Google Docs from a template. This feature preserves the header and footer of the template, allowing for consistent document styling.
  - Added a `useTemplate` boolean option to enable/disable this feature.
  - New `templateFolderId` dropdown to select the folder containing templates.
  - New `templateDocumentId` dropdown to select the specific template document from the chosen folder.

## [0.1.1] - 2025-07-20
<!-- markdownlint-disable MD024 -->
### Fixed

- Fixed BR tag conversion to newlines in Google Docs
- Improved inline formatting for multi-line paragraphs
- Better handling of contact information and addresses

### Technical Changes

- Added 'BR' to formattingTags in hasInlineFormatting()
- Modified processChildNodes() to convert BR tags to '\n' characters
- Removed unnecessary logic from switch statement

### Example

Before: Contact information was displayed as a single line without proper breaks.
After: Multi-line contact information now displays properly with line breaks:

```txt
Name: Example Company Ltd.
ID: 000000000
Address: 123 Example Street, City, Country
Phone: +00 123 456 789
Email: info@example.com
```

## [0.1.0] - 2025-07-13

### Added

- Initial release of n8n-nodes-md-to-docs
- Convert Markdown to Google Docs API requests
- Support for headings (H1-H6)
- Support for paragraphs with inline formatting (bold, italic, links)
- Support for unordered and ordered lists with nesting
- Support for tables with formatting
- Support for blockquote
- Support for code blocks
- Support for horizontal rules
- Support for images with fallback text
- Checkbox list support
- Multiple output formats (single batch request or individual requests)
