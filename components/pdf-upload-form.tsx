"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { MarkdownPreview } from "./markdown-preview"
import { PdfGenerator } from "./pdf-generator"
import { EnhancedPdfGenerator } from "./enhanced-pdf-generator"
import { WordDocumentGenerator } from "./word-document-generator"
import { Loader2, FileText, Upload, CheckCircle, Copy, Download, AlertCircle, Bot, Info } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

export function PdfUploadForm() {
  const [file, setFile] = useState<File | null>(null)
  const [instructions, setInstructions] = useState("")
  const [taskType, setTaskType] = useState("summarize")
  const [isLoading, setIsLoading] = useState(false)
  const [markdownContent, setMarkdownContent] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [processingStep, setProcessingStep] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isInitialMount = useRef(true)

  // Clear any errors on component mount/page refresh
  useEffect(() => {
    setError(null)
    setProcessingStep(null)
    setProgress(0)
    isInitialMount.current = false

    // This will help prevent any unwanted form submissions on page refresh
    const handleBeforeUnload = () => {
      isInitialMount.current = true
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [])

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds the maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return "Only PDF files are supported."
    }

    return null
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      const validationError = validateFile(selectedFile)

      if (validationError) {
        setError(validationError)
        // Reset the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
        return
      }

      setFile(selectedFile)
      setError(null)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      const validationError = validateFile(droppedFile)

      if (validationError) {
        setError(validationError)
        return
      }

      setFile(droppedFile)
      setError(null)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  // Function to determine the correct API endpoint based on environment
  const getApiEndpoint = () => {
    // Check if we're in a Netlify environment
    if (typeof window !== 'undefined' && window.location.hostname.includes('netlify.app')) {
      return "/.netlify/functions/api";
    }
    // Otherwise use the Next.js API route (works on Vercel and local development)
    return "/api/analyze";
  };

  // Update the handleSubmit function to better handle errors
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !instructions) return

    // Prevent accidental double submissions
    if (isLoading) return

    setIsLoading(true)
    setError(null)
    setMarkdownContent("")
    setProcessingStep("Uploading PDF")
    setProgress(10)

    const formData = new FormData()
    formData.append("pdf", file)
    formData.append("instructions", instructions)
    formData.append("taskType", taskType)

    try {
      setProcessingStep("Processing with OCR")
      setProgress(30)

      const apiEndpoint = getApiEndpoint();
      console.log(`Using API endpoint: ${apiEndpoint}`);
      
      const response = await fetch(apiEndpoint, {
        method: "POST",
        body: formData,
      })

      setProcessingStep("Agent is analyzing document")
      setProgress(60)

      // Get the response text first
      let responseText
      try {
        responseText = await response.text()
        console.log("Response status:", response.status)
        console.log("Response text preview:", responseText.substring(0, 200))
      } catch (e) {
        console.error("Failed to read response text:", e)
        throw new Error("Failed to read server response. Please try again.")
      }

      // Try to parse it as JSON
      let data
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        console.error("Failed to parse response:", e)
        console.error("Raw response:", responseText)

        // Check if it's an HTML response (likely an error page)
        if (responseText.includes("<!DOCTYPE html>") || responseText.includes("<html>")) {
          throw new Error("Server returned an HTML error page. This might be due to a server timeout or memory issue.")
        }

        // If it starts with "Internal Server Error" or similar
        if (responseText.startsWith("Internal")) {
          throw new Error(
            "Internal server error occurred. Please try again with a smaller PDF or simpler instructions.\n\nRaw response: " +
              responseText,
          )
        }

        throw new Error(
          `Failed to parse server response: ${e.message}\n\nRaw response: ${responseText.substring(0, 100)}...`,
        )
      }

      if (response.ok) {
        setProcessingStep("Finalizing results")
        setProgress(90)

        if (!data.markdown) {
          throw new Error("Server response did not contain markdown content. Please try again.")
        }

        setMarkdownContent(data.markdown)
        setProcessingStep(null)
        setProgress(100)
      } else {
        const errorMessage = data.error || `Error (${response.status}): ${response.statusText}`
        const errorDetails = data.details ? `\n\nDetails: ${data.details}` : ""
        setError(errorMessage + errorDetails)
        setProcessingStep(null)
        setProgress(0)
      }
    } catch (error) {
      console.error("Error:", error)
      setError(error instanceof Error ? error.message : "An unexpected error occurred. Please try again.")
      setProcessingStep(null)
      setProgress(0)
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(markdownContent)
      toast({
        title: "Copied to clipboard",
        description: "The markdown content has been copied to your clipboard.",
      })
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard. Please try again.",
        variant: "destructive",
      })
    }
  }

  const downloadMarkdown = () => {
    const element = document.createElement("a")
    const blob = new Blob([markdownContent], { type: "text/markdown" })
    element.href = URL.createObjectURL(blob)

    // Create filename based on the original file and task type
    const originalName = file ? file.name.replace(".pdf", "") : "document"
    const suffix = taskType === "summarize" ? "_summarized" : "_explained"
    element.download = `${originalName}${suffix}.md`

    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const hasMathContent = markdownContent.includes("$") || markdownContent.includes("\\")

  return (
    <div className="space-y-8">
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="pdf">Upload PDF Document</Label>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              {file ? (
                <div className="flex items-center justify-center space-x-2">
                  <FileText className="h-6 w-6 text-blue-500" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setFile(null)}>
                    Change
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto" />
                  <div className="text-sm text-gray-500">Drag and drop your PDF here, or click to browse</div>
                  <Input
                    id="pdf"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    required
                    className="hidden"
                    ref={fileInputRef}
                  />
                  <Button type="button" variant="outline" onClick={() => document.getElementById("pdf")?.click()}>
                    Select PDF
                  </Button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Maximum file size: 10MB. Only PDF files are accepted.</p>
          </div>

          <div className="space-y-2">
            <Label>Task Type</Label>
            <RadioGroup value={taskType} onValueChange={setTaskType} className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="summarize" id="summarize" />
                <Label htmlFor="summarize">Summarize</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="explain" id="explain" />
                <Label htmlFor="explain">Explain</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions for AI</Label>
            <Textarea
              id="instructions"
              placeholder="E.g., Summarize the key points of this document, or Explain the concepts in simple terms..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={4}
              required
            />
          </div>

          <Button type="submit" disabled={isLoading || !file || !instructions} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Bot className="mr-2 h-4 w-4" />
                Process with AI Agent
              </>
            )}
          </Button>
        </form>

        {processingStep && (
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{processingStep}</span>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
          </Alert>
        )}
      </Card>

      {markdownContent && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <h2 className="text-xl font-semibold">AI Agent Response</h2>
              </div>
            </div>

            {hasMathContent && (
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertTitle>Mathematical Content Detected</AlertTitle>
                <AlertDescription>
                  This document contains mathematical expressions. The enhanced PDF export will properly render these
                  expressions with correct positioning of division symbols and other mathematical notation.
                </AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="preview" className="mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="export">Export</TabsTrigger>
              </TabsList>
              <TabsContent value="preview" className="mt-4">
                <div className="prose max-w-none dark:prose-invert">
                  <MarkdownPreview markdown={markdownContent} />
                </div>
              </TabsContent>
              <TabsContent value="export" className="mt-4">
                <div className="grid gap-4">
                  <div className="flex flex-col space-y-2">
                    <h3 className="text-lg font-medium">Download Options</h3>
                    <p className="text-sm text-muted-foreground">
                      Download your results in different formats for sharing or reference.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <Card className="p-4">
                      <div className="flex flex-col space-y-2 mb-4">
                        <h4 className="font-medium">Markdown Format</h4>
                        <p className="text-sm text-muted-foreground">
                          Download the raw markdown text that can be used in markdown editors.
                        </p>
                      </div>
                      <Button onClick={downloadMarkdown} className="w-full">
                        <Download className="mr-2 h-4 w-4" />
                        Download Markdown
                      </Button>
                    </Card>

                    <Card className="p-4">
                      <div className="flex flex-col space-y-2 mb-4">
                        <h4 className="font-medium">Enhanced PDF Format</h4>
                        <p className="text-sm text-muted-foreground">
                          Download a single-page PDF with properly rendered equations and Study Better branding.
                        </p>
                      </div>
                      <EnhancedPdfGenerator
                        markdown={markdownContent}
                        fileName={file?.name || "document.pdf"}
                        taskType={taskType}
                      />
                    </Card>

                    <Card className="p-4">
                      <div className="flex flex-col space-y-2 mb-4">
                        <h4 className="font-medium">Standard PDF Format</h4>
                        <p className="text-sm text-muted-foreground">
                          Download a multi-page PDF with standard formatting.
                        </p>
                      </div>
                      <PdfGenerator
                        markdown={markdownContent}
                        fileName={file?.name || "document.pdf"}
                        taskType={taskType}
                      />
                    </Card>

                    <Card className="p-4">
                      <div className="flex flex-col space-y-2 mb-4">
                        <h4 className="font-medium">Word Document</h4>
                        <p className="text-sm text-muted-foreground">Download as a Microsoft Word (.docx) document.</p>
                      </div>
                      <WordDocumentGenerator
                        markdown={markdownContent}
                        fileName={file?.name || "document.pdf"}
                        taskType={taskType}
                      />
                    </Card>
                  </div>
                  <div className="mt-2">
                    <Button variant="outline" onClick={copyToClipboard} className="w-full">
                      <Copy className="mr-2 h-4 w-4" />
                      Copy to Clipboard
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      )}
    </div>
  )
}
