import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/farm-data - List all farm data files
export async function GET() {
  try {
    const files = await db.farmDataFile.findMany({
      orderBy: {
        uploadedAt: 'desc'
      }
    })

    const formatted = files.map(file => ({
      id: file.id,
      fileName: file.fileName,
      fileType: file.fileType,
      rowCount: file.rowCount,
      columns: JSON.parse(file.columns || '[]'),
      uploadedAt: file.uploadedAt
    }))

    return NextResponse.json({ files: formatted })
  } catch (error: any) {
    console.error('List error:', error)
    return NextResponse.json(
      { error: 'Failed to list farm data files' },
      { status: 500 }
    )
  }
}
