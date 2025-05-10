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

interface PdfGeneratorProps {
  markdown: string
  fileName: string
  taskType: string
}

export function PdfGenerator({ markdown, fileName, taskType }: PdfGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()
  const contentRef = useRef<HTMLDivElement>(null)
  
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
      tempDiv.style.color = "#000000" // Ensure font color is black
      tempDiv.style.fontFamily = "Lexend, Arial, sans-serif" // Using Lexend for better readability

      // Create header with Study Better logo/title
      const header = document.createElement("div")
      header.style.marginBottom = "20px"
      header.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h1 style="font-size: 24px; font-weight: bold; color: #000000; margin: 0;">Study Better</h1>
          <div style="font-size: 14px; color: #000000;">${new Date().toLocaleDateString()}</div>
        </div>
        <div style="height: 2px; background-color: #5c6ac4; margin-bottom: 20px;"></div>
      `
      tempDiv.appendChild(header)

      // Create title based on task type
      const title = document.createElement("h2")
      title.style.fontSize = "20px"
      title.style.fontWeight = "bold"
      title.style.marginBottom = "16px"
      title.style.color = "#000000" // Ensure title is black
      title.textContent = `${taskType === "summarize" ? "Summary" : "Explanation"} of: ${fileName.replace(".pdf", "")}`
      tempDiv.appendChild(title)

      // Create content container
      const contentContainer = document.createElement("div")
      contentContainer.id = "markdown-content-container"
      contentContainer.className = "prose max-w-none"
      contentContainer.style.fontSize = "14px"
      contentContainer.style.lineHeight = "1.4"
      contentContainer.style.color = "#000000" // Ensure content text is black

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
          /* These values are taken from the definition of \r@@t in TeX source */
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
        .katex .sizing.reset-size1.size4, .katex .fontsize-ensurer.reset-size1.size4 {
          font-size: 1.6em;
        }
        .katex .sizing.reset-size1.size5, .katex .fontsize-ensurer.reset-size1.size5 {
          font-size: 1.8em;
        }
        .katex .sizing.reset-size1.size6, .katex .fontsize-ensurer.reset-size1.size6 {
          font-size: 2em;
        }
        .katex .sizing.reset-size1.size7, .katex .fontsize-ensurer.reset-size1.size7 {
          font-size: 2.4em;
        }
        .katex .sizing.reset-size1.size8, .katex .fontsize-ensurer.reset-size1.size8 {
          font-size: 2.88em;
        }
        .katex .sizing.reset-size1.size9, .katex .fontsize-ensurer.reset-size1.size9 {
          font-size: 3.456em;
        }
        .katex .sizing.reset-size1.size10, .katex .fontsize-ensurer.reset-size1.size10 {
          font-size: 4.148em;
        }
        .katex .sizing.reset-size1.size11, .katex .fontsize-ensurer.reset-size1.size11 {
          font-size: 4.976em;
        }

        /* Fix specific elements */
        .katex .sqrt .sqrt-sign {
          color: #000000 !important;
          border-top-color: #000000 !important;
        }

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

      // Add custom CSS to ensure all text is black and adjust fraction line position
      const customStyle = document.createElement("style")
      customStyle.textContent = `
        /* Ensure all text elements are black */
        p, h1, h2, h3, h4, h5, h6, span, div, li, ul, ol, a, strong, em, blockquote, code, pre {
          color: #000000;
        }
        
        /* Ensure math expressions are black */
        .katex, .katex-display, .katex-inline {
          color: #000000 !important;
        }
        
        .katex *, .katex-html * {
          color: #000000 !important;
          border-color: #000000 !important;
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
        
        /* Ensure code blocks have black text */
        pre, code {
          color: #000000 !important;
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
      footer.style.color = "#000000"
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
        // Use ReactDOM to render the MarkdownPreview component
        const ReactDOM = await import("react-dom/client")
        const root = ReactDOM.createRoot(contentElement)
        
        // Pre-process the markdown to ensure math expressions are properly formatted
        // This helps with proper rendering in the PDF
        const processedMarkdown = markdown
          .replace(/\$\$(.*?)\$\$/g, (_, math) => `$$${math.trim()}$$`) // Clean up display math
          .replace(/\$(.*?)\$/g, (_, math) => `$${math.trim()}$`) // Clean up inline math
        
        root.render(
          <div className="prose max-w-none" style={{ color: "#000000" }}>
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
                p: ({ node, ...props }) => <p style={{ color: "#000000" }} {...props} />,
                h1: ({ node, ...props }) => <h1 style={{ color: "#000000" }} {...props} />,
                h2: ({ node, ...props }) => <h2 style={{ color: "#000000" }} {...props} />,
                h3: ({ node, ...props }) => <h3 style={{ color: "#000000" }} {...props} />,
                h4: ({ node, ...props }) => <h4 style={{ color: "#000000" }} {...props} />,
                h5: ({ node, ...props }) => <h5 style={{ color: "#000000" }} {...props} />,
                h6: ({ node, ...props }) => <h6 style={{ color: "#000000" }} {...props} />,
                li: ({ node, ...props }) => <li style={{ color: "#000000" }} {...props} />,
                a: ({ node, ...props }) => <a style={{ color: "#000000" }} {...props} />,
                strong: ({ node, ...props }) => <strong style={{ color: "#000000" }} {...props} />,
                em: ({ node, ...props }) => <em style={{ color: "#000000" }} {...props} />,
                code: ({ node, ...props }) => <code style={{ color: "#000000" }} {...props} />,
                pre: ({ node, ...props }) => <pre style={{ color: "#000000" }} {...props} />
              }}
            >
              {processedMarkdown}
            </ReactMarkdown>
          </div>
        )

        // Wait longer for KaTeX to fully render (increased to 3000ms)
        // This is crucial for complex formulas
        await new Promise((resolve) => setTimeout(resolve, 3000))
        
        // Force browser to repaint KaTeX elements before capture
        const katexElements = contentElement.querySelectorAll('.katex, .katex-html, .katex-display');
        katexElements.forEach((el: Element) => {
          (el as HTMLElement).style.visibility = 'hidden';
          // Force reflow
          void (el as HTMLElement).offsetHeight;
          (el as HTMLElement).style.visibility = 'visible';
        });
        
        // Wait a bit more after forcing repaint
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Generate PDF with improved settings
        const pdf = new jsPDF({
          orientation: "p",
          unit: "pt",
          format: "a4",
          putOnlyUsedFonts: true,
          floatPrecision: 16 // For better rendering quality
        })
        
        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = pdf.internal.pageSize.getHeight()

        // Capture the rendered content with higher quality settings
        const canvas = await html2canvas(tempDiv, {
          scale: 3, // Higher scale for better quality
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: "#ffffff",
          onclone: (clonedDoc) => {
            // Apply additional styles to the cloned document to ensure math renders correctly
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
            
            // Force repaint of KaTeX elements in the clone
            const clonedMath = clonedDoc.querySelectorAll('.katex, .katex-html, .katex-display');
            clonedMath.forEach((el: Element) => {
              (el as HTMLElement).style.color = '#000000';
              (el as HTMLElement).style.borderColor = '#000000';
            });
          }
        })

        // Calculate the number of pages needed
        const imgData = canvas.toDataURL("image/png", 1.0) // Use highest quality
        const imgWidth = canvas.width
        const imgHeight = canvas.height
        const ratio = Math.min(pdfWidth / imgWidth, 1)
        const imgX = (pdfWidth - imgWidth * ratio) / 2
        const pageHeight = pdfHeight - 40 // Leave space for page numbers

        let heightLeft = imgHeight * ratio
        let position = 0
        let page = 1

        // Add first page
        pdf.addImage(imgData, "PNG", imgX, 20, imgWidth * ratio, imgHeight * ratio, undefined, 'FAST')
        heightLeft -= pageHeight

        // Add page numbers
        pdf.setFontSize(10)
        pdf.setTextColor(0, 0, 0) // Black text for page numbers
        pdf.text(`Page ${page}`, pdfWidth - 40, pdfHeight - 20, { align: "right" })

        // Add additional pages if needed
        while (heightLeft > 0) {
          position = heightLeft - imgHeight * ratio
          pdf.addPage()
          page++
          pdf.addImage(imgData, "PNG", imgX, position, imgWidth * ratio, imgHeight * ratio, undefined, 'FAST')
          heightLeft -= pageHeight

          // Add page numbers
          pdf.setFontSize(10)
          pdf.setTextColor(0, 0, 0)
          pdf.text(`Page ${page}`, pdfWidth - 40, pdfHeight - 20, { align: "right" })

          // Add copyright on each page
          pdf.setFontSize(8)
          pdf.setTextColor(0, 0, 0)
          pdf.text("© 2025 Study Better. All rights reserved.", pdfWidth / 2, pdfHeight - 20, { align: "center" })
        }

        // Generate filename
        const originalName = fileName.replace(".pdf", "")
        const suffix = taskType === "summarize" ? "_summarized" : "_explained"
        const outputFileName = `${originalName}${suffix}.pdf`

        // Save PDF
        pdf.save(outputFileName)

        // Clean up
        document.body.removeChild(tempDiv)
        document.head.removeChild(katexCss)
        document.head.removeChild(katexFontsStyle)
      }

      toast({
        title: "PDF Generated",
        description: "Your PDF has been successfully generated and downloaded.",
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
          Generating PDF...
        </>
      ) : (
        <>
          <FileDown className="mr-2 h-4 w-4" />
          Download as PDF
        </>
      )}
    </Button>
  )
}
