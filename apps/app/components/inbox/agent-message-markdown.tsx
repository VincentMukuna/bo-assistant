import ReactMarkdown, { type Components } from "react-markdown";

const components: Components = {
  p: ({ children }) => <p className="mt-2 first:mt-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  em: ({ children }) => <em className="text-emerald-50/90">{children}</em>,
  h1: ({ children }) => <h1 className="mt-3 text-base font-semibold first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-3 text-sm font-semibold first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-3 text-sm font-semibold first:mt-0">{children}</h3>,
  ul: ({ children }) => <ul className="mt-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="mt-2 list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-white underline decoration-emerald-200/60 underline-offset-2 hover:decoration-white"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mt-2 rounded-lg bg-white/10 px-3 py-2 text-emerald-50/90">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded bg-emerald-950/30 px-1 py-0.5 font-mono text-[0.9em] text-emerald-50">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mt-2 overflow-x-auto rounded-lg bg-emerald-950/35 p-3 text-left text-xs leading-5">
      {children}
    </pre>
  ),
  hr: () => <div className="my-3 h-px bg-white/15" aria-hidden="true" />,
};

export function AgentMessageMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown skipHtml components={components}>
      {children}
    </ReactMarkdown>
  );
}
