"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from "docx"

interface WordDocumentGeneratorProps {
  markdown: string
  fileName: string
  taskType: string
}

export function WordDocumentGenerator({ markdown, fileName, taskType }: WordDocumentGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()

  const generateWordDoc = async () => {
    setIsGenerating(true)

    try {
      // Parse markdown content
      const lines = markdown.split("\n")
      const docElements = []

      // Add header
      docElements.push(
        new Paragraph({
          text: "Study Better",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.LEFT,
        }),
      )

      // Add date
      docElements.push(
        new Paragraph({
          text: new Date().toLocaleDateString(),
          alignment: AlignmentType.RIGHT,
        }),
      )

      // Add separator
      docElements.push(
        new Paragraph({
          text: "",
          border: {
            bottom: {
              color: "#5c6ac4",
              style: BorderStyle.SINGLE,
              size: 1,
            },
          },
        }),
      )

      // Add title
      docElements.push(
        new Paragraph({
          text: `${taskType === "summarize" ? "Summary" : "Explanation"} of: ${fileName.replace(".pdf", "")}`,
          heading: HeadingLevel.HEADING_2,
          spacing: {
            before: 400,
            after: 400,
          },
        }),
      )

      // Process markdown content
      let inCodeBlock = false
      let inList = false
      let currentListItems = []

      for (const line of lines) {
        // Handle code blocks
        if (line.startsWith("```")) {
          inCodeBlock = !inCodeBlock
          if (!inCodeBlock && currentListItems.length > 0) {
            // Add the list if we're ending a code block and had list items
            docElements.push(
              new Paragraph({
                text: currentListItems.join("\n"),
                bullet: {
                  level: 0,
                },
              }),
            )
            currentListItems = []
          }
          continue
        }

        if (inCodeBlock) {
          docElements.push(
            new Paragraph({
              text: line,
              style: "Code",
              spacing: {
                before: 200,
                after: 200,
              },
            }),
          )
          continue
        }

        // Handle headings
        if (line.startsWith("# ")) {
          docElements.push(
            new Paragraph({
              text: line.substring(2),
              heading: HeadingLevel.HEADING_1,
              spacing: {
                before: 400,
                after: 200,
              },
            }),
          )
        } else if (line.startsWith("## ")) {
          docElements.push(
            new Paragraph({
              text: line.substring(3),
              heading: HeadingLevel.HEADING_2,
              spacing: {
                before: 400,
                after: 200,
              },
            }),
          )
        } else if (line.startsWith("### ")) {
          docElements.push(
            new Paragraph({
              text: line.substring(4),
              heading: HeadingLevel.HEADING_3,
              spacing: {
                before: 300,
                after: 200,
              },
            }),
          )
        } else if (line.startsWith("- ")) {
          // Handle list items
          currentListItems.push(line.substring(2))
          inList = true
        } else if (line.trim() === "" && inList) {
          // End of list
          docElements.push(
            new Paragraph({
              text: currentListItems.join("\n"),
              bullet: {
                level: 0,
              },
            }),
          )
          currentListItems = []
          inList = false
          docElements.push(new Paragraph(""))
        } else if (line.trim() === "") {
          // Empty line
          docElements.push(new Paragraph(""))
        } else if (line.includes("$") || line.includes("\\")) {
          // Math expressions - add a note that these are best viewed in the markdown
          docElements.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line.replace(/\$/g, "").replace(/\\\\/g, "\\"),
                  italics: true,
                }),
              ],
            }),
          )
        } else {
          // Regular paragraph
          docElements.push(new Paragraph(line))
        }
      }

      // Add any remaining list items
      if (currentListItems.length > 0) {
        docElements.push(
          new Paragraph({
            text: currentListItems.join("\n"),
            bullet: {
              level: 0,
            },
          }),
        )
      }

      // Add note about math expressions
      docElements.push(
        new Paragraph({
          text: "",
          spacing: {
            before: 800,
          },
        }),
      )
      docElements.push(
        new Paragraph({
          text: "Note About Mathematical Expressions",
          heading: HeadingLevel.HEADING_2,
        }),
      )
      docElements.push(
        new Paragraph(
          "This document may contain mathematical expressions that were originally formatted using LaTeX notation. " +
            "For the best viewing experience of these expressions, please refer to the original markdown file.",
        ),
      )

      // Create Word document
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: docElements,
          },
        ],
      })

      // Generate blob from document
      const blob = await Packer.toBlob(doc)

      // Create download link
      const originalName = fileName.replace(".pdf", "")
      const suffix = taskType === "summarize" ? "_summarized" : "_explained"
      const outputFileName = `${originalName}${suffix}.docx`

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = outputFileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Word Document Generated",
        description: "Your Word document has been successfully generated and downloaded.",
      })
    } catch (error) {
      console.error("Error generating Word document:", error)
      toast({
        title: "Word Document Generation Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button onClick={generateWordDoc} disabled={isGenerating} className="w-full">
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating Word Document...
        </>
      ) : (
        <>
          <FileText className="mr-2 h-4 w-4" />
          Download as Word (.docx)
        </>
      )}
    </Button>
  )
}
