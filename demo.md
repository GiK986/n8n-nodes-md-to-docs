# Markdown to Google Docs Demo

![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

This document demonstrates all supported Markdown features organized from basic to advanced.

---

## 📝 Section 1: Basic Text Formatting

### Paragraphs

This is a simple paragraph. It contains regular text that will be converted to normal text in Google Docs.

This is another paragraph. Paragraphs are separated by blank lines.

### Text Emphasis

Here we have **bold text** and *italic text*.

You can also use **bold text** and *italic text* with underscores.

Mix them: **bold and *italic* together**.

### Inline Code

Use `inline code` for short code snippets or technical terms like `npm install` or `console.log()`.

---

## 🔗 Section 2: Links and Basic Structure

### Links

Visit [Google](https://google.com) for searching.

Here's a link to [n8n documentation](https://docs.n8n.io) for workflow automation.

### Headers Structure
<!-- markdownlint-disable MD025 -->
# Header 1 - Main Title

## Header 2 - Section

### Header 3 - Subsection

#### Header 4 - Sub-subsection

##### Header 5 - Minor heading

###### Header 6 - Smallest heading

---

## 📋 Section 3: Lists and Organization

### Unordered Lists

- First ***item***
- Second item
- Third item with **bold text**
- Fourth item with *italic text*
- Fifth item with `inline code`
  
### Unordered Lists two rows

- First ***item***  
  Description First ***item***
- Second item  
  Description Second *item*
- Third item with **bold text**  
  Description Third **item**

### Nested Lists

- Main item 1
  - Sub item 1.1
  - Sub item 1.2
- Main item 2
  - Sub item 2.1
    - Sub-sub item 2.1.1
    - Sub-sub item 2.1.2

### Ordered Lists

1. First numbered item
2. Second numbered item
3. Third item with **formatting**
4. Fourth item with [a link](https://example.com)
5. Fifth item with `code`

### Mixed Content Lists

- Item with multiple elements:
  - Contains **bold text**
  - Has *italic text*
  - Includes `code snippets`
  - Links to [external resources](https://n8n.io)

### Checkbox List

- [x] **Completed task**
- [ ] **Incomplete task**

---

## 💬 Section 4: Quotes and Code Blocks

### Blockquote

simple

> This is a simple blockquote. It represents quoted text or important information.

complex

> This blockquote contains **bold text** and *italic text* to show that formatting works inside quotes.

multi-line

> Multi-line blockquote
> that spans several lines
> and maintains the quote formatting.

### Code Blocks

```t
Simple code block without syntax highlighting
console.log("Hello World");
const x = 42;
```

```javascript
// JavaScript code block
function greetUser(name) {
    return `Hello, ${name}!`;
}

const user = "Developer";
console.log(greetUser(user));
```

```python
# Python code example
def calculate_sum(a, b):
    return a + b

result = calculate_sum(10, 20)
print(f"The sum is: {result}")
```

---

## 📊 Section 5: Tables and Complex Structures

### Simple Table

| Name    | Age | City     |
| ------- | --- | -------- |
| Alice   | 30  | New York |
| Bob     | 25  | London   |
| Charlie | 35  | Tokyo    |

### Table with Formatting

| Feature        | **Status**     | `Priority` | *Notes*              |
|----------------|----------------|------------|----------------------|
| Authentication | ✅ Complete     | `High`     | *Working well*       |
| File Upload    | 🔄 In Progress | `Medium`   | **Needs testing**    |
| Notifications  | ❌ Pending      | `Low`      | `Code review needed` |

### Complex Table

| Component   | Description           | Example                   | Links                            |
| ----------- | --------------------- | ------------------------- | -------------------------------- |
| **Headers** | Different levels      | `# H1`, `## H2`           | [Docs](https://example.com)      |
| *Lists*     | Ordered and unordered | `1. Item`, `- Item`       | [Guide](https://example.com)     |
| `Code`      | Inline and blocks     | `` `code` ``, ```block``` | [Reference](https://example.com) |

---

## 🎨 Section 6: Advanced Combinations

### Rich Content Paragraph

This paragraph demonstrates **multiple formatting types** working together. It has *italic text*, `inline code`, and even [external links](https://github.com). You can combine **bold and *italic* together** for emphasis.

### Lists with Rich Content

1. **Project Setup**
   - Install dependencies with `npm install`
   - Configure environment variables
   - Review the [documentation](https://docs.n8n.io)

2. **Development Process**
   - Write code with proper **error handling**
   - Add *comprehensive* tests
   - Use `git commit` for version control

3. **Deployment Steps**
   - Build project: `npm run build`
   - Test in *staging environment*
   - Deploy to **production**

### Blockquote with Complex Content
>
> **Important Notice**: This system supports *multiple formatting options* including `code snippets` and [external links](https://n8n.io).
>
> Make sure to test all **formatting combinations** before deploying to production.

### Mixed Content Section

Here's a paragraph that leads into a list:

- **Authentication**: Users can sign in with `OAuth2` tokens
- **Data Processing**: Supports *real-time* processing of [Markdown files](https://commonmark.org)
- **Export Options**: Generate documents in **multiple formats**

And here's a code example that follows:

```typescript
// TypeScript example with proper typing
interface User {
    name: string;
    email: string;
    isActive: boolean;
}

const createUser = (userData: User): User => {
    return {
        ...userData,
        isActive: true
    };
};
```

---

## 🔚 Section 7: Edge Cases and Special Characters

### Special Characters

Here are some special characters: & < > " '

### Empty Elements

- Item 1
-
- Item 3

### Mixed Emphasis

***Bold and italic together***

**Bold text with `inline code` inside**

*Italic text with [a link](https://example.com) included*

### Horizontal Rules

Content above the horizontal rule.

---

Content below the horizontal rule.

### Final Complex Example

This is the **final demonstration** of the *Markdown to Google Docs* converter. It includes:

1. **Text formatting** with `code snippets`
2. [External links](https://n8n.io) for reference
3. *Rich content* combinations

> **Summary**: All Markdown features have been demonstrated, from *basic text formatting* to **complex table structures** and `code blocks`.

| Test Case        | **Result** | `Status`   |
| ---------------- | ---------- | ---------- |
| Basic formatting | ✅ Pass    | `Complete` |
| Complex tables   | ✅ Pass    | `Complete` |
| Code blocks      | ✅ Pass    | `Complete` |
| Mixed content    | ✅ Pass    | `Complete` |

---

*End of demo document - all Markdown features covered!*
