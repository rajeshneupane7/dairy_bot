import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// POST /api/documents/upload - Upload PDF documents
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    const uploadsDir = join(process.cwd(), 'uploads', 'documents')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    const results = []

    for (const file of files) {
      if (file.type !== 'application/pdf') {
        results.push({ fileName: file.name, error: 'Only PDF files are allowed' })
        continue
      }

      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const fileName = `${Date.now()}-${file.name}`
      const filePath = join(uploadsDir, fileName)

      await writeFile(filePath, buffer)

      // Store document in database
      const document = await db.document.create({
        data: {
          fileName: file.name,
          filePath,
          fileType: file.type,
          fileSize: file.size,
          category: 'General'
        }
      })

      // Extract text and create chunks (simplified version)
      const chunks = await extractAndChunkPDF(filePath, document.id)

      results.push({
        id: document.id,
        fileName: document.fileName,
        chunkCount: chunks
      })
    }

    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload files', details: error.message },
      { status: 500 }
    )
  }
}

// Helper function to extract text and create chunks
async function extractAndChunkPDF(filePath: string, documentId: string): Promise<number> {
  try {
    // Simple PDF text extraction using pypdf
    // Use Python to extract text from PDF
    const pythonScript = `
import sys
from pypdf import PdfReader

pdf_path = sys.argv[1]
reader = PdfReader(pdf_path)
text = ""
for page in reader.pages:
    text += page.extract_text() + "\\n"

print(text)
`

    const { stdout } = await execAsync(`python3 -c "${pythonScript.replace(/"/g, '\\"')}" "${filePath}"`)
    const text = stdout.trim()

    if (!text || text.length < 100) {
      console.log('No significant text extracted from PDF')
      return 0
    }

    // Chunk the text
    const chunks = createTextChunks(text, 1000, 200)

    // Save chunks to database
    for (let i = 0; i < chunks.length; i++) {
      await db.documentChunk.create({
        data: {
          documentId,
          chunkIndex: i,
          content: chunks[i],
          metadata: JSON.stringify({
            chunkSize: chunks[i].length,
            totalChunks: chunks.length
          })
        }
      })
    }

    // Update document processed timestamp
    await db.document.update({
      where: { id: documentId },
      data: { processedAt: new Date() }
    })

    return chunks.length
  } catch (error: any) {
    console.error('PDF extraction error:', error)
    return 0
  }
}

// Helper function to create text chunks with overlap
function createTextChunks(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    let chunk = text.slice(start, end)

    // Try to break at sentence boundaries
    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf('.')
      const lastNewline = chunk.lastIndexOf('\n')
      const breakPoint = Math.max(lastPeriod, lastNewline)

      if (breakPoint > chunkSize * 0.5) {
        chunk = chunk.slice(0, breakPoint + 1)
      }
    }

    chunks.push(chunk.trim())
    start += chunk.length - overlap

    if (start >= text.length) break
  }

  return chunks.filter(chunk => chunk.length > 50)
}
