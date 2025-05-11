"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"
import { Loader2, FileDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { MarkdownPreview } from "./markdown-preview"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"

// Add KaTeX CSS import for PDF generation
import "katex/dist/katex.min.css"

interface EnhancedPdfGeneratorProps {
  markdown: string
  fileName: string
  taskType: string
}

export function EnhancedPdfGenerator({ markdown, fileName, taskType }: EnhancedPdfGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()
  
  // Pre-load KaTeX fonts to ensure they're available during PDF generation
  useEffect(() => {
    // Add KaTeX font preloading
    const fontPreloads = [
      "KaTeX_AMS-Regular.woff2",
      "KaTeX_Caligraphic-Bold.woff2",
      "KaTeX_Caligraphic-Regular.woff2",
      "KaTeX_Fraktur-Bold.woff2",
      "KaTeX_Fraktur-Regular.woff2",
      "KaTeX_Main-Bold.woff2",
      "KaTeX_Main-BoldItalic.woff2",
      "KaTeX_Main-Italic.woff2",
      "KaTeX_Main-Regular.woff2",
      "KaTeX_Math-BoldItalic.woff2",
      "KaTeX_Math-Italic.woff2",
      "KaTeX_SansSerif-Bold.woff2",
      "KaTeX_SansSerif-Italic.woff2",
      "KaTeX_SansSerif-Regular.woff2",
      "KaTeX_Script-Regular.woff2",
      "KaTeX_Size1-Regular.woff2",
      "KaTeX_Size2-Regular.woff2",
      "KaTeX_Size3-Regular.woff2",
      "KaTeX_Size4-Regular.woff2",
      "KaTeX_Typewriter-Regular.woff2"
    ];
    
    // Preload each font
    fontPreloads.forEach(font => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = `https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/fonts/${font}`;
      link.as = 'font';
      link.type = 'font/woff2';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }, []);

  const generatePdf = async () => {
    setIsGenerating(true)

    try {
      // Create a temporary div to render the content with proper styling
      const tempDiv = document.createElement("div")
      tempDiv.className = "pdf-content"
      tempDiv.style.width = "800px"
      tempDiv.style.padding = "40px"
      tempDiv.style.backgroundColor = "white"
      tempDiv.style.color = "black"
      tempDiv.style.fontFamily = "Lexend, Arial, sans-serif"

      // Create header with Study Better logo/title
      const header = document.createElement("div")
      header.style.marginBottom = "20px"
      header.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h1 style="font-size: 24px; font-weight: bold; color: rgb(0,0,0); margin: 0;">Study Better</h1>
          <div style="font-size: 14px; color: rgb(0,0,0);">${new Date().toLocaleDateString()}</div>
        </div>
        <div style="height: 2px; background-color: #5c6ac4; margin-bottom: 20px;"></div>
      `
      tempDiv.appendChild(header)

      // Create title based on task type
      const title = document.createElement("h2")
      title.style.fontSize = "20px"
      title.style.fontWeight = "bold"
      title.style.marginBottom = "16px"
      title.style.color = "rgb(0,0,0)"
      title.textContent = `${taskType === "summarize" ? "Summary" : "Explanation"} of: ${fileName.replace(".pdf", "")}`
      tempDiv.appendChild(title)

      // Create content container with enhanced styling for KaTeX
      const contentContainer = document.createElement("div")
      contentContainer.id = "markdown-content-container"
      contentContainer.className = "prose max-w-none"
      contentContainer.style.fontSize = "14px"
      contentContainer.style.lineHeight = "1.6"
      contentContainer.style.color = "rgb(0,0,0)"
      contentContainer.style.fontWeight = "normal"

      // Ensure KaTeX CSS is loaded for PDF rendering - use an embedded style to avoid CORS issues
      const katexCss = document.createElement("style")
      katexCss.textContent = `
        /* KaTeX v0.16.9 CSS */
        .katex {
          font: normal 1.21em KaTeX_Main, Times New Roman, serif;
          line-height: 1.2;
          text-indent: 0;
          text-rendering: auto;
        }
        .katex * {
          color: #000000 !important;
          border-color: #000000 !important;
        }
        .katex .katex-mathml {
          position: absolute;
          clip: rect(1px, 1px, 1px, 1px);
          padding: 0;
          border: 0;
          height: 1px;
          width: 1px;
          overflow: hidden;
        }
        .katex .katex-html>.newline {
          display: block;
        }
        .katex .base {
          position: relative;
          white-space: nowrap;
          width: min-content;
          color: #000000 !important;
        }
        .katex .base, .katex .strut {
          display: inline-block;
        }
        .katex .textbf {
          font-weight: bold;
        }
        .katex .textit {
          font-style: italic;
        }
        .katex .textrm {
          font-family: KaTeX_Main;
        }
        .katex .textsf {
          font-family: KaTeX_SansSerif;
        }
        .katex .texttt {
          font-family: KaTeX_Typewriter;
        }
        .katex .mathnormal {
          font-family: KaTeX_Math;
          font-style: italic;
        }
        .katex .mathit {
          font-family: KaTeX_Main;
          font-style: italic;
        }
        .katex .mathrm {
          font-style: normal;
        }
        .katex .mathbf {
          font-family: KaTeX_Main;
          font-weight: bold;
        }
        .katex .boldsymbol {
          font-family: KaTeX_Math;
          font-weight: bold;
          font-style: italic;
        }
        .katex .amsrm {
          font-family: KaTeX_AMS;
        }
        .katex .mathbb, .katex .textbb {
          font-family: KaTeX_AMS;
        }
        .katex .mathcal {
          font-family: KaTeX_Caligraphic;
        }
        .katex .mathfrak, .katex .textfrak {
          font-family: KaTeX_Fraktur;
        }
        .katex .mathtt {
          font-family: KaTeX_Typewriter;
        }
        .katex .mathscr, .katex .textscr {
          font-family: KaTeX_Script;
        }
        .katex .mathsf, .katex .textsf {
          font-family: KaTeX_SansSerif;
        }
        .katex .mathboldsf, .katex .textboldsf {
          font-family: KaTeX_SansSerif;
          font-weight: bold;
        }
        .katex .mathitsf, .katex .textitsf {
          font-family: KaTeX_SansSerif;
          font-style: italic;
        }
        .katex .mainrm {
          font-family: KaTeX_Main;
          font-style: normal;
        }
        .katex .vlist-t {
          display: inline-table;
          table-layout: fixed;
          border-collapse: collapse;
        }
        .katex .vlist-r {
          display: table-row;
        }
        .katex .vlist {
          display: table-cell;
          vertical-align: bottom;
          position: relative;
        }
        .katex .vlist>span {
          display: block;
          height: 0;
          position: relative;
        }
        .katex .vlist>span>span {
          display: inline-block;
        }
        .katex .vlist>span>.pstrut {
          overflow: hidden;
          width: 0;
        }
        .katex .vlist-t2 {
          margin-right: -2px;
        }
        .katex .vlist-s {
          display: table-cell;
          vertical-align: bottom;
          font-size: 1px;
          width: 2px;
          min-width: 2px;
        }
        .katex .vbox {
          display: inline-flex;
          flex-direction: column;
          align-items: baseline;
        }
        .katex .hbox {
          display: inline-flex;
          flex-direction: row;
          width: 100%;
        }
        .katex .thinbox {
          display: inline-flex;
          flex-direction: row;
          width: 0;
          max-width: 0;
        }
        .katex .msupsub {
          text-align: left;
        }
        .katex .mfrac>span>span {
          text-align: center;
        }
        .katex .mfrac .frac-line {
          display: inline-block;
          width: 100%;
          border-bottom-style: solid;
          border-bottom-width: 1px !important;
          border-bottom-color: #000000 !important;
          position: relative !important;
          top: 0.65em !important;
          margin: 0.15em 0 !important; /* Slightly increased margin */
        }
        .katex .mfrac .mfracnum {
          margin-bottom: 0.45em !important;
        }
        .katex .mfrac .mfracden {
          margin-top: 0.05em !important;
        }
        .katex .mfrac .frac-line, .katex .overline .overline-line, .katex .underline .underline-line, .katex .hline, .katex .hdashline, .katex .rule {
          min-height: 1px;
        }
        .katex .mspace {
          display: inline-block;
        }
        .katex .llap, .katex .rlap {
          width: 0;
          position: relative;
        }
        .katex .llap>.inner, .katex .rlap>.inner {
          position: absolute;
        }
        .katex .llap>.fix, .katex .rlap>.fix {
          display: inline-block;
        }
        .katex .llap>.inner {
          right: 0;
        }
        .katex .rlap>.inner {
          left: 0;
        }
        .katex .katex-logo .a {
          font-size: 0.75em;
          margin-left: -0.32em;
          position: relative;
          top: -0.2em;
        }
        .katex .katex-logo .t {
          margin-left: -0.23em;
        }
        .katex .katex-logo .e {
          margin-left: -0.1667em;
          position: relative;
          top: 0.2155em;
        }
        .katex .katex-logo .x {
          margin-left: -0.125em;
        }
        .katex .rule {
          display: inline-block;
          border: solid 0;
          position: relative;
          border-color: #000000 !important;
        }
        .katex .overline .overline-line, .katex .underline .underline-line {
          display: inline-block;
          width: 100%;
          border-bottom-style: solid;
          border-bottom-color: #000000 !important;
        }
        .katex .sqrt>.root {
          margin-left: 0.27777778em;
          margin-right: -0.55555556em;
        }
        .katex .sizing.reset-size1.size1, .katex .fontsize-ensurer.reset-size1.size1 {
          font-size: 1em;
        }
        .katex .sizing.reset-size1.size2, .katex .fontsize-ensurer.reset-size1.size2 {
          font-size: 1.2em;
        }
        .katex .sizing.reset-size1.size3, .katex .fontsize-ensurer.reset-size1.size3 {
          font-size: 1.4em;
        }

        /* Fix specific elements */
        .katex .sqrt .sqrt-sign {
          color: #000000 !important;
          border-top-color: #000000 !important;
        }

        /* Fix math fraction rendering */
        .katex .mfrac .frac-line {
          border-bottom-width: 1px !important;
          border-bottom-style: solid !important;
          border-bottom-color: #000000 !important;
          position: relative !important;
          top: 0.65em !important;
          margin: 0.15em 0 !important; /* Slightly increased margin */
        }
        
        /* Proper spacing for fractions - increased vertical spacing */
        .katex .mfrac .mfracnum {
          display: inline-block !important;
          margin-bottom: 0.6em !important; /* Increased space for numerator */
        }
        
        .katex .mfrac .mfracden {
          display: inline-block !important;
          margin-top: 0.15em !important; /* Increased space for denominator */
        }
        
        /* Control overall spacing of the fraction */
        .katex .mfrac {
          display: inline-block !important;
          vertical-align: middle !important;
          margin: 0.1em 0 !important; /* Add some margin to the entire fraction */
        }

        /* Allow newline in KaTex */
        .katex-display > .katex {
          display: inline-block;
          white-space: nowrap;
          max-width: 100%;
          text-align: initial;
        }

        /* Other required KaTeX styles */
        .katex-display {
          display: block;
          margin: 1em 0;
          text-align: center;
        }
      `
      document.head.appendChild(katexCss)

      // Add @font-face declarations for KaTeX fonts to ensure they're embedded
      const katexFontsStyle = document.createElement("style")
      katexFontsStyle.textContent = `
        @font-face {
          font-family: 'KaTeX_AMS';
          src: url(https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/fonts/KaTeX_AMS-Regular.woff2) format('woff2');
          font-weight: normal;
          font-style: normal;
        }
        @font-face {
          font-family: 'KaTeX_Main';
          src: url(https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/fonts/KaTeX_Main-Regular.woff2) format('woff2');
          font-weight: normal;
          font-style: normal;
        }
        @font-face {
          font-family: 'KaTeX_Main';
          src: url(https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/fonts/KaTeX_Main-Bold.woff2) format('woff2');
          font-weight: bold;
          font-style: normal;
        }
        @font-face {
          font-family: 'KaTeX_Main';
          src: url(https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/fonts/KaTeX_Main-Italic.woff2) format('woff2');
          font-weight: normal;
          font-style: italic;
        }
        @font-face {
          font-family: 'KaTeX_Math';
          src: url(https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/fonts/KaTeX_Math-Italic.woff2) format('woff2');
          font-weight: normal;
          font-style: italic;
        }
        @font-face {
          font-family: 'KaTeX_SansSerif';
          src: url(https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/fonts/KaTeX_SansSerif-Regular.woff2) format('woff2');
          font-weight: normal;
          font-style: normal;
        }
        @font-face {
          font-family: 'KaTeX_Script';
          src: url(https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/fonts/KaTeX_Script-Regular.woff2) format('woff2');
          font-weight: normal;
          font-style: normal;
        }
        @font-face {
          font-family: 'KaTeX_Typewriter';
          src: url(https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/fonts/KaTeX_Typewriter-Regular.woff2) format('woff2');
          font-weight: normal;
          font-style: normal;
        }
      `
      document.head.appendChild(katexFontsStyle)

      // Add custom CSS for better KaTeX rendering and to force black text
      const customStyle = document.createElement("style")
      customStyle.textContent = `
        /* Force all text to be black */
        #markdown-content-container * {
          color: rgb(0,0,0) !important;
          opacity: 1 !important;
        }
        
        /* Specific overrides for common elements */
        #markdown-content-container p, 
        #markdown-content-container h1, 
        #markdown-content-container h2, 
        #markdown-content-container h3, 
        #markdown-content-container h4, 
        #markdown-content-container h5, 
        #markdown-content-container h6, 
        #markdown-content-container span, 
        #markdown-content-container div, 
        #markdown-content-container li, 
        #markdown-content-container ul, 
        #markdown-content-container ol, 
        #markdown-content-container a, 
        #markdown-content-container strong, 
        #markdown-content-container em, 
        #markdown-content-container blockquote, 
        #markdown-content-container code, 
        #markdown-content-container pre {
          color: rgb(0,0,0) !important;
          text-shadow: none !important;
        }
        
        /* Ensure bullet points and numbered list markers are black */
        #markdown-content-container ul li::before,
        #markdown-content-container ol li::before {
          color: rgb(0,0,0) !important;
        }
      `
      contentContainer.appendChild(customStyle)
      tempDiv.appendChild(contentContainer)

      // Add footer
      const footer = document.createElement("div")
      footer.style.marginTop = "30px"
      footer.style.borderTop = "1px solid #eaeaea"
      footer.style.paddingTop = "10px"
      footer.style.fontSize = "10px"
      footer.style.color = "rgb(0,0,0)"
      footer.style.textAlign = "center"
      footer.innerHTML = "© 2025 Study Better. All rights reserved."
      tempDiv.appendChild(footer)

      // Append to body but hide it
      tempDiv.style.position = "absolute"
      tempDiv.style.left = "-9999px"
      document.body.appendChild(tempDiv)

      // Render markdown to the hidden div
      const contentElement = document.getElementById("markdown-content-container")
      if (contentElement) {
        // Use ReactDOM to render markdown with proper KaTeX support
        const ReactDOM = await import("react-dom/client")
        const root = ReactDOM.createRoot(contentElement)
        
        // Pre-process the markdown to ensure math expressions are properly formatted
        // This helps with proper rendering in the PDF
        const processedMarkdown = markdown
          .replace(/\$\$(.*?)\$\$/g, (_, math) => `$$${math.trim()}$$`) // Clean up display math
          .replace(/\$(.*?)\$/g, (_, math) => `$${math.trim()}$`) // Clean up inline math
          
        root.render(
          <div className="prose max-w-none" style={{ color: "rgb(0,0,0)" }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[
                [rehypeKatex, { 
                  output: 'html',
                  throwOnError: false, 
                  strict: false,
                  displayMode: false,
                  trust: true 
                }]
              ]}
components={{
  p: ({ node, ...props }: any) => (
    <p style={{
      color: "rgb(0,0,0)",
      fontSize: "11pt",
      margin: "10pt 0",
      lineHeight: "1.5",
      textAlign: "left"
    }} {...props} />
  ),

  h1: ({ node, ...props }: any) => (
    <h1 style={{
      color: "rgb(0,0,0)",
      fontSize: "18pt",
      fontWeight: 700,
      textAlign: "center",
      marginTop: "24pt",
      marginBottom: "12pt",
      borderBottom: "1px solid #d0d0d0",
      paddingBottom: "4pt"
    }} {...props} />
  ),

  h2: ({ node, ...props }: any) => (
    <h2 style={{
      color: "rgb(0,0,0)",
      fontSize: "16pt",
      fontWeight: 700,
      marginTop: "18pt",
      marginBottom: "10pt",
      borderBottom: "1px solid #d0d0d0",
      paddingBottom: "4pt"
    }} {...props} />
  ),

  h3: ({ node, ...props }: any) => (
    <h3 style={{
      color: "rgb(0,0,0)",
      fontSize: "14pt",
      fontWeight: 600,
      marginTop: "16pt",
      marginBottom: "8pt"
    }} {...props} />
  ),

  h4: ({ node, ...props }: any) => (
    <h4 style={{
      color: "rgb(0,0,0)",
      fontSize: "12pt",
      fontWeight: 600,
      fontStyle: "italic",
      marginTop: "14pt",
      marginBottom: "6pt"
    }} {...props} />
  ),

  h5: ({ node, ...props }: any) => (
    <h5 style={{
      color: "rgb(0,0,0)",
      fontSize: "11pt",
      fontWeight: 600,
      marginTop: "12pt",
      marginBottom: "5pt"
    }} {...props} />
  ),

  h6: ({ node, ...props }: any) => (
    <h6 style={{
      color: "rgb(0,0,0)",
      fontSize: "10.5pt",
      fontWeight: 600,
      fontStyle: "italic",
      marginTop: "10pt",
      marginBottom: "4pt"
    }} {...props} />
  ),

  li: ({ node, ...props }: any) => (
    <li style={{
      color: "rgb(0,0,0)",
      fontSize: "11pt",
      marginBottom: "6pt",
      lineHeight: "1.5"
    }} {...props} />
  ),

  ul: ({ node, ...props }: any) => (
    <ul style={{
      listStyleType: "disc",
      paddingLeft: "24pt",
      margin: "10pt 0"
    }} {...props} />
  ),

  ol: ({ node, ...props }: any) => (
    <ol style={{
      listStyleType: "decimal",
      paddingLeft: "24pt",
      margin: "10pt 0"
    }} {...props} />
  ),

  a: ({ node, ...props }: any) => (
    <a style={{
      color: "#0070f3",
      textDecoration: "none"
    }} {...props} />
  ),

  strong: ({ node, ...props }: any) => (
    <strong style={{
      fontWeight: 700,
      color: "rgb(0,0,0)"
    }} {...props} />
  ),

  em: ({ node, ...props }: any) => (
    <em style={{
      fontStyle: "italic",
      color: "rgb(0,0,0)"
    }} {...props} />
  ),

  code: ({ node, inline, ...props }: any) =>
    inline ? (
      <code style={{
        fontFamily: "monospace",
        fontSize: "0.9em",
        padding: "0.2rem 0.4rem",
        backgroundColor: "#f5f5f5",
        borderRadius: "0.25rem",
        color: "rgb(0,0,0)"
      }} {...props} />
    ) : (
      <code style={{
        color: "rgb(0,0,0)"
      }} {...props} />
    ),

  pre: ({ node, ...props }: any) => (
    <pre style={{
      color: "rgb(0,0,0)",
      backgroundColor: "#f5f5f5",
      padding: "1rem",
      borderRadius: "0.35rem",
      overflowX: "auto",
      margin: "2rem 0",
      fontSize: "0.95rem",
      lineHeight: "1.5"
    }} {...props} />
  ),
}}
            >
              {processedMarkdown}
            </ReactMarkdown>
          </div>
        )

        // Wait longer for KaTeX to fully render (increased to 3000ms)
        await new Promise((resolve) => setTimeout(resolve, 3000))

        // After rendering, force all text to be black with JavaScript
        const allTextElements = contentElement.querySelectorAll(
          "p, h1, h2, h3, h4, h5, h6, span, div, li, a, strong, em, blockquote, code, pre",
        )
        allTextElements.forEach((el) => {
          ;(el as HTMLElement).style.color = "rgb(0,0,0)"
          ;(el as HTMLElement).style.opacity = "1"
        })

        // Force browser to repaint KaTeX elements before capture
        const katexElements = contentElement.querySelectorAll('.katex, .katex-html, .katex-display');
        katexElements.forEach((el: Element) => {
          (el as HTMLElement).style.visibility = 'hidden';
          // Force reflow
          void (el as HTMLElement).offsetHeight;
          (el as HTMLElement).style.visibility = 'visible';
          (el as HTMLElement).style.color = 'rgb(0,0,0)';
        });
        
        // Adjust KaTeX fraction lines to be higher
        const fracLines = contentElement.querySelectorAll(".katex .frac-line")
        fracLines.forEach((line) => {
          ;(line as HTMLElement).style.marginTop = "0em"
          ;(line as HTMLElement).style.borderBottomWidth = "1px"
          ;(line as HTMLElement).style.borderBottomColor = "rgb(0,0,0)"
        })
        
        // Wait a bit more after forcing repaint
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Generate PDF - single continuous page
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "pt",
          format: [595.28, 841.89], // A4 size
          putOnlyUsedFonts: true,
          compress: true // Enable PDF compression
        })

        // Capture the rendered content with optimized settings for file size
        const canvas = await html2canvas(tempDiv, {
          scale: 1.5, // Reduced scale for smaller file size (was 3.0)
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: "#ffffff",
          onclone: (clonedDoc) => {
            // Force black text in the cloned document before rendering
            const clonedContent = clonedDoc.getElementById("markdown-content-container")
            if (clonedContent) {
              // Add a style element to force KaTeX rendering
              const style = clonedDoc.createElement('style')
              style.innerHTML = `
                .katex, .katex * { color: #000000 !important; }
                .katex .frac-line { 
                  border-bottom-color: #000000 !important; 
                  border-bottom-width: 1px !important;
                }
                .katex .sqrt .sqrt-sign {
                  color: #000000 !important;
                  border-top-color: #000000 !important;
                }
                
                /* Force display of KaTeX elements */
                .katex, .katex-display, .katex-html {
                  display: block !important;
                  visibility: visible !important;
                  opacity: 1 !important;
                }
              `
              clonedDoc.head.appendChild(style)
              
              const allElements = clonedContent.querySelectorAll("*")
              allElements.forEach((el) => {
                ;(el as HTMLElement).style.color = "rgb(0,0,0)"
                ;(el as HTMLElement).style.opacity = "1"
              })

              // Adjust KaTeX fraction lines in the cloned document
              const fracLines = clonedContent.querySelectorAll(".katex .frac-line")
              fracLines.forEach((line) => {
                ;(line as HTMLElement).style.marginTop = "0em"
                ;(line as HTMLElement).style.borderBottomWidth = "1px"
                ;(line as HTMLElement).style.borderBottomColor = "rgb(0,0,0)"
              })

              // Add custom styles for enhanced formatting in PDFs
              const enhancedFormattingStyle = document.createElement("style")
              enhancedFormattingStyle.textContent = `
                /* 📦 Core Wrapper */
#markdown-content-container.pdf-export,
.pdf-export {
  font-family: 'Georgia', 'Times New Roman', serif;
  line-height: 1.5;
  color: #000000;
}

/* 🏷 Headings */
.pdf-export h1 {
  font-size: 18pt;
  font-weight: 700;
  text-align: center;
  margin-top: 24pt;
  margin-bottom: 12pt;
  color: #000000;
  border-bottom: 1px solid #d0d0d0;
  padding-bottom: 4pt;
}

.pdf-export h2 {
  font-size: 16pt;
  font-weight: 700;
  margin-top: 18pt;
  margin-bottom: 10pt;
  color: #000000;
  border-bottom: 1px solid #d0d0d0;
  padding-bottom: 4pt;
}

.pdf-export h3 {
  font-size: 14pt;
  font-weight: 600;
  margin-top: 16pt;
  margin-bottom: 8pt;
  color: #000000;
}

.pdf-export h4 {
  font-size: 12pt;
  font-weight: 600;
  font-style: italic;
  margin-top: 14pt;
  margin-bottom: 6pt;
  color: #000000;
}

/* 📝 Paragraphs */
.pdf-export p {
  font-size: 11pt;
  margin: 10pt 0;
  line-height: 1.5;
  color: #000000;
  text-align: left;
}

/* 📋 Lists */
.pdf-export ul {
  list-style-type: disc;
  padding-left: 24pt;
  margin: 10pt 0;
}

.pdf-export ol {
  list-style-type: decimal;
  padding-left: 24pt;
  margin: 10pt 0;
  line-height: 1.5;
}

.pdf-export li {
  font-size: 11pt;
  margin-bottom: 6pt;
  color: #000000;
  line-height: 1.5;
}

/* ✅ List Marker Fix */
.pdf-export ul li::marker,
.pdf-export ol li::marker {
  color: #000000;
}

/* 🔤 Text emphasis */
.pdf-export strong {
  font-weight: 700;
  color: #000000;
}

.pdf-export em {
  font-style: italic;
  color: #000000;
}

/* ⬇️ Horizontal rule */
.pdf-export hr {
  border: 0;
  height: 1pt;
  background-color: #cccccc;
  margin: 24pt 0;
}

/* ❓ Blockquotes (for examples, quotes, questions) */
.pdf-export blockquote {
  border-left: 3pt solid #d0d0d0;
  background-color: #f9f9f9;
  margin: 14pt 0;
  padding: 10pt 12pt;
  font-style: italic;
  color: #000000;
}

/* 📊 Tables */
.pdf-export table {
  border-collapse: collapse;
  width: 100%;
  margin: 1rem 0;
}

.pdf-export th,
.pdf-export td {
  border: 1px solid #ccc;
  padding: 8px 12px;
  font-size: 11pt;
  color: #000000;
}

.pdf-export th {
  background-color: #f0f0f0;
  font-weight: 700;
}

/* 📐 Code blocks */
.pdf-export pre {
  background-color: #f5f5f5;
  padding: 1rem;
  border-radius: 0.35rem;
  overflow-x: auto;
  margin: 2rem 0;
  font-size: 0.95rem;
  line-height: 1.5;
  color: #000000;
}

.pdf-export code {
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  padding: 0.2rem 0.4rem;
  background-color: #f5f5f5;
  border-radius: 0.25rem;
  color: #000000;
}

/* 🧠 Practice question box */
.pdf-export .practice-question {
  margin: 14pt 0;
  padding: 10pt;
  background-color: #f9f9f9;
  border-left: 3pt solid #d0d0d0;
}

/* ➗ Math (KaTeX) formatting */
.pdf-export .katex-display {
  text-align: center;
  margin: 16pt 0;
  padding: 4pt 0;
}

.pdf-export .katex-display > .katex {
  display: block;
  text-align: center;
  margin: 1em 0;
}

.pdf-export .katex .mfrac {
  margin: 0.2em 0;
}

.pdf-export .katex .mfrac .frac-line {
  border-bottom-width: 1px !important;
  border-bottom-color: #000000 !important;
}

/* 🦶 Footer */
.pdf-export .pdf-footer {
  margin-top: 24pt;
  border-top: 1pt solid #eaeaea;
  padding-top: 8pt;
  font-size: 9pt;
  color: #000000;
  text-align: center;
}

/* 🏷️ Optional Keyword Highlighting */
.pdf-export .keyword-label {
  background-color: #f0f0f0;
  padding: 0.1em 0.3em;
  border-radius: 4px;
  font-weight: 700;
  color: #000000;
}

              `
              clonedContent.appendChild(enhancedFormattingStyle)
              
              // Special handling for list markers to ensure they're black
              const listStyleFix = clonedDoc.createElement('style')
              listStyleFix.innerHTML = `
                #markdown-content-container ul li::marker {
                  color: #000000 !important;
                }
                #markdown-content-container ol li::marker {
                  color: #000000 !important;
                }
              `
              clonedDoc.head.appendChild(listStyleFix)

              // Apply academic formatting guidelines to the cloned document
              const academicStyles = clonedDoc.createElement('style')
              academicStyles.innerHTML = `
                /* Academic document formatting */
                body {
                  font-family: 'Georgia', 'Times New Roman', serif;
                  line-height: 1.5;
                  color: #000000;
                }
                
                /* Clear hierarchical structure for headings */
                h1 {
                  font-size: 18pt;
                  font-weight: 700;
                  text-align: center;
                  margin-top: 24pt;
                  margin-bottom: 12pt;
                  color: #000000;
                }
                
                h2 {
                  font-size: 16pt;
                  font-weight: 700;
                  text-align: left;
                  margin-top: 18pt;
                  margin-bottom: 10pt;
                  color: #000000;
                  border-bottom: 1px solid #d0d0d0;
                  padding-bottom: 4pt;
                }
                
                h3 {
                  font-size: 14pt;
                  font-weight: 600;
                  text-align: left;
                  margin-top: 16pt;
                  margin-bottom: 8pt;
                  color: #000000;
                }
                
                h4 {
                  font-size: 12pt;
                  font-weight: 600;
                  font-style: italic;
                  margin-top: 14pt;
                  margin-bottom: 6pt;
                  color: #000000;
                }
                
                /* Text body */
                p {
                  font-size: 11pt;
                  margin: 10pt 0;
                  line-height: 1.5;
                  color: #000000;
                  text-align: left;
                }
                
                /* Lists - for concepts under headings */
                ul {
                  list-style-type: disc;
                  padding-left: 24pt;
                  margin: 10pt 0;
                }
                
                ol {
                  list-style-type: decimal;
                  padding-left: 24pt;
                  margin: 10pt 0;
                  line-height: 1.5;
                }
                
                li {
                  font-size: 11pt;
                  margin-bottom: 6pt;
                  color: #000000;
                  line-height: 1.5;
                }
                
                /* Bold text for emphasis and labels */
                strong {
                  font-weight: 700;
                  color: #000000;
                }
                
                /* Italics for examples and theorists */
                em {
                  font-style: italic;
                  color: #000000;
                }
                
                /* Section breaks */
                hr {
                  border: 0;
                  height: 1pt;
                  background-color: #cccccc;
                  margin: 24pt 0;
                }
                
                /* Practice question format */
                .practice-question {
                  margin: 14pt 0;
                  padding: 10pt;
                  background-color: #f9f9f9;
                  border-left: 3pt solid #d0d0d0;
                }
                
                /* Math formatting - centered and set apart with space */
                .katex-display {
                  text-align: center;
                  margin: 16pt 0;
                  padding: 4pt 0;
                }
                
                /* Footer for attribution */
                .pdf-footer {
                  margin-top: 24pt;
                  border-top: 1pt solid #eaeaea;
                  padding-top: 8pt;
                  font-size: 9pt;
                  color: #000000;
                  text-align: center;
                }
                
                /* Fix fraction rendering in equations */
                .katex .mfrac {
                  margin: 0.2em 0;
                }
                
                .katex .mfrac .frac-line {
                  border-bottom-width: 1px !important;
                  border-bottom-color: #000000 !important;
                }
                
                /* Ensure math takes proper space for readability */
                .katex-display > .katex {
                  display: block;
                  text-align: center;
                  margin: 1em 0;
                }
              `
              clonedDoc.head.appendChild(academicStyles)
            }
          },
        })

        // Get the dimensions
        // Use JPEG format with quality setting for better compression
        const imgData = canvas.toDataURL("image/jpeg", 0.85) // Medium-high quality JPEG instead of PNG
        const imgWidth = 595.28 // A4 width
        const pageHeight = 841.89 // A4 height
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        
        // Calculate actual content height needed for the PDF
        const maxHeight = Math.min(imgHeight, 10000); // Cap maximum height to prevent oversized PDFs
        
        // Create a PDF with optimized settings
        const singlePagePdf = new jsPDF({
          orientation: "portrait",
          unit: "pt",
          format: [imgWidth, Math.min(maxHeight + 40, 15000)], // Add margin but limit max size
          compress: true // Enable compression
        })

        // Add the image to the PDF with optimized settings
        singlePagePdf.addImage(imgData, "JPEG", 0, 20, imgWidth, imgHeight, undefined, 'FAST', 0)

        // Add copyright at the bottom
        singlePagePdf.setFontSize(8)
        singlePagePdf.setTextColor(0, 0, 0) // Black text for copyright
        singlePagePdf.text("© 2025 Study Better. All rights reserved.", imgWidth / 2, Math.min(imgHeight + 30, maxHeight + 30), {
          align: "center",
        })

        // Check if the file might be too large and display a warning if needed
        if (canvas.width * canvas.height > 4000000) { // Rough estimate of when size might be an issue
          console.warn("Large content detected - PDF optimization applied");
        }

        // Generate filename
        const originalName = fileName.replace(".pdf", "")
        const suffix = taskType === "summarize" ? "_summarized" : "_explained"
        const outputFileName = `${originalName}${suffix}.pdf`

        // Save PDF
        singlePagePdf.save(outputFileName)

        // Clean up
        document.body.removeChild(tempDiv)
        document.head.removeChild(katexCss)
        document.head.removeChild(katexFontsStyle)
      }

      toast({
        title: "Enhanced PDF Generated",
        description: "Your PDF has been successfully generated with proper math rendering.",
      })
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast({
        title: "PDF Generation Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button onClick={generatePdf} disabled={isGenerating} className="w-full">
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating Enhanced PDF...
        </>
      ) : (
        <>
          <FileDown className="mr-2 h-4 w-4" />
          Download as Single-Page PDF
        </>
      )}
    </Button>
  )
}
