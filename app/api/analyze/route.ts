import { type NextRequest, NextResponse } from "next/server"

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY
const SUMMARY_AGENT_ID = "ag:ab291cb7:20250507:untitled-agent:64806fa7" // Original agent for summarization
const EXPLAIN_AGENT_ID = "ag:ab291cb7:20250510:explain:9b572715" // New agent for explanation

// Maximum size for processing in a single request (in bytes) - 5MB is usually safe
const MAX_SINGLE_REQUEST_SIZE = 5 * 1024 * 1024;  // 5MB

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
      // For very large files, use a different approach to avoid timeout
      const isLargeFile = pdfFile.size > MAX_SINGLE_REQUEST_SIZE;
      
      if (isLargeFile) {
        console.log("Large file detected. Using chunked processing approach.");
        return await handleLargeDocument(pdfFile, instructions, taskType);
      } else {
        return await processSingleDocument(pdfFile, instructions, taskType);
      }
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

// Process a single document in one request
async function processSingleDocument(pdfFile: File, instructions: string, taskType: string) {
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
        details: responseText.substring(0, 1000), // Include part of the response for debugging
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
}

// Handle large documents using a progressive analysis approach
async function handleLargeDocument(pdfFile: File, instructions: string, taskType: string) {
  // Step 1: Upload the file to Mistral's files API with specific ocr and layout parameters
  const fileFormData = new FormData()
  fileFormData.append("file", pdfFile)
  fileFormData.append("purpose", "ocr")

  console.log("Uploading large file to Mistral API")
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
  console.log("Large file uploaded successfully with ID:", fileId)

  // Step 2: Get a signed URL for the file
  console.log("Getting signed URL for large file")
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
  console.log("Got signed URL for large file")

  // Step 3: Create the agent completion payload with document_url and optimized prompting
  const agentId = taskType === "summarize" ? SUMMARY_AGENT_ID : EXPLAIN_AGENT_ID
  console.log(`Using agent ID ${agentId} for large document ${taskType}`)
  
  // Use a modified system prompt to handle large documents more efficiently
  const systemPrompt = `You are an expert at analyzing large PDF documents.
Your task is to ${taskType === "summarize" ? "create a comprehensive summary" : "provide a detailed explanation"} of the content.
This is a large document that may exceed context limits, so:
1. Focus on extracting the most important information first
2. Prioritize capturing key concepts, main ideas, and critical details
3. Use a structured approach with clear sections and hierarchical organization
4. If mathematical content is present, format using LaTeX notation with $ for inline math and $$ for block math
5. Be concise while ensuring no important information is lost

Format your response in Markdown with proper headings, lists, and emphasis.
If you cannot process the entire document due to size limitations, focus on providing the most valuable content from what you can process.`

  // Modified payload with instructions for handling large documents
  const agentPayload = {
    agent_id: agentId,
    max_tokens: 4000, // Maximum allowed for the most comprehensive response
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
            text: `This is a large document that might exceed normal processing limits. Here are my instructions: ${instructions}\n\nPlease analyze this document as thoroughly as possible, focusing on the most important content if you cannot process everything. If the document contains mathematical notation, ensure it's properly formatted in LaTeX.`,
          },
          {
            type: "document_url",
            document_url: signedUrl,
          },
        ],
      },
    ],
  }

  console.log(`Sending optimized ${taskType} request for large document`)

  // Step 4: Send the request to the Mistral Agent Completion API with extended timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 75000); // 75 second timeout for large documents
  
  try {
    const agentResponse = await fetch("https://api.mistral.ai/v1/agents/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(agentPayload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Log the status code
    console.log("Large document API response status:", agentResponse.status);
    
    // Get the response text first to log it in case of an error
    const responseText = await agentResponse.text();
    console.log("Large document API response preview:", responseText.substring(0, 200));
    
    // Check if the response is OK
    if (!agentResponse.ok) {
      console.error("Large document agent completion error response:", responseText);
      
      // If the error is related to context length, try with a different approach
      if (responseText.includes("context length") || responseText.includes("token limit") || responseText.includes("too large")) {
        console.log("Context length issue detected. Attempting progressive analysis approach.");
        return await progressiveAnalysis(fileId, instructions, taskType);
      }
      
      return NextResponse.json(
        {
          error: `Failed to process large document: HTTP error ${agentResponse.status}`,
          details: responseText.substring(0, 500),
        },
        { status: 500 },
      );
    }
    
    // Try to parse the JSON response
    let agentData;
    try {
      agentData = JSON.parse(responseText);
      console.log("Large document agent completion successful");
    } catch (e) {
      console.error("Failed to parse large document agent response:", e);
      return NextResponse.json(
        {
          error: "Failed to parse response from agent API for large document",
          details: responseText.substring(0, 1000),
        },
        { status: 500 },
      );
    }
    
    // Extract the markdown content from the response
    const markdownContent = agentData.choices[0].message.content;
    
    // Step 5: Clean up - delete the uploaded file
    console.log("Deleting uploaded file");
    await fetch(`https://api.mistral.ai/v1/files/${fileId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
      },
    }).catch((error) => {
      console.error("Error deleting file:", error);
    });
    
    return NextResponse.json({ markdown: markdownContent });
  } catch (error) {
    clearTimeout(timeoutId);
    
    // If it's an AbortError (timeout), try progressive analysis
    if (error.name === 'AbortError') {
      console.log("Request timed out. Attempting progressive analysis approach.");
      return await progressiveAnalysis(fileId, instructions, taskType);
    }
    
    throw error; // Re-throw the error for the outer catch block to handle
  }
}

// Handle extremely large documents through progressive analysis
async function progressiveAnalysis(fileId: string, instructions: string, taskType: string) {
  console.log("Starting progressive analysis for very large document");
  
  try {
    // Get a signed URL for the file
    const signedUrlResponse = await fetch(`https://api.mistral.ai/v1/files/${fileId}/url`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
      },
    });
    
    if (!signedUrlResponse.ok) {
      const errorText = await signedUrlResponse.text();
      console.error("Progressive analysis: Signed URL error:", errorText);
      throw new Error(`Failed to get signed URL: ${errorText}`);
    }
    
    const signedUrlData = await signedUrlResponse.json();
    const signedUrl = signedUrlData.url;
    
    // Step 1: First pass - get initial structure/overview
    console.log("Progressive analysis: First pass - overview");
    const agentId = taskType === "summarize" ? SUMMARY_AGENT_ID : EXPLAIN_AGENT_ID;
    
    const firstPassPrompt = `You are tasked with analyzing an extremely large document that exceeds normal token limits.
This is the FIRST PASS of a multi-step analysis. For this pass:
1. Focus ONLY on identifying the document's structure, major sections, and key themes
2. DO NOT attempt detailed analysis yet
3. Create a structured outline of the document's organization
4. Note any mathematical content areas that will need special attention
5. Keep your response brief and focused on structure only

Format your response as a concise markdown outline of the document's structure.`;
    
    const firstPassPayload = {
      agent_id: agentId,
      max_tokens: 2000,
      messages: [
        {
          role: "system",
          content: firstPassPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `This is a large document that requires progressive analysis. For this FIRST PASS, please ONLY identify the document's structure, major sections, and organization. Do not perform detailed analysis yet.`,
            },
            {
              type: "document_url",
              document_url: signedUrl,
            },
          ],
        },
      ],
    };
    
    const firstPassResponse = await fetch("https://api.mistral.ai/v1/agents/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(firstPassPayload),
    });
    
    if (!firstPassResponse.ok) {
      const errorText = await firstPassResponse.text();
      console.error("Progressive analysis: First pass error:", errorText);
      throw new Error(`First pass failed: ${errorText}`);
    }
    
    const firstPassData = await firstPassResponse.json();
    const structureOutline = firstPassData.choices[0].message.content;
    
    // Step 2: Second pass - detailed analysis based on structure
    console.log("Progressive analysis: Second pass - detailed analysis");
    
    const secondPassPrompt = `You are analyzing an extremely large document progressively.
This is the SECOND PASS of the analysis. You now have an outline of the document's structure.
For this pass:
1. Using the structure outline as a guide, perform a ${taskType === "summarize" ? "comprehensive summary" : "detailed explanation"} of the document
2. Focus on extracting key information, concepts, and insights
3. If mathematical content is present, format using LaTeX notation with $ for inline math and $$ for block math
4. Follow the document's structure but prioritize essential information if token limits are reached
5. Format your response in markdown with proper headings, lists, and emphasis

Your output should be a ${taskType === "summarize" ? "well-structured summary" : "comprehensive explanation"} that captures the essential content.`;
    
    const secondPassPayload = {
      agent_id: agentId,
      max_tokens: 4000,
      messages: [
        {
          role: "system",
          content: secondPassPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Here is the structural outline of the document from our first pass:\n\n${structureOutline}\n\nNow, please provide a ${taskType === "summarize" ? "comprehensive summary" : "detailed explanation"} based on this structure, following my instructions: ${instructions}`,
            },
            {
              type: "document_url",
              document_url: signedUrl,
            },
          ],
        },
      ],
    };
    
    const secondPassResponse = await fetch("https://api.mistral.ai/v1/agents/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(secondPassPayload),
    });
    
    if (!secondPassResponse.ok) {
      const errorText = await secondPassResponse.text();
      console.error("Progressive analysis: Second pass error:", errorText);
      throw new Error(`Second pass failed: ${errorText}`);
    }
    
    const secondPassData = await secondPassResponse.json();
    const detailedContent = secondPassData.choices[0].message.content;
    
    // Clean up - delete the uploaded file
    console.log("Progressive analysis: Deleting uploaded file");
    await fetch(`https://api.mistral.ai/v1/files/${fileId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
      },
    }).catch((error) => {
      console.error("Error deleting file:", error);
    });
    
    return NextResponse.json({ markdown: detailedContent });
  } catch (error) {
    // Clean up regardless of success or failure
    console.log("Progressive analysis: Deleting uploaded file after error");
    await fetch(`https://api.mistral.ai/v1/files/${fileId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
      },
    }).catch((cleanupError) => {
      console.error("Error deleting file during error cleanup:", cleanupError);
    });
    
    throw error; // Re-throw for the outer catch block to handle
  }
}

// Add a GET handler to prevent errors on page load/refresh
export async function GET() {
  return NextResponse.json({ message: "This endpoint requires a POST request with PDF data" }, { status: 405 })
}
