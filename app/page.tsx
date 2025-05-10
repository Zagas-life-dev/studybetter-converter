import { PdfUploadForm } from "@/components/pdf-upload-form"

export default function Home() {
  return (
    <main className="container mx-auto py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3">Study Better PDF Platform</h1>
          <p className="text-lg text-muted-foreground">
            Upload your PDF documents and get AI-powered summaries or explanations with mathematical expressions
            properly formatted.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Powered by Mistral AI Agent with OCR technology for accurate document analysis. Download your results as
            formatted PDFs with Study Better branding.
          </p>
        </div>
        <PdfUploadForm />
      </div>
    </main>
  )
}
