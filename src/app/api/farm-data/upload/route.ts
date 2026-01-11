import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// POST /api/farm-data/upload - Upload CSV/Excel files
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

    const uploadsDir = join(process.cwd(), 'uploads', 'farm-data')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    const results = []

    for (const file of files) {
      const fileType = file.type
      const isValidFile = fileType === 'text/csv' ||
                          fileType === 'application/vnd.ms-excel' ||
                          fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                          file.name.endsWith('.csv') ||
                          file.name.endsWith('.xlsx') ||
                          file.name.endsWith('.xls')

      if (!isValidFile) {
        results.push({ fileName: file.name, error: 'Only CSV and Excel files are allowed' })
        continue
      }

      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const fileName = `${Date.now()}-${file.name}`
      const filePath = join(uploadsDir, fileName)

      await writeFile(filePath, buffer)

      // Analyze the file
      const fileData = await analyzeCSVFile(filePath)

      // Store file in database
      const farmDataFile = await db.farmDataFile.create({
        data: {
          fileName: file.name,
          filePath,
          fileType: file.name.endsWith('.csv') ? 'csv' : 'excel',
          rowCount: fileData.rowCount,
          columns: JSON.stringify(fileData.columns)
        }
      })

      results.push({
        id: farmDataFile.id,
        fileName: farmDataFile.fileName,
        rowCount: farmDataFile.rowCount,
        columns: fileData.columns
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

// Helper function to analyze CSV file
async function analyzeCSVFile(filePath: string): Promise<{
  rowCount: number
  columns: string[]
}> {
  try {
    // Use Python to analyze CSV
    const pythonScript = `
import sys
import pandas as pd

file_path = sys.argv[1]
try:
    df = pd.read_csv(file_path)
    print(f"{len(df)}")
    print(f"{list(df.columns)}")
except Exception as e:
    print(f"0")
    print(f"[]")
`

    const { stdout } = await execAsync(`python3 -c "${pythonScript.replace(/"/g, '\\"')}" "${filePath}"`)
    const lines = stdout.trim().split('\n')

    const rowCount = parseInt(lines[0]) || 0
    const columnsStr = lines[1] || '[]'

    let columns: string[] = []
    try {
      columns = JSON.parse(columnsStr.replace(/'/g, '"'))
    } catch {
      columns = []
    }

    return { rowCount, columns }
  } catch (error: any) {
    console.error('CSV analysis error:', error)
    return { rowCount: 0, columns: [] }
  }
}
