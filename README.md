# n8n-nodes-md-to-docs

![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

![n8n-nodes-md-to-docs](https://img.shields.io/badge/n8n-community--node-ff6d5a)

This is an n8n community node. It lets you use **Markdown to Google Docs** conversion in your n8n workflows.

**Google Docs** is a popular online document editor that allows you to create, edit, and collaborate on documents in real time. With this node, you can automate the process of turning Markdown into beautifully formatted Google Docs—no more manual copy-paste!

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

---

[📦 Installation](#installation)
[🛠️ Operations](#operations)
[🔑 Credentials](#credentials)
[✅ Compatibility](#compatibility)
[📖 Usage](#usage)
[🔗 Resources](#resources)
[📅 Version history](#version-history)

## Installation

Install in your n8n instance:

```bash
npm install n8n-nodes-md-to-docs
```

**⚠️ Important: Restart n8n server after installation** - The node requires a complete server restart to load properly.

For self-hosted installations, make sure your n8n instance can install npm dependencies (cheerio, marked).

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### Version Compatibility

- **Latest (0.3.5+)**: Full compatibility with self-hosted n8n installations
- **0.3.1-0.3.4**: Deprecated due to class loading issues - use 0.3.5+

---

## Operations

- **Create Document**: Instantly create a Google Docs document from Markdown content.
- **Export Google Doc**: Export existing Google Docs to Markdown, PDF, or Plain Text formats.
- **Convert to API Requests**: Transform Markdown into Google Docs API request JSON (for advanced HTTP Request node usage).
- **Test Credentials**: Verify your Google API credentials and permissions.

---

## Credentials

This node requires Google API credentials to authenticate with Google Docs and Google Drive services.

### 🚀 Prerequisites

- **Google Cloud Account** - Free tier available
- **Google Cloud Project** - Create one in [Google Cloud Console](https://console.cloud.google.com/)
- **n8n Instance** - Running version 1.0.0 or higher

### 🔧 Authentication Methods

- OAuth2 (Recommended)
  - Best for personal and small team use
  - User-friendly consent flow
  - Automatic token refresh

### ⚙️ Quick Setup

⚠️ **Important**: This node requires Google API credentials to function.

📖 **Detailed Setup Guide**: See [Google Cloud Console Documentation](https://cloud.google.com/docs/authentication/getting-started) for complete OAuth2 setup instructions.

**Essential Steps**:

1. **🌐 Enable APIs** in Google Cloud Console:
   - **Google Docs API**
   - **Google Drive API**

2. **🔐 Create OAuth2 Credentials** with required scopes:
   - `https://www.googleapis.com/auth/documents`
   - `https://www.googleapis.com/auth/drive`

3. **⚡ Configure Credential** in n8n:
   - Add new **Google OAuth2 API** credential
   - Enter your Client ID and Client Secret
   - Complete OAuth flow

4. **✅ Verify Setup**:
   - Use **Test Credentials** operation
   - Check for successful connection

---

## Compatibility

**Minimum Requirements:**

- **n8n version**: 1.0.0 or higher
- **Node.js**: 20.15.0 or higher
- **API Version**: n8n Nodes API v1

**Tested Versions:**

- ✅ n8n v1.82.0+ (latest stable)
- ✅ n8n v1.70.0+ (recent versions)
- ✅ Node.js v20.15.0+ (LTS)

**Known Compatibility:**

- ✅ **Google APIs**: Docs API v1, Drive API v3
- ✅ **Google Drive Types**: My Drive, Shared Drives, and Shared with Me
- ✅ **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+
- ✅ **AI Agents**: Compatible with `usableAsTool: true`
- ✅ **Community Nodes**: Full n8n community node standards

**Potential Issues:**

- ⚠️ **Older n8n versions** (< 1.0.0): May not support latest node API features
- ⚠️ **Node.js < 20**: Not tested and may have compatibility issues
- ⚠️ **Google API changes**: Will be updated as needed

---

## Usage

This node provides powerful Markdown to Google Docs conversion with advanced formatting capabilities. Here's how to use it effectively:

### 🚀 Quick Start

1. **Add the "Markdown to Google Docs" node** to your workflow.
2. **Select the "Create Document" operation** (this is the default).
3. **Choose your Google Drive and destination Folder** where the document will be created.
4. **Set a Title** for your new document.
5. **Input your Markdown content** in the text area.
6. **(Optional) Use "Additional Options"** to create a document from a template or use placeholders.
7. **Execute the node!** Your document will be created in the specified location.

**Pro tip:** Supports advanced formatting, images (via public URLs), tables, checkboxes, and even deep list nesting.

*For more help, see the [n8n Try it out documentation](https://docs.n8n.io/getting-started/try-it-out/).*

---

### 🎯 Key Features

**✨ Core Capabilities**:

- Full Markdown to Google Docs conversion
- Headers, bold/italic, links, lists, code blocks
- Multiple output formats (single/multiple requests)
- AI Agent Tool compatibility (`usableAsTool: true`)

**🚀 Advanced Features**:

- **Nested Formatting**: Complex combinations like **bold and *italic* together**
- **Smart Tables**: Header styling (bold + centered) with full cell formatting and vertical alignment
- **Page Break Control**: Multiple strategies for automatic page breaks (H1, H2, or custom text markers)
- **Deep Nesting**: Unlimited list levels with proper indentation
- **Image Embedding**: Direct URL-based image insertion with optional sizing
- **Checkbox Lists**: Native Google Docs checkboxes for task lists
- **Precise Positioning**: Accurate text range calculations for Google Docs API

**✨ Template and Text Placeholder System**:

- **Use Any Doc as a Template**: Select any Google Doc from your Drive to use as a template. The node preserves headers and footers, only replacing the body content.
- **Dynamic Text Placeholder Replacement**:
  - Use text placeholders like `{{key}}` anywhere in your template (headers, footers, body).
  - Provide a JSON object with corresponding key-value pairs (e.g., `{ "key": "Your Value" }`) to replace them dynamically.
  - Supports n8n expressions for generating values on the fly.
- **Smart Markdown Injection**:
  - By default, your Markdown input replaces the entire body of the template.
  - Optionally, specify a "Main Content Placeholder" (e.g., `{{MainContent}}`) in your template body. The node will replace only this specific placeholder with your rendered Markdown.
  - The Markdown input can be disabled entirely if you only need to replace simple placeholders.

**📋 Image Support Notes**:

- ✅ **URL-based images**: Direct embedding from public URLs (`![alt](https://example.com/image.png)`)
- ✅ **Optional sizing**: Width/height attributes supported
- ⚠️ **URL requirements**: Must be publicly accessible, under 2KB URL length
- ❌ **Local files**: File uploads not supported (URL-only)

### 🤖 AI Agent Integration

Perfect for AI-powered workflows:

```javascript
// Import the processor
import { MarkdownProcessor } from 'n8n-nodes-md-to-docs';

// AI Agent can automatically use this node
const markdownContent = await aiAgent.generateMarkdown(userInput);
const googleDocsRequests = MarkdownProcessor.convertMarkdownToApiRequests(
  markdownContent,
  'AI Generated Document Title',
  'single'
);
```

**Available in n8n workflows:**

- Node name: `markdownToGoogleDocs`
- AI Tool compatibility: `usableAsTool: true`
- Automatic parameter detection for AI agents

### ✅ Supported Elements

| Element                 | Google Docs Output                                            | Status |
| ----------------------- | ------------------------------------------------------------- | ------ |
| `# Headers`             | Styled headings (H1-H6)                                       | ✅      |
| `**bold**` / `*italic*` | Text formatting + nested combinations                         | ✅      |
| `[links](url)`          | Hyperlinks in any context                                     | ✅      |
| `- lists` / `1. lists`  | Bulleted/numbered with unlimited nesting and multi-line items | ✅      |
| `- [x]` / `- [ ]`       | Native Google Docs checkboxes                                 | ✅      |
| `` `code` ``            | Monospace formatting + syntax highlighting                    | ✅      |
| `\| tables \|`          | Structured tables with header styling and vertical alignment  | ✅      |
| `> quotes`              | Indented blockquote with internal formatting                  | ✅      |
| `---`                   | Horizontal rules                                              | ✅      |
| `![images](url)`        | Embedded images (URL only)                                    | ✅      |

---

## Resources

- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)
- [Google Docs API Reference](https://developers.google.com/docs/api)
- [Markdown Specification](https://spec.commonmark.org/)

---

## Version History

[📅 Full changelog](./CHANGELOG.md)

---

## 🚀 Advanced Examples

### Example Markdown Input

```markdown
# My Document Title

This is a **bold statement** with *italic emphasis*.

## Features List

1. First feature
2. Second feature
   - Sub-feature A
   - Sub-feature B

### Code Example

\`\`\`javascript
const greeting = "Hello World!";
console.log(greeting);
\`\`\`

> Important note: This will be formatted as a blockquote.

![Example Image](https://via.placeholder.com/300x200.png?text=Sample+Image)

| Feature  | Status |
| -------- | ------ |
| **Bold** | ✅     |
| *Italic* | ✅     |
```

### JSON Output Structure

```json
{
  "documentTitle": "My Document Title",
  "createDocumentRequest": {
    "title": "My Document Title"
  },
  "batchUpdateRequest": {
    "requests": [
      {
        "insertText": {
          "location": { "index": 1 },
          "text": "My Document Title\\n\\n"
        }
      },
      {
        "updateTextStyle": {
          "range": { "startIndex": 1, "endIndex": 18 },
          "textStyle": { "bold": true, "fontSize": { "magnitude": 24, "unit": "PT" } },
          "fields": "bold,fontSize"
        }
      }
    ]
  }
}
```

---

## ⚙️ Configuration Options

### Main Parameters

| Parameter | Type | Description |
|---|---|---|
| `operation` | options | "createDocument", "exportGoogleDoc", "convertToApiRequests", or "testCredentials" |
| `driveId` | resourceLocator | The Google Drive to create the document in (create operation) |
| `folderId` | resourceLocator | The folder within the selected drive (create operation) |
| `documentId` | resourceLocator | The Google Docs document to export (export operation) |
| `exportFormat` | options | Export format: "text/markdown", "application/pdf", or "text/plain" (export operation) |
| `documentTitle` | string | Title for the Google Docs document (create operation) |
| `markdownInput` | string | The Markdown content to convert (create operation) |
| `outputFormat`  | options | "single" or "multiple" request format (convert operation) |

### Advanced Options (`additionalOptions`)

The `additionalOptions` parameter provides access to advanced features like templates and placeholders. When you add options, you can configure the following nested structure:

- **`templateSettings`** (`fixedCollection`): Enables creation from a template.
  - **`templateFolderId`** (`resourceLocator`): The folder containing the Google Docs templates.
  - **`templateDocumentId`** (`resourceLocator`): The specific template document to use.
  - **`placeholders`** (`collection`): Enables placeholder replacement within the selected template.
    - **`placeholderSettings`** (`fixedCollection`): Contains settings for placeholder data and Markdown injection.
      - **`placeholderData`** (`json`): A JSON object of key-value pairs for placeholders (e.g., `{ "key": "value" }`).
      - **`useMarkdownInput`** (`boolean`): Whether to use the Markdown content. If disabled, the node only replaces placeholders.
      - **`mainContentPlaceholder`** (`string`): The specific placeholder (e.g., `{{MainContent}}`) to be replaced by the Markdown content. If not specified, the entire document body is replaced.

- **`pageBreakSettings`** (`fixedCollection`): Controls automatic page break insertion.
  - **`pageBreakStrategy`** (`options`): Choose when to insert page breaks:
    - `"h1"`: Before each H1 heading (except the first)
    - `"h2"`: Before each H2 heading (default)
    - `"custom"`: Replace custom text markers with page breaks
  - **`customPageBreakText`** (`string`): Custom text marker to replace with page breaks (e.g., `"<!-- pagebreak -->"`, `"---pagebreak---"`). Only used when strategy is "custom".

---

## 🛠️ Development

### Setup

```bash
git clone <your-repo>
cd n8n-nodes-md-to-docs
npm install
```

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
npm run lintfix
```

### Test Locally

```bash
# Link for local development
npm link
cd ~/.n8n/nodes
npm link n8n-nodes-md-to-docs
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 🗺️ Roadmap

✅ **Completed Features**

- [x] **Advanced Table Support**: Complete table conversion with header formatting (bold + centered) and cell-level formatting
- [x] **Table Vertical Alignment**: Global vertical centering for all table cells with preserved header styling
- [x] **Page Break Control**: Multiple strategies for automatic page breaks (H1, H2, or custom text markers)
- [x] **Nested Formatting**: Complex combinations like **bold and *italic* together** with perfect range calculations
- [x] **Deep List Nesting**: Unlimited levels of nested lists with proper Google Docs bullet handling
- [x] **Smart Range Calculations**: Precise text positioning accounting for Google Docs API behavior
- [x] **Mixed Content Formatting**: Bold, italic, code, and links working in all contexts (lists, tables, quotes)
- [x] **Comprehensive Markdown Support**: Headers, paragraphs, blockquotes, code blocks, horizontal rules
- [x] **Direct Integration**: One-click document creation with `createDocument` operation - no HTTP Request node needed
- [x] **Checkbox Lists**: Native Google Docs checkboxes for `- [x]` and `- [ ]` syntax with proper checked/unchecked states
- [x] **Image Support**: Convert Markdown images to Google Docs embedded images (URL-based only)
- [x] **Template and Text Placeholder System**: Create documents from a template, preserving headers/footers and replacing dynamic text `{{placeholders}}`.
- [x] **Enhanced List Support**: Flawless rendering of multi-line and deeply nested list items with accurate inline formatting.
- [x] **Google Docs Export**: Export existing Google Docs to Markdown, PDF, or Plain Text with automatic output handling and optional Drive save.

🚀 **Future Enhancements**

- [ ] **Local Image Upload**: Support for local image file uploads and conversion
- [ ] **Advanced Table Features**: Column alignment, table styling options, merged cells
- [ ] **Custom Styling**: User-defined fonts, colors, and spacing
- [ ] **Batch Processing**: Handle multiple Markdown files in a single operation
- [ ] **Batch Export**: Export multiple documents or entire folders at once
- [ ] **Collaborative Features**: Document sharing and permission management

---

## 📄 License

MIT © [Georgi Kyosev](mailto:g.kyosev86@gmail.com)

---

Made with ❤️ for the n8n community

---

**Tags:** n8n, markdown, google-docs, automation, community-node, n8n-workflow, document-generation
