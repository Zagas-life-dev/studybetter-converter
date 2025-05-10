"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import { useEffect } from "react"

interface MarkdownPreviewProps {
  markdown: string
}

export function MarkdownPreview({ markdown }: MarkdownPreviewProps) {
  // Load KaTeX CSS from CDN
  useEffect(() => {
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"
    link.integrity = "sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV"
    link.crossOrigin = "anonymous"

    // Check if the stylesheet is already loaded
    if (!document.querySelector('link[href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"]')) {
      document.head.appendChild(link)
    }

    // Add custom styles for black text in KaTeX and adjust fraction line position
    const style = document.createElement("style")
    style.textContent = `
      .katex { color: rgb(0,0,0) !important; }
      .katex * { color: rgb(0,0,0) !important; }
      
      /* Move the fraction line up */
      .katex .frac-line { 
        border-bottom-color: rgb(0,0,0) !important;
        margin-top: 0em !important; 
        margin-bottom: 1.0em
      }
      
      /* Adjust spacing in fractions to position the line higher */
      .katex .mfrac .frac-line {
        margin-top: 0em !important;
        margin-bottom: 0.15em !important;
      }
      
      /* Adjust the numerator position */
      .katex .mfrac .mfracnum {
        margin-bottom: 0.05em !important;
      }
      
      /* Adjust the denominator position to be closer to the line */
      .katex .mfrac .mfracden {
        margin-top: 0.05em !important;
      }
    `
    document.head.appendChild(style)

    return () => {
      // Clean up the custom style
      document.head.removeChild(style)
      // No need to remove the stylesheet as it might be used by other components
    }
  }, [])

  return (
    <div className="prose max-w-none dark:prose-invert" style={{ color: "rgb(0,0,0)" }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Override components to ensure black text
          p: ({ node, ...props }) => <p style={{ color: "rgb(0,0,0)" }} {...props} />,
          h1: ({ node, ...props }) => <h1 style={{ color: "rgb(0,0,0)" }} {...props} />,
          h2: ({ node, ...props }) => <h2 style={{ color: "rgb(0,0,0)" }} {...props} />,
          h3: ({ node, ...props }) => <h3 style={{ color: "rgb(0, 0, 0)" }} {...props} />,
          h4: ({ node, ...props }) => <h4 style={{ color: "rgb(0,0,0)" }} {...props} />,
          h5: ({ node, ...props }) => <h5 style={{ color: "rgb(0,0,0)" }} {...props} />,
          h6: ({ node, ...props }) => <h6 style={{ color: "rgb(0,0,0)" }} {...props} />,
          li: ({ node, ...props }) => <li style={{ color: "rgb(0,0,0)" }} {...props} />,
          a: ({ node, ...props }) => <a style={{ color: "rgb(0,0,0)" }} {...props} />,
          strong: ({ node, ...props }) => <strong style={{ color: "rgb(0,0,0)" }} {...props} />,
          em: ({ node, ...props }) => <em style={{ color: "rgb(0,0,0)" }} {...props} />,
          code: ({ node, ...props }) => <code style={{ color: "rgb(0,0,0)" }} {...props} />,
          pre: ({ node, ...props }) => <pre style={{ color: "rgb(0,0,0)" }} {...props} />,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
