import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/documents - List all documents
export async function GET() {
  try {
    const documents = await db.document.findMany({
      include: {
        _count: {
          select: { chunks: true }
        }
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    })

    const formatted = documents.map(doc => ({
      id: doc.id,
      fileName: doc.fileName,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      category: doc.category,
      uploadedAt: doc.uploadedAt,
      chunkCount: doc._count.chunks
    }))

    return NextResponse.json({ documents: formatted })
  } catch (error: any) {
    console.error('List error:', error)
    return NextResponse.json(
      { error: 'Failed to list documents' },
      { status: 500 }
    )
  }
}

// DELETE /api/documents/:id - Delete a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.documentChunk.deleteMany({
      where: { documentId: params.id }
    })

    await db.document.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}
