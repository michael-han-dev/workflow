import ts from 'typescript';
import { source } from '../lib/geistdocs/source';

interface QuoteIssue {
  file: string;
  codeBlockLine: number;
  lineInBlock: number;
  text: string;
  suggestion: string;
}

// Match code blocks - meta must be on same line as language (space, not newline)
const CODE_BLOCK_REGEX =
  /```(ts|tsx|js|jsx|typescript|javascript)(?: +([^\n]*))?\n([\s\S]*?)```/g;

function extractCodeBlocks(
  content: string
): Array<{ code: string; language: string; startLine: number; meta: string }> {
  const blocks: Array<{
    code: string;
    language: string;
    startLine: number;
    meta: string;
  }> = [];
  let match: RegExpExecArray | null;

  while ((match = CODE_BLOCK_REGEX.exec(content)) !== null) {
    const language = match[1];
    const meta = match[2] || '';
    const code = match[3];
    // Calculate line number where this code block starts
    const beforeMatch = content.slice(0, match.index);
    const startLine = beforeMatch.split('\n').length;

    blocks.push({ code, language, startLine, meta });
  }

  // Reset regex state
  CODE_BLOCK_REGEX.lastIndex = 0;

  return blocks;
}

function cleanCode(code: string): string {
  // Remove fumadocs annotations - remove the entire comment including any text after
  return code
    .replace(/\s*\/\/\s*\[!code[^\]]*\].*$/gm, '')
    .replace(/\s*\/\*\s*\[!code[^\]]*\]\s*\*\//g, '');
}

// Detect if code contains JSX syntax
function containsJsx(code: string): boolean {
  return (
    /<[A-Z][a-zA-Z]*[\s/>]/.test(code) ||
    /<\/[a-zA-Z]+>/.test(code) ||
    /return\s*\(?\s*</.test(code)
  );
}

function findSingleQuotedStrings(
  code: string,
  language: string,
  meta: string
): Array<{ line: number; text: string; suggestion: string }> {
  const issues: Array<{ line: number; text: string; suggestion: string }> = [];

  // Determine script kind based on language, title metadata, OR JSX content
  const isTsx =
    language === 'tsx' ||
    language === 'jsx' ||
    meta.includes('.tsx') ||
    meta.includes('.jsx') ||
    containsJsx(code);

  const scriptKind = isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS;

  const sourceFile = ts.createSourceFile(
    `example.${isTsx ? 'tsx' : 'ts'}`,
    code,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  );

  function visit(node: ts.Node) {
    if (ts.isStringLiteral(node)) {
      const start = node.getStart(sourceFile);
      const rawChar = code[start];

      if (rawChar === "'") {
        const pos = sourceFile.getLineAndCharacterOfPosition(start);
        issues.push({
          line: pos.line + 1,
          text: node.getText(sourceFile),
          suggestion: `"${node.text}"`,
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return issues;
}

async function checkQuotes() {
  const allIssues: QuoteIssue[] = [];

  const pages = source.getPages();

  for (const page of pages) {
    const content = await page.data.getText('raw');
    const blocks = extractCodeBlocks(content);

    for (const block of blocks) {
      // Skip blocks marked with lint-nocheck
      if (block.meta.includes('lint-nocheck')) {
        continue;
      }

      const cleanedCode = cleanCode(block.code);

      const stringIssues = findSingleQuotedStrings(
        cleanedCode,
        block.language,
        block.meta
      );

      for (const issue of stringIssues) {
        allIssues.push({
          file: page.absolutePath,
          codeBlockLine: block.startLine,
          lineInBlock: issue.line,
          text: issue.text,
          suggestion: issue.suggestion,
        });
      }
    }
  }

  // Group issues by file
  const issuesByFile = new Map<string, typeof allIssues>();
  for (const issue of allIssues) {
    const existing = issuesByFile.get(issue.file) || [];
    existing.push(issue);
    issuesByFile.set(issue.file, existing);
  }

  const green = (s: string) => `\x1b[32m\x1b[1m${s}\x1b[0m`;
  const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
  const redBold = (s: string) => `\x1b[31m\x1b[1m${s}\x1b[0m`;

  if (allIssues.length > 0) {
    console.error();
    for (const [file, issues] of issuesByFile) {
      console.error(`Single-quoted strings in ${file}:`);
      for (const issue of issues) {
        console.error(
          `  ${red(issue.text)} → ${issue.suggestion}: at line ${issue.codeBlockLine + issue.lineInBlock}`
        );
      }
    }
    console.log('------');
    console.error(
      redBold(
        `${issuesByFile.size} errored file${issuesByFile.size === 1 ? '' : 's'}, ${allIssues.length} error${allIssues.length === 1 ? '' : 's'}`
      )
    );
    console.error();
    process.exit(1);
  } else {
    console.log(green('0 errored files, 0 errors'));
  }
}

void checkQuotes();
