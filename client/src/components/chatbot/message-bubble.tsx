import { Bot, User, CheckCircle, AlertTriangle, ListOrdered, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useMemo, useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';

interface MessageBubbleProps {
  content: string;
  isUser: boolean;
  timestamp: Date;
  isFirstBotMessage?: boolean; // New prop to control ticket prompt
}

// Helper to linkify URLs and emails in a string or array of strings/JSX
function linkify(text: string | (string | JSX.Element)[]): (string | JSX.Element)[] {
  // If already an array (from bold splitting), process each part
  if (Array.isArray(text)) {
    return text.flatMap((part, idx) => {
      if (typeof part === "string") {
        return linkify(part);
      }
      return part;
    });
  }

  // Regex for URLs (http, https, www)
  const urlRegex = /((https?:\/\/[^\s<]+)|(www\.[^\s<]+))/gi;
  // Regex for emails
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;

  // Split by URLs and emails in one pass to avoid duplicate rendering
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  const combinedRegex = new RegExp(`${urlRegex.source}|${emailRegex.source}`, "gi");

  let match: RegExpExecArray | null;
  while ((match = combinedRegex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const matchedText = match[0];

    // Check if it's an email
    if (matchedText.match(emailRegex)) {
      parts.push(
        <a
          key={`email-${match.index}-${matchedText}`}
          href={`mailto:${matchedText}`}
          className="underline text-blue-600 break-all hover:text-blue-800"
        >
          {matchedText}
        </a>
      );
    }
    // Otherwise, it's a URL
    else if (matchedText.match(urlRegex)) {
      // Remove trailing punctuation (like www.x.comwww.)
      let cleanUrl = matchedText.replace(/([.,!?;:]+)$/g, "");
      let displayUrl = cleanUrl;
      // If the next part of the string is the same as the displayUrl, skip it
      // (prevents www.x.comwww.x.com)
      // But this is handled by splitting, so just render once

      // Ensure protocol for www.
      const href = cleanUrl.startsWith("http") ? cleanUrl : `https://${cleanUrl}`;
      parts.push(
        <a
          key={`url-${match.index}-${cleanUrl}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-blue-600 break-all hover:text-blue-800"
        >
          {displayUrl}
        </a>
      );
    }
    lastIndex = match.index + matchedText.length;
  }
  // Add any remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function parseAdvancedSections(content: string) {
  // Split by double newlines for blocks
  const blocks = content.split(/\n\n+/);
  let quickAnswer = "";
  let steps: string[] = [];
  let notes: string[] = [];
  let related: string[] = [];
  let sectionTitle = "";

  for (let block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    if (trimmed.match(/^Quick Answer[:：]?/i)) {
      quickAnswer = trimmed.replace(/^Quick Answer[:：]?/i, "").trim();
      continue;
    }
    if (trimmed.match(/^(Step[- ]?by[- ]?Step Guide|Steps|Instructions)[:：]?/i)) {
      sectionTitle = trimmed.replace(/^(Step[- ]?by[- ]?Step Guide|Steps|Instructions)[:：]?/i, "").trim();
      continue;
    }
    if (trimmed.match(/^(Note:|Warning:)/i)) {
      notes.push(trimmed);
      continue;
    }
    if (trimmed.match(/^(Related:|See also:)/i)) {
      related = trimmed.replace(/^(Related:|See also:)/i, "").split(/\n|[-•] /).map(s => s.trim()).filter(Boolean);
      continue;
    }
    // Steps: lines starting with 1. 2. etc
    if (trimmed.match(/^\d+\. /m)) {
      steps = trimmed.split(/\n/).filter(l => l.match(/^\d+\. /));
      continue;
    }
  }
  return { quickAnswer, sectionTitle, steps, notes, related };
}

// Helper to rewrite step text for clarity and professionalism
function professionalizeStep(step: string): string {
  // Replace 'you' or 'your' with neutral phrasing
  let s = step.replace(/\byou\b/gi, "the staff member")
    .replace(/\byour\b/gi, "the staff member's");
  // Replace 'Click', 'Go to', 'Select', etc. with 'Navigate to' for consistency
  s = s.replace(/^(Click on|Go to|Select|Choose|Open) /i, "Navigate to ");
  // Add quotes around navigation/code elements if not already present
  s = s.replace(/Navigate to ([^.,;]+)/i, (m, p1) => `Navigate to "${p1.trim()}"`);
  // Remove trailing periods from nav elements
  s = s.replace(/("[^"]+")\./g, "$1");
  return s;
}

function renderStep(step: string, idx: number) {
  // Professionalize the step text
  let cleanStep = professionalizeStep(step);
  // Remove leading number and dot (e.g., '1. ')
  let stepText = cleanStep.replace(/^\d+\.\s*/, '');

  // 1. Navigation Paths: Render anything after navigation verbs as blue badges, supporting chained navigation and multiple phrases
  const navRegex = /(Navigate to|Go to|Select|Open) ([^.,;]+)/gi;
  stepText = stepText.replace(navRegex, (match, verb, navPath) => {
    // Split chained navigation (→, >, ->, etc.)
    const parts = navPath.split(/\s*(→|->|>)\s*/);
    let html = verb + ' ';
    for (let i = 0; i < parts.length; i += 2) {
      html += `<span class=\"inline-block bg-blue-100 border border-blue-300 rounded px-1 py-0.5 text-blue-800 font-mono text-[12px] mx-1 shadow-sm\">${parts[i]}</span>`;
      if (parts[i + 1]) {
        html += `<span class=\"mx-1 text-blue-400 font-bold\">→</span>`;
      }
    }
    return html;
  });

  // 2. Bold UI Elements: Render **text** in dark blue bold
  stepText = stepText.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-blue-900">$1</strong>');

  // 3. Action Icons: Add icons for actions
  // Cross Button (X)
  stepText = stepText.replace(/Cross Button \(X\)/g, '<span class="font-semibold text-blue-900">Cross Button <span class="text-red-500">&#10006;</span></span>');
  // Click (add 🖱️ icon)
  stepText = stepText.replace(/\bclick(s|ed|ing)?\b/gi, '<span class="inline-block align-middle">🖱️</span> click$1');

  // 4. Consistent Spacing and Indentation: Wrap in a block with leading-relaxed and whitespace-pre-line for multi-line
  return (
    <div className="flex items-start mb-3" key={idx}>
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-50 border-2 border-blue-400 flex items-center justify-center text-blue-700 font-bold mr-3 mt-0.5 text-base shadow-sm">
        {idx + 1}
      </div>
      <div
        className="flex-1 text-[14px] leading-relaxed whitespace-pre-line"
        dangerouslySetInnerHTML={{ __html: stepText }}
      />
    </div>
  );
}

function renderNote(note: string, idx: number) {
  const isWarning = note.toLowerCase().startsWith("warning:");
  return (
    <div key={idx} className={`flex items-start p-3 rounded-xl mb-2 shadow-sm ${isWarning ? "bg-orange-50 border-l-4 border-orange-400" : "bg-yellow-50 border-l-4 border-yellow-400"}`}>
      <div className="mr-2 mt-0.5">{isWarning ? <AlertTriangle className="w-5 h-5 text-orange-400" /> : <Info className="w-5 h-5 text-yellow-400" />}</div>
      <div className="text-[14px] text-gray-800">
        <span className="font-semibold mr-1">{isWarning ? "Important Warning" : "Important Note"}</span>
        {linkify(note.replace(/^(Note:|Warning:)/i, "").trim())}
      </div>
    </div>
  );
}

function renderQuickAnswer(answer: string) {
  return (
    <div className="flex items-start bg-green-50 border border-green-200 rounded-xl p-3 mb-3 shadow-sm">
      <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5" />
      <div className="text-[14px] text-green-900">
        <span className="font-semibold">Quick Answer</span>
        <div>{linkify(answer)}</div>
      </div>
    </div>
  );
}

function renderSectionHeader(title: string) {
  return (
    <div className="flex items-center gap-2 mt-2 mb-3">
      <ListOrdered className="w-5 h-5 text-blue-500" />
      <span className="font-semibold text-blue-800 text-[16px] tracking-tight">Step-by-Step Guide</span>
    </div>
  );
}

function renderRelated(related: string[]) {
  if (!related.length) return null;
  return (
    <div className="pt-2 border-t border-gray-100 mt-2">
      <div className="text-xs text-gray-500 font-semibold mb-1">Related topics:</div>
      <ul className="list-disc ml-6 text-[14px]">
        {related.map((r, i) => (
          <li key={i}>{linkify(r)}</li>
        ))}
      </ul>
    </div>
  );
}

function formatMessageContent(content: string, isUser: boolean): JSX.Element {
  // Apply the same font to both user and bot messages
  if (isUser) {
    return <div className="prose prose-sm max-w-none prose-blue-bold font-inter font-sans">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>;
  }
  const { quickAnswer, sectionTitle, steps, notes, related } = parseAdvancedSections(content);
  const hasAdvanced = quickAnswer || steps.length > 0 || notes.length > 0 || related.length > 0;
  return (
    <div className="space-y-2 font-inter font-sans">
      {hasAdvanced ? (
        <>
          {quickAnswer && renderQuickAnswer(quickAnswer)}
          {steps.length > 0 && renderSectionHeader(sectionTitle)}
          {steps.length > 0 && (
            <div className="mb-2">{steps.map((step, idx) => renderStep(step, idx))}</div>
          )}
          {notes.length > 0 && notes.map((note, idx) => renderNote(note, idx))}
          {related.length > 0 && renderRelated(related)}
        </>
      ) : (
        <div className="prose prose-sm max-w-none prose-blue-bold font-inter font-sans">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export function MessageBubble({ content, isUser, timestamp, isFirstBotMessage = false }: MessageBubbleProps) {
  // Animation state for bot messages
  const [visibleWords, setVisibleWords] = useState<number>(isUser ? Infinity : 0);
  const words = useMemo(() => content.split(/(\s+)/), [content]);
  const { quickAnswer, sectionTitle, steps, notes, related } = useMemo(() => parseAdvancedSections(content), [content]);
  const hasAdvanced = quickAnswer || steps.length > 0 || notes.length > 0 || related.length > 0;

  // Animate only for bot, only for simple prose/markdown (not advanced sections)
  useEffect(() => {
    if (isUser || hasAdvanced) {
      setVisibleWords(Infinity);
      return;
    }
    setVisibleWords(0);
    if (words.length === 0) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleWords(i);
      if (i >= words.length) clearInterval(interval);
    }, 60); // 60ms per word
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [content, isUser, hasAdvanced]);

  // Render animated content for bot, only for simple prose/markdown
  let animatedContent: JSX.Element | null = null;
  if (!isUser && !hasAdvanced) {
    const partial = words.slice(0, visibleWords).join("");
    animatedContent = (
      <div className="prose prose-sm max-w-none prose-blue-bold font-inter font-sans">
        <ReactMarkdown>{partial}</ReactMarkdown>
      </div>
    );
  }

  const formattedContent = useMemo(() => {
    if (!isUser && !hasAdvanced && animatedContent) return animatedContent;
    return formatMessageContent(content, isUser);
  }, [content, isUser, hasAdvanced, animatedContent]);

  return (
    <div className={`flex items-start space-x-3 animate-fade-in ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0 ${isUser ? 'bg-school-orange' : 'bg-school-blue'}`}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div className={`rounded-2xl p-4 max-w-[85%] ${isUser ? 'bg-blue-50 text-blue-900 border border-blue-200 rounded-tr-sm' : 'bg-gray-50 rounded-tl-sm border border-gray-200'}`}>
        <div className={`text-xs leading-relaxed ${isUser ? 'text-blue-900' : 'text-gray-800'}`}>
          {formattedContent}
        </div>
        {/* Show ticket prompt and button only for non-user, non-first bot messages */}
        {!isUser && !isFirstBotMessage && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-[14px] text-gray-700">Is your issue resolved? If not, generate a ticket</span>
            <button
              className="inline-block px-3 py-1.5 bg-blue-600 text-white rounded-lg font-semibold text-sm shadow hover:bg-blue-700 transition-colors ml-2"
              onClick={async () => {
                let sessionId = undefined;
                try {
                  await fetch(`/api/support/ticket-click`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId }),
                  });
                } catch {}
                window.open('https://entab.online/admin/freshdesk-ticket', '_blank', 'noopener,noreferrer');
              }}
            >
              Ticket
            </button>
          </div>
        )}
        <div className={`text-xs mt-2 opacity-70 ${isUser ? 'text-blue-700' : 'text-gray-500'}`}>
          {formatDistanceToNow(timestamp, { addSuffix: true })}
        </div>
      </div>
    </div>
  );
}
