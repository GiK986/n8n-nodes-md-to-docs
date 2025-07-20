# n8n-nodes-md-to-docs

![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

![n8n-nodes-md-to-docs](https://img.shields.io/badge/n8n-community--node-ff6d5a)

This is an n8n community node. It lets you use Markdown to Google Docs conversion in your n8n workflows.

This node transforms Markdown content into fully formatted Google Docs documents, handling complex elements like nested lists, tables with styling, and mixed text formatting through Google's Docs API.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

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

Restart n8n to load the new node.

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

- **Create Document**: Directly create a Google Docs document with Markdown content
- **Convert to API Requests**: Transform Markdown into Google Docs API request JSON
- **Test Credentials**: Verify Google API credentials and permissions

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
   - `https://www.googleapis.com/auth/drive.file`

3. **⚡ Configure Credential** in n8n:
   - Add new **Google OAuth2 API** credential
   - Enter your Client ID and Client Secret
   - Complete OAuth flow

4. **✅ Verify Setup**:
   - Use **Test Credentials** operation
   - Check for successful connection

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
- ✅ **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+
- ✅ **AI Agents**: Compatible with `usableAsTool: true`
- ✅ **Community Nodes**: Full n8n community node standards

**Potential Issues:**

- ⚠️ **Older n8n versions** (< 1.0.0): May not support latest node API features
- ⚠️ **Node.js < 20**: Not tested and may have compatibility issues
- ⚠️ **Google API changes**: Will be updated as needed

## Usage

This node provides powerful Markdown to Google Docs conversion with advanced formatting capabilities. Here's how to use it effectively:

### 🚀 Quick Start

1. **Add the "Markdown to Google Docs" node** to your workflow
2. **Input your Markdown content** in the text area  
3. **Choose operation**:
   - **"Create Document"** - Direct document creation (recommended)
   - **"Convert to API Requests"** - Get JSON for HTTP Request node
4. **Configure document title** and output format
5. **Execute** - The node handles the Google Docs API calls

### 🎯 Key Features

**✨ Core Capabilities:**

- Full Markdown to Google Docs conversion
- Headers, bold/italic, links, lists, code blocks
- Multiple output formats (single/multiple requests)
- AI Agent Tool compatibility (`usableAsTool: true`)

**🚀 Advanced Features:**

- **Nested Formatting**: Complex combinations like **bold and *italic* together**
- **Smart Tables**: Header styling (bold + centered) with full cell formatting
- **Deep Nesting**: Unlimited list levels with proper indentation
- **Precise Positioning**: Accurate text range calculations for Google Docs API
- **Image Embedding**: Direct URL-based image insertion with optional sizing
- **Checkbox Lists**: Native Google Docs checkboxes for task lists

**📋 Image Support Notes:**

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

| Element | Google Docs Output | Status |
|---------|-------------------|--------|
| `# Headers` | Styled headings (H1-H6) | ✅ |
| `**bold**` / `*italic*` | Text formatting + nested combinations | ✅ |
| `[links](url)` | Hyperlinks in any context | ✅ |
| `- lists` / `1. lists` | Bulleted/numbered with unlimited nesting | ✅ |
| `- [x]` / `- [ ]` | Native Google Docs checkboxes | ✅ |
| `` `code` `` | Monospace formatting + syntax highlighting | ✅ |
| `\| tables \|` | Structured tables with header styling | ✅ |
| `> quotes` | Indented blockquotes with internal formatting | ✅ |
| `---` | Horizontal rules | ✅ |
| `![images](url)` | Embedded images (URL only) | ✅ |

## Resources

- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)
- [Google Docs API Reference](https://developers.google.com/docs/api)
- [Markdown Specification](https://spec.commonmark.org/)

## Version History

**v0.1.0** - Initial Release

- Core Markdown to Google Docs conversion
- Advanced table formatting with header styling
- Nested formatting support (bold + italic combinations)
- Deep list nesting with proper Google Docs bullets
- AI Agent Tool compatibility
- Multiple output formats (single/multiple requests)

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

## ⚙️ Configuration Options

| Parameter       | Type    | Description                                |
| --------------- | ------- | ------------------------------------------ |
| `markdownInput` | string  | The Markdown content to convert            |
| `documentTitle` | string  | Title for the Google Docs document         |
| `operation`     | options | "convertToApiRequests" or "createDocument" |
| `outputFormat`  | options | "single" or "multiple" request format      |

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

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🗺️ Roadmap

✅ **Completed Features**

- [x] **Advanced Table Support**: Complete table conversion with header formatting (bold + centered) and cell-level formatting
- [x] **Nested Formatting**: Complex combinations like **bold and *italic* together** with perfect range calculations
- [x] **Deep List Nesting**: Unlimited levels of nested lists with proper Google Docs bullet handling
- [x] **Smart Range Calculations**: Precise text positioning accounting for Google Docs API behavior
- [x] **Mixed Content Formatting**: Bold, italic, code, and links working in all contexts (lists, tables, quotes)
- [x] **Comprehensive Markdown Support**: Headers, paragraphs, blockquotes, code blocks, horizontal rules
- [x] **Direct Integration**: One-click document creation with `createDocument` operation - no HTTP Request node needed
- [x] **Checkbox Lists**: Native Google Docs checkboxes for `- [x]` and `- [ ]` syntax with proper checked/unchecked states
- [x] **Image Support**: Convert Markdown images to Google Docs embedded images (URL-based only)

🚀 **Future Enhancements**

- [ ] **Local Image Upload**: Support for local image file uploads and conversion
- [ ] **Advanced Table Features**: Column alignment, table styling options, merged cells
- [ ] **Custom Styling**: User-defined fonts, colors, and spacing
- [ ] **Template System**: Pre-defined Google Docs templates with placeholder replacement
- [ ] **Batch Processing**: Handle multiple Markdown files in a single operation
- [ ] **Export Options**: Support for additional output formats (PDF, DOCX)
- [ ] **Collaborative Features**: Document sharing and permission management

## 📄 License

MIT © [Georgi Kyosev](mailto:g.kyosev86@gmail.com)

---

Made with ❤️ for the n8n community
