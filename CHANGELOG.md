# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
