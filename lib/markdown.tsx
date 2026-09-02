// Lightweight markdown → JSX renderer for Loki's Lab articles.
// Handles the subset used in LL-011: headings, bold, italic, lists,
// links, paragraphs, horizontal rules, inline code, and code blocks.
// No external dependencies — keeps the build self-contained.

export function renderMarkdown(markdown: string): React.ReactNode[] {
  const lines = markdown.split('\n');
  const nodes: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLang = '';

  const flushCodeBlock = () => {
    if (codeLines.length === 0) return;
    const code = codeLines.join('\n');
    nodes.push(
      <pre
        key={`code-${nodes.length}`}
        className="overflow-x-auto rounded-lg bg-[#17201f] p-4 text-sm leading-6 text-[#e9e4db] font-mono"
      >
        <code>{code}</code>
      </pre>
    );
    codeLines = [];
    inCodeBlock = false;
    codeLang = '';
  };

  const flushParagraph = (paragraphLines: string[]) => {
    if (paragraphLines.length === 0) return;
    const text = paragraphLines.join(' ');
    if (text.trim() === '') return;
    nodes.push(
      <p key={`p-${nodes.length}`} className="leading-7 text-[#4c5652] mb-4">
        {inlineMarkdown(text)}
      </p>
    );
  };

  const flushList = (listLines: string[], listType: 'ul' | 'ol') => {
    if (listLines.length === 0) return;
    // Group into sublists separated by blank lines
    const items: { text: string; sublist?: React.ReactNode }[] = [];
    let currentItemLines: string[] = [];
    let nestedDepth = 0;

    const flushItem = () => {
      if (currentItemLines.length === 0) return;
      const itemText = currentItemLines.join(' ').trim();
      const isNested = currentItemLines[0]?.startsWith('  ') || currentItemLines[0]?.startsWith('\t');
      const content = isNested
        ? <ul className="ml-6 list-disc text-[#5b6560]">{renderMarkdown(itemText)}</ul>
        : inlineMarkdown(itemText.replace(/^[-*+]\s+/, ''));
      items.push({ text: itemText, sublist: isNested ? content : undefined });
      currentItemLines = [];
    };

    for (const line of listLines) {
      if (line.trim() === '') {
        flushItem();
        continue;
      }
      const isListItem = /^[ \t]*[-*+]\s+/.test(line) || /^[ \t]*\d+\.\s+/.test(line);
      if (isListItem) {
        flushItem();
        currentItemLines = [line.replace(/^[ \t]*[-*+]\s+/, '').replace(/^[ \t]*\d+\.\s+/, '')];
      } else {
        currentItemLines.push(line);
      }
    }
    flushItem();

    if (items.length === 0) return;

    const ListTag = listType === 'ol' ? 'ol' : 'ul';
    const listClass = listType === 'ol'
      ? 'list-decimal ml-6 space-y-1 text-[#5b6560]'
      : 'list-disc ml-6 space-y-1 text-[#5b6560]';
    nodes.push(
      <ListTag key={`list-${nodes.length}`} className={listClass}>
        {items.map((item, i) => (
          <li key={i} className="leading-6">
            {item.sublist ?? inlineMarkdown(item.text)}
          </li>
        ))}
      </ListTag>
    );
  };

  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';

    // Code block fence
    const fenceMatch = line.match(/^```(\w*)/);
    if (fenceMatch) {
      if (inCodeBlock) {
        flushCodeBlock();
      } else {
        inCodeBlock = true;
        codeLang = fenceMatch[1];
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Horizontal rule
    if (/^[\s]*[-*_]{3,}/.test(line)) {
      flushParagraph(paragraphBuffer);
      paragraphBuffer = [];
      flushList(listBuffer, listType!);
      listBuffer = [];
      listType = null;
      nodes.push(<hr key={`hr-${nodes.length}`} className="my-8 border-[#aaa194]" />);
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      flushParagraph(paragraphBuffer);
      paragraphBuffer = [];
      flushList(listBuffer, listType!);
      listBuffer = [];
      listType = null;
      const level = headingMatch[1].length;
      // Use a switch for heading levels — dynamic tag names aren't valid JSX
      const cls = `mb-4 mt-6 tracking-tight`;
      if (level === 1) {
        nodes.push(
          <h1 key={`h-${nodes.length}`} className={`display-serif text-[clamp(2rem,4vw,3rem)] leading-[0.9] font-bold ${cls}`}>
            {inlineMarkdown(headingMatch[2])}
          </h1>
        );
      } else if (level === 2) {
        nodes.push(
          <h2 key={`h-${nodes.length}`} className={`text-2xl font-bold ${cls}`}>
            {inlineMarkdown(headingMatch[2])}
          </h2>
        );
      } else if (level === 3) {
        nodes.push(
          <h3 key={`h-${nodes.length}`} className={`text-xl font-semibold ${cls}`}>
            {inlineMarkdown(headingMatch[2])}
          </h3>
        );
      } else if (level === 4) {
        nodes.push(
          <h4 key={`h-${nodes.length}`} className={`text-lg font-medium ${cls}`}>
            {inlineMarkdown(headingMatch[2])}
          </h4>
        );
      } else {
        nodes.push(
          <p key={`h-${nodes.length}`} className={`font-medium ${cls}`}>
            {inlineMarkdown(headingMatch[2])}
          </p>
        );
      }
      continue;
    }

    // List item
    const listItemMatch = line.match(/^(\s*)[-*+]\s+(.*)/);
    const orderedMatch = line.match(/^(\s*)(\d+)\.\s+(.*)/);

    if (listItemMatch || orderedMatch) {
      // Flush paragraph if we were in one
      if (paragraphBuffer.length > 0) {
        flushParagraph(paragraphBuffer);
        paragraphBuffer = [];
      }
      const indent = listItemMatch ? listItemMatch[1] : orderedMatch![1];
      const content = listItemMatch ? listItemMatch[2] : orderedMatch![2];
      const newDepth = indent.length / 2;

      if (listType === null) {
        listType = listItemMatch ? 'ul' : 'ol';
      }

      // If depth changes, flush existing list
      const currentDepth = listBuffer.length > 0 ? 0 : -1;
      if (listBuffer.length > 0 && newDepth > 0) {
        // Nested list — add as part of current item
        listBuffer.push(line);
      } else {
        listBuffer.push(line);
      }
      continue;
    }

    // Blank line — flush paragraph and list
    if (line.trim() === '') {
      if (listBuffer.length > 0) {
        flushList(listBuffer, listType!);
        listBuffer = [];
        listType = null;
      } else if (paragraphBuffer.length > 0) {
        flushParagraph(paragraphBuffer);
        paragraphBuffer = [];
      }
      continue;
    }

    // Regular text — accumulate in paragraph
    if (listType !== null) {
      listBuffer.push(line);
    } else {
      paragraphBuffer.push(line);
    }
  }

  // Flush remaining
  flushParagraph(paragraphBuffer);
  flushList(listBuffer, listType!);
  flushCodeBlock();

  return nodes;
}

function inlineMarkdown(text: string): React.ReactNode {
  if (!text.trim()) return null;

  // Handle inline code first (protect from other processing)
  const codeSplit = splitOnInlineCode(text);
  const parts: React.ReactNode[] = [];
  for (const [isCode, content] of codeSplit) {
    if (isCode) {
      parts.push(<code key={parts.length} className="rounded bg-[#d4c9b5] px-1 py-0.5 text-sm font-mono text-[#17201f]">{content}</code>);
    } else {
      // Process links, bold, italic in this segment
      const processed = processInline(content);
      if (Array.isArray(processed)) {
        parts.push(...processed);
      } else if (processed != null) {
        parts.push(processed);
      }
    }
  }

  return <>{parts}</>;
}

function splitOnInlineCode(text: string): [boolean, string][] {
  const result: [boolean, string][] = [];
  let remaining = text;
  while (remaining.length > 0) {
    const backtickIdx = remaining.indexOf('`');
    if (backtickIdx < 0) {
      result.push([false, remaining]);
      break;
    }
    if (backtickIdx > 0) {
      result.push([false, remaining.slice(0, backtickIdx)]);
    }
    remaining = remaining.slice(backtickIdx + 1);
    const closeIdx = remaining.indexOf('`');
    if (closeIdx < 0) {
      // No closing backtick — treat as literal
      result.push([false, '`' + remaining]);
      break;
    }
    result.push([true, remaining.slice(0, closeIdx)]);
    remaining = remaining.slice(closeIdx + 1);
  }
  return result;
}

function processInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let remaining = text;
  let plainBuffer = '';

  const flushPlain = () => {
    if (plainBuffer) {
      nodes.push(plainBuffer);
      plainBuffer = '';
    }
  };

  while (remaining.length > 0) {
    // Links: [text](url)
    const linkMatch = remaining.match(/^\[([^\]]*)\]\(([^)]+)\)/);
    if (linkMatch) {
      flushPlain();
      nodes.push(
        <a key={nodes.length} href={linkMatch[2]} target="_blank" rel="noreferrer" className="text-[#b74627] hover:underline">
          {inlineMarkdown(linkMatch[1])}
        </a>
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Bold: **text**
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      flushPlain();
      nodes.push(
        <strong key={nodes.length} className="font-bold text-[#17201f]">
          {inlineMarkdown(boldMatch[1])}
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic: *text* (but not **)
    const italicMatch = remaining.match(/^\*([^*\n]+)\*/);
    if (italicMatch && !remaining.startsWith('**')) {
      flushPlain();
      nodes.push(
        <em key={nodes.length} className="italic">
          {inlineMarkdown(italicMatch[1])}
        </em>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Strikethrough: ~~text~~
    const strikeMatch = remaining.match(/^~~([^~]+)~~/);
    if (strikeMatch) {
      flushPlain();
      nodes.push(
        <del key={nodes.length} className="line-through text-[#8f9a95]">
          {inlineMarkdown(strikeMatch[1])}
        </del>
      );
      remaining = remaining.slice(strikeMatch[0].length);
      continue;
    }

    // Inline code: `text`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      flushPlain();
      nodes.push(
        <code key={nodes.length} className="rounded bg-[#d4c9b5] px-1 py-0.5 text-sm font-mono text-[#17201f]">
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Escaped character: \X
    const escapeMatch = remaining.match(/^\\([^\s\[\]*_~`\\])/);
    if (escapeMatch) {
      flushPlain();
      nodes.push(escapeMatch[1]);
      remaining = remaining.slice(escapeMatch[0].length);
      continue;
    }

    // Regular character — accumulate as plain text
    plainBuffer += remaining[0];
    remaining = remaining.slice(1);
  }

  flushPlain();
  return nodes;
}
