// Renders free-text notes (lesson / homework / question) faithfully:
//  - preserves the author's line breaks and indentation (whitespace-pre-wrap)
//  - turns URLs into clickable links (new tab, no referrer/opener leak)
// No hooks, so it works in both server and client components.

const URL_RE = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi

export function NoteText({
  text,
  className = '',
}: {
  text: string
  className?: string
}) {
  // split on a capturing group → even indices are plain text, odd are URLs.
  const tokens = text.split(URL_RE)

  return (
    <span className={`whitespace-pre-wrap break-words ${className}`}>
      {tokens.map((tok, i) => {
        if (!tok) return null
        if (i % 2 === 0) return <span key={i}>{tok}</span>

        // Peel trailing sentence punctuation back out of the URL so a link at
        // the end of a sentence doesn't swallow the full stop / bracket.
        const trail = tok.match(/[.,;:!?)\]}]+$/)?.[0] ?? ''
        const url = trail ? tok.slice(0, -trail.length) : tok
        const href = url.startsWith('http') ? url : `https://${url}`

        return (
          <span key={i}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-blue-600 hover:underline break-all"
              onClick={(e) => e.stopPropagation()}
            >
              {url}
            </a>
            {trail}
          </span>
        )
      })}
    </span>
  )
}
