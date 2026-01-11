import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/chat/session - Create a new chat session
export async function POST() {
  try {
    const session = await db.chatSession.create({
      data: {
        title: 'New Conversation'
      }
    })

    return NextResponse.json({
      sessionId: session.id,
      title: session.title
    })
  } catch (error: any) {
    console.error('Session creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}
