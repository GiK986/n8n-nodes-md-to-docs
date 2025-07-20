# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2025-07-20

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
- Support for blockquotes
- Support for code blocks
- Support for horizontal rules
- Support for images with fallback text
- Checkbox list support
- Multiple output formats (single batch request or individual requests)
