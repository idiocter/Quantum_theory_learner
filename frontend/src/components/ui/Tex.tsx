'use client'
import { useEffect, useRef } from 'react'

// KaTeX is loaded lazily (the same pattern the AI tutor uses) so it never lands
// in the initial bundle. The stylesheet is imported globally in globals.css.
function render(el: HTMLElement, tex: string, displayMode: boolean) {
  import('katex').then((katex) => {
    try {
      el.innerHTML = katex.default.renderToString(tex, {
        displayMode,
        throwOnError: false,
      })
    } catch {
      el.textContent = tex
    }
  })
}

/** Render a single LaTeX expression (no surrounding `$` delimiters). */
export function Tex({
  children,
  block = false,
  className,
}: {
  children: string
  block?: boolean
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (ref.current) render(ref.current, children, block)
  }, [children, block])

  return block ? (
    <div className={className}>
      <span ref={ref}>{children}</span>
    </div>
  ) : (
    <span ref={ref} className={className}>
      {children}
    </span>
  )
}

/**
 * Render prose that contains inline `$...$` and display `$$...$$` math, leaving
 * the surrounding text untouched. Mirrors the tutor's KatexMessage renderer.
 */
export function TexProse({ content, className }: { content: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    import('katex').then((katex) => {
      const html = content
        .replace(/\$\$(.+?)\$\$/gs, (_, tex) => {
          try {
            return `<div class="katex-display">${katex.default.renderToString(tex, { displayMode: true, throwOnError: false })}</div>`
          } catch {
            return `<div class="katex-display">${tex}</div>`
          }
        })
        .replace(/\$(.+?)\$/g, (_, tex) => {
          try {
            return katex.default.renderToString(tex, { throwOnError: false })
          } catch {
            return tex
          }
        })
      if (ref.current) ref.current.innerHTML = html
    })
  }, [content])

  return <div ref={ref} className={className} />
}
