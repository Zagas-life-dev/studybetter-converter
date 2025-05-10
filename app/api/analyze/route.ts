import { type NextRequest, NextResponse } from "next/server"

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY
const SUMMARY_AGENT_ID = "ag:ab291cb7:20250507:untitled-agent:64806fa7" // Original agent for summarization
const EXPLAIN_AGENT_ID = "ag:ab291cb7:20250510:explain:9b572715" // New agent for explanation

export async function POST(request: NextRequest) {
  // Check if this is a proper POST request with content
  if (request.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
  }

  try {
    // Check for form data
    const formData = await request.formData()
    const pdfFile = formData.get("pdf") as File | null
    const instructions = formData.get("instructions") as string | null
    const taskType = formData.get("taskType") as string | null

    // Validate required fields
    if (!pdfFile) {
      return NextResponse.json({ error: "PDF file is required" }, { status: 400 })
    }

    if (!instructions) {
      return NextResponse.json({ error: "Instructions are required" }, { status: 400 })
    }

    if (!taskType) {
      return NextResponse.json({ error: "Task type is required" }, { status: 400 })
    }

    if (!MISTRAL_API_KEY) {
      return NextResponse.json({ error: "Mistral API key is not configured" }, { status: 500 })
    }

    console.log("Processing file:", pdfFile.name, "Size:", pdfFile.size, "Type:", pdfFile.type)
    console.log("Task type:", taskType)

    try {
      // Step 1: Upload the file to Mistral's files API
      const fileFormData = new FormData()
      fileFormData.append("file", pdfFile)
      fileFormData.append("purpose", "ocr")

      console.log("Uploading file to Mistral API")
      const fileUploadResponse = await fetch("https://api.mistral.ai/v1/files", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${MISTRAL_API_KEY}`,
        },
        body: fileFormData,
      })

      if (!fileUploadResponse.ok) {
        const errorText = await fileUploadResponse.text()
        console.error("File upload error:", errorText)
        return NextResponse.json({ error: `Failed to upload PDF file: ${errorText}` }, { status: 500 })
      }

      const fileData = await fileUploadResponse.json()
      const fileId = fileData.id
      console.log("File uploaded successfully with ID:", fileId)

      // Step 2: Get a signed URL for the file
      console.log("Getting signed URL for file")
      const signedUrlResponse = await fetch(`https://api.mistral.ai/v1/files/${fileId}/url`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${MISTRAL_API_KEY}`,
        },
      })

      if (!signedUrlResponse.ok) {
        const errorText = await signedUrlResponse.text()
        console.error("Signed URL error:", errorText)
        return NextResponse.json({ error: `Failed to get signed URL: ${errorText}` }, { status: 500 })
      }

      const signedUrlData = await signedUrlResponse.json()
      const signedUrl = signedUrlData.url
      console.log("Got signed URL for file")

      // Step 3: Create the agent completion payload with document_url
      // Select the appropriate agent ID based on task type
      const agentId = taskType === "summarize" ? SUMMARY_AGENT_ID : EXPLAIN_AGENT_ID
      console.log(`Using agent ID ${agentId} for task type: ${taskType}`)
      
      const systemPrompt = `You are an expert at analyzing PDF documents. 
Your task is to ${taskType === "summarize" ? "summarize" : "explain in detail"} the content of the PDF according to your system prompt.
Format your response in Markdown, including proper headings, lists, and emphasis.
If the content contains mathematical expressions, format them using LaTeX notation with $ for inline math and $$ for block math.
Be thorough and accurate in your analysis.`

      const agentPayload = {
        agent_id: agentId,
        max_tokens: 4000,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Here are my instructions: ${instructions}`,
              },
              {
                type: "document_url",
                document_url: signedUrl,
              },
            ],
          },
        ],
      }

      console.log(`Sending ${taskType} request to agent ${agentId}`)

      // Step 4: Send the request to the Mistral Agent Completion API
      const agentResponse = await fetch("https://api.mistral.ai/v1/agents/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${MISTRAL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(agentPayload),
      })

      // Log the status code
      console.log("Agent API response status:", agentResponse.status)

      // Get the response text first to log it in case of an error
      const responseText = await agentResponse.text()
      console.log("Agent API response preview:", responseText.substring(0, 200))

      // Check if the response is OK
      if (!agentResponse.ok) {
        console.error("Agent completion error response:", responseText)
        return NextResponse.json(
          {
            error: `Failed to process request: HTTP error ${agentResponse.status}`,
            details: responseText.substring(0, 500), // Include part of the error for debugging
          },
          { status: 500 },
        )
      }

      // Try to parse the JSON response
      let agentData
      try {
        agentData = JSON.parse(responseText)
        console.log("Agent completion successful")
      } catch (e) {
        console.error("Failed to parse agent response:", e)
        return NextResponse.json(
          {
            error: "Failed to parse response from agent API",
            details: responseText.substring(0, 500), // Include part of the response for debugging
          },
          { status: 500 },
        )
      }

      // Extract the markdown content from the response
      const markdownContent = agentData.choices[0].message.content

      // Step 5: Clean up - delete the uploaded file
      console.log("Deleting uploaded file")
      await fetch(`https://api.mistral.ai/v1/files/${fileId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${MISTRAL_API_KEY}`,
        },
      }).catch((error) => {
        // Just log the error but don't fail the request if cleanup fails
        console.error("Error deleting file:", error)
      })

      return NextResponse.json({ markdown: markdownContent })
    } catch (error) {
      console.error("Error processing request:", error)
      return NextResponse.json(
        { error: `Failed to process request: ${error instanceof Error ? error.message : String(error)}` },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error handling form data:", error)
    return NextResponse.json(
      { error: `Server error: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 },
    )
  }
}

// Add a GET handler to prevent errors on page load/refresh
export async function GET() {
  return NextResponse.json({ message: "This endpoint requires a POST request with PDF data" }, { status: 405 })
}
