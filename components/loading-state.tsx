import { Loader2 } from "lucide-react"

export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <h3 className="text-lg font-medium">Processing your PDF...</h3>
      <p className="text-sm text-muted-foreground mt-2">
        This may take a minute or two depending on the size of your document.
      </p>
    </div>
  )
}
