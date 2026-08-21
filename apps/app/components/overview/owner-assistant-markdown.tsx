import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";

const components: Components = {
  p: ({ children }) => <p className="mt-2 first:mt-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-zinc-950">{children}</strong>,
  ul: ({ children }) => <ul className="mt-2 list-disc space-y-1.5 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="mt-2 list-decimal space-y-1.5 pl-5">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  a: ({ children, href }) => {
    const className =
      "text-primary font-semibold underline decoration-emerald-700/30 underline-offset-2 hover:decoration-emerald-700";

    return href?.startsWith("/") ? (
      <Link href={href} scroll={false} className={className}>
        {children}
      </Link>
    ) : (
      <a href={href} className={className}>
        {children}
      </a>
    );
  },
};

export function OwnerAssistantMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown skipHtml components={components}>
      {children}
    </ReactMarkdown>
  );
}
