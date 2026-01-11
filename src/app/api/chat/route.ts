import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface ChatRequest {
  message: string
  sessionId: string
  documents: string[]
  csvFiles: string[]
}

// Helper function to create ZAI instance with Ollama configuration
async function createZAIInstance() {
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://ollama:11434'
  const model = process.env.OLLAMA_MODEL || 'llama3'

  console.log(`Initializing ZAI with Ollama at ${ollamaBaseUrl}, model: ${model}`)

  // Configure ZAI to use Ollama
  const zai = await ZAI.create({
    baseURL: ollamaBaseUrl,
    model: model
  })

  return zai
}

// POST /api/chat - Main chat endpoint with RAG, web search, and CSV analysis
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body: ChatRequest = await request.json()
    const { message, sessionId, documents, csvFiles } = body

    if (!message || !sessionId) {
      return NextResponse.json(
        { error: 'Message and sessionId are required' },
        { status: 400 }
      )
    }

    // Save user message
    await db.chatMessage.create({
      data: {
        sessionId,
        role: 'user',
        content: message
      }
    })

    // Multi-agent workflow
    const result = await processQuery(message, documents, csvFiles)

    // Save assistant response
    const assistantMessage = await db.chatMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: result.response,
        sources: JSON.stringify(result.sources || []),
        queryType: result.queryType,
        responseTime: (Date.now() - startTime) / 1000
      }
    })

    // Log query
    await db.queryLog.create({
      data: {
        sessionId,
        query: message,
        queryType: result.queryType,
        documents: JSON.stringify(documents),
        csvFile: csvFiles.length > 0 ? csvFiles[0] : null,
        triggeredWebSearch: result.queryType === 'web_search' || result.queryType === 'hybrid'
      }
    })

    // Update session timestamp
    await db.chatSession.update({
      where: { id: sessionId },
      data: {
        updatedAt: new Date(),
        title: message.slice(0, 50) + (message.length > 50 ? '...' : '')
      }
    })

    return NextResponse.json({
      response: result.response,
      sources: result.sources,
      queryType: result.queryType
    })
  } catch (error: any) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'Failed to process message', details: error.message },
      { status: 500 }
    )
  }
}

// Main query processing function
async function processQuery(
  query: string,
  documentIds: string[],
  csvFileIds: string[]
): Promise<{
  response: string
  sources: any[]
  queryType: string
}> {
  const zai = await createZAIInstance()

  // Step 1: Determine query type and route to appropriate agent
  const queryAnalysis = await analyzeQueryType(zai, query, documentIds, csvFileIds)

  let response = ''
  let sources: any[] = []
  let queryType = queryAnalysis.type

  switch (queryAnalysis.type) {
    case 'csv_analysis':
      // CSV/Excel file analysis
      const csvResult = await processCSVQuery(zai, query, csvFileIds)
      response = csvResult.response
      sources = csvResult.sources
      queryType = 'csv_analysis'
      break

    case 'rag':
      // RAG from documents
      const ragResult = await processRAGQuery(zai, query, documentIds)
      response = ragResult.response
      sources = ragResult.sources
      queryType = 'rag'
      break

    case 'web_search':
      // Web search
      const webResult = await processWebSearch(zai, query)
      response = webResult.response
      sources = webResult.sources
      queryType = 'web_search'
      break

    case 'hybrid':
      // Combine RAG and web search
      const hybridResult = await processHybridQuery(zai, query, documentIds)
      response = hybridResult.response
      sources = hybridResult.sources
      queryType = 'hybrid'
      break

    default:
      // Direct chat
      response = await directChat(zai, query)
      queryType = 'general'
  }

  return { response, sources, queryType }
}

// Analyze query type
async function analyzeQueryType(
  zai: any,
  query: string,
  documentIds: string[],
  csvFileIds: string[]
): Promise<{ type: string }> {
  const prompt = `Analyze this query and determine the best approach:

Query: "${query}"

Available resources:
- ${documentIds.length} PDF documents (dairy manuals, scientific papers)
- ${csvFileIds.length} CSV/Excel files (farm data)

Determine if the query needs:
1. CSV/Excel data analysis (keywords: cow, milk, production, average, data, file, csv, excel, herd, yield)
2. RAG from documents (dairy farming domain knowledge)
3. Web search (current information, latest trends)
4. Hybrid approach (both documents and web search)
5. General chat (no specific resources needed)

Respond with ONLY one word: csv_analysis, rag, web_search, hybrid, or general`

  try {
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: 'You are a query routing assistant. Respond with ONLY one word.' },
        { role: 'user', content: prompt }
      ],
      thinking: { type: 'disabled' }
    })

    const result = completion.choices[0]?.message?.content?.trim().toLowerCase() || 'general'
    return { type: result }
  } catch (error) {
    return { type: 'general' }
  }
}

// Process CSV/Excel query
async function processCSVQuery(
  zai: any,
  query: string,
  csvFileIds: string[]
): Promise<{ response: string; sources: any[] }> {
  try {
    // Get the most recent CSV file
    const farmDataFile = await db.farmDataFile.findFirst({
      where: { id: { in: csvFileIds } },
      orderBy: { uploadedAt: 'desc' }
    })

    if (!farmDataFile) {
      return {
        response: 'I don\'t have any farm data files to analyze. Please upload CSV or Excel files from your herd management software.',
        sources: []
      }
    }

    // Generate Python script to analyze the data
    const columns = JSON.parse(farmDataFile.columns || '[]')
    const pythonScript = `
import pandas as pd
import sys

file_path = "${farmDataFile.filePath}"
query = "${query}"

try:
    df = pd.read_csv(file_path)
    
    # Basic analysis based on query
    if 'average' in query.lower() or 'mean' in query.lower():
        result = df.describe()
        print(result.to_string())
    elif 'cow' in query.lower() or 'milk' in query.lower():
        if 'cow' in df.columns.str.lower().tolist():
            result = df.groupby(df.columns[df.columns.str.lower() == 'cow'][0]).agg({
                'mean', 'count'
            })
            print(result.to_string())
        else:
            print(df.head(20).to_string())
    else:
        print("Data Summary:")
        print(f"\\nTotal Records: {len(df)}")
        print(f"\\nColumns: {', '.join(df.columns.tolist())}")
        print(f"\\nFirst 10 records:")
        print(df.head(10).to_string())
        
except Exception as e:
    print(f"Error: {str(e)}")
`

    const { stdout, stderr } = await execAsync(
      `python3 -c "${pythonScript.replace(/"/g, '\\"')}"`
    )

    const analysisResult = stdout || stderr

    // Use LLM to interpret the results and provide natural language response
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: 'You are a dairy farm data analyst. Interpret the data analysis results and provide clear, actionable insights for dairy producers.'
        },
        {
          role: 'user',
          content: `User Query: ${query}\n\nData Analysis Results:\n${analysisResult}\n\nPlease explain these results in clear, practical terms for a dairy farmer.`
        }
      ],
      thinking: { type: 'disabled' }
    })

    return {
      response: completion.choices[0]?.message?.content || analysisResult,
      sources: [{ fileName: farmDataFile.fileName, type: 'CSV Analysis' }]
    }
  } catch (error: any) {
    console.error('CSV processing error:', error)
    return {
      response: `I encountered an error analyzing your farm data: ${error.message}. Please check that the file is properly formatted.`,
      sources: []
    }
  }
}

// Process RAG query
async function processRAGQuery(
  zai: any,
  query: string,
  documentIds: string[]
): Promise<{ response: string; sources: any[] }> {
  try {
    // Retrieve relevant document chunks
    const chunks = await db.documentChunk.findMany({
      where: {
        documentId: { in: documentIds }
      },
      take: 20,
      include: {
        document: true
      }
    })

    if (chunks.length === 0) {
      // Fall back to web search if no documents available
      return await processWebSearch(zai, query)
    }

    // Simple keyword-based retrieval (in production, use vector embeddings)
    const queryKeywords = query.toLowerCase().split(/\s+/)
    const scoredChunks = chunks.map(chunk => {
      const content = chunk.content.toLowerCase()
      const score = queryKeywords.reduce((acc, keyword) => {
        return acc + (content.includes(keyword) ? 1 : 0)
      }, 0)
      return { ...chunk, score }
    })

    const relevantChunks = scoredChunks
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    if (relevantChunks.length === 0) {
      // Fall back to web search if no relevant chunks found
      return await processWebSearch(zai, query)
    }

    const context = relevantChunks
      .map(chunk => chunk.content)
      .join('\n\n---\n\n')

    const sources = relevantChunks.map(chunk => ({
      fileName: chunk.document.fileName,
      type: 'Document',
      chunkIndex: chunk.chunkIndex
    }))

    // Generate response with context
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: `You are a Smart Dairy AI assistant specializing in dairy farming. Use the provided document excerpts to answer the user's question accurately. If the information is insufficient, acknowledge this limitation.`
        },
        {
          role: 'user',
          content: `Context from dairy farm manuals and scientific papers:\n\n${context}\n\nQuestion: ${query}\n\nProvide a comprehensive answer based on the context above. Cite sources when possible.`
        }
      ],
      thinking: { type: 'disabled' }
    })

    return {
      response: completion.choices[0]?.message?.content || 'I could not generate a response from the documents.',
      sources
    }
  } catch (error: any) {
    console.error('RAG processing error:', error)
    return await processWebSearch(zai, query)
  }
}

// Process web search query
async function processWebSearch(
  zai: any,
  query: string
): Promise<{ response: string; sources: any[] }> {
  try {
    // Check cache first
    const cached = await db.webSearchCache.findUnique({
      where: { query }
    })

    let searchResults: any[] = []

    if (cached && Date.now() - new Date(cached.searchedAt).getTime() < 3600000) {
      // Use cached results (less than 1 hour old)
      searchResults = JSON.parse(cached.results)
      await db.webSearchCache.update({
        where: { query },
        data: { hitCount: { increment: 1 } }
      })
    } else {
      // Perform web search
      const results = await zai.functions.invoke('web_search', {
        query: `dairy farming ${query}`,
        num: 5
      })

      searchResults = results || []

      // Cache results
      if (cached) {
        await db.webSearchCache.update({
          where: { query },
          data: {
            results: JSON.stringify(searchResults),
            searchedAt: new Date(),
            hitCount: 1
          }
        })
      } else {
        await db.webSearchCache.create({
          data: {
            query,
            results: JSON.stringify(searchResults)
          }
        })
      }
    }

    if (searchResults.length === 0) {
      return {
        response: 'I couldn\'t find any relevant information from web search. Please try rephrasing your question or upload relevant documents.',
        sources: []
      }
    }

    const context = searchResults
      .map((result: any) => `${result.name}\n${result.snippet}`)
      .join('\n\n---\n\n')

    const sources = searchResults.map((result: any) => ({
      title: result.name,
      url: result.url,
      type: 'Web Search'
    }))

    // Generate response with web search context
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: 'You are a Smart Dairy AI assistant. Use the web search results to provide accurate, up-to-date information about dairy farming.'
        },
        {
          role: 'user',
          content: `Web Search Results:\n\n${context}\n\nQuestion: ${query}\n\nProvide a comprehensive answer based on these search results.`
        }
      ],
      thinking: { type: 'disabled' }
    })

    return {
      response: completion.choices[0]?.message?.content || 'I could not generate a response from the web search results.',
      sources
    }
  } catch (error: any) {
    console.error('Web search error:', error)
    return {
      response: `I encountered an error searching the web: ${error.message}. Please try again later.`,
      sources: []
    }
  }
}

// Process hybrid query (RAG + Web Search)
async function processHybridQuery(
  zai: any,
  query: string,
  documentIds: string[]
): Promise<{ response: string; sources: any[] }> {
  try {
    // Get both document and web search results
    const ragResult = await processRAGQuery(zai, query, documentIds)
    const webResult = await processWebSearch(zai, query)

    // Combine sources
    const combinedSources = [
      ...ragResult.sources.map((s: any) => ({ ...s, priority: 'high' })),
      ...webResult.sources.map((s: any) => ({ ...s, priority: 'medium' }))
    ]

    // Generate combined response
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: 'You are a Smart Dairy AI assistant. Combine information from both uploaded documents and web search to provide comprehensive answers.'
        },
        {
          role: 'user',
          content: `Document-based Answer:\n${ragResult.response}\n\nWeb Search Answer:\n${webResult.response}\n\nOriginal Question: ${query}\n\nSynthesize these answers into a comprehensive response that draws from both sources when applicable.`
        }
      ],
      thinking: { type: 'disabled' }
    })

    return {
      response: completion.choices[0]?.message?.content || ragResult.response,
      sources: combinedSources
    }
  } catch (error: any) {
    console.error('Hybrid processing error:', error)
    return await processWebSearch(zai, query)
  }
}

// Direct chat without specific resources
async function directChat(zai: any, query: string): Promise<string> {
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'assistant',
        content: 'You are a helpful Smart Dairy AI assistant specializing in dairy farming. Provide helpful, accurate information about dairy operations, breeding, nutrition, management, and best practices.'
      },
      {
        role: 'user',
        content: query
      }
    ],
    thinking: { type: 'disabled' }
  })

  return completion.choices[0]?.message?.content || 'I could not generate a response.'
}
