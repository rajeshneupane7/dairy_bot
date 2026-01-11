'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  FileText,
  Upload,
  Send,
  Loader2,
  Database,
  Globe,
  Table,
  File,
  Trash2,
  Download,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  sources?: any[]
  queryType?: string
  responseTime?: number
  timestamp: Date
}

interface Document {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  category?: string
  uploadedAt: Date
  chunkCount: number
}

interface CSVFile {
  id: string
  fileName: string
  fileType: string
  rowCount: number
  columns: string[]
  uploadedAt: Date
}

export default function SmartDairyAI() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])
  const [csvFiles, setCsvFiles] = useState<CSVFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadDocuments()
    loadCSVFiles()
    createNewSession()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const createNewSession = async () => {
    try {
      const response = await fetch('/api/chat/session', {
        method: 'POST'
      })
      const data = await response.json()
      setSessionId(data.sessionId)
    } catch (error) {
      console.error('Failed to create session:', error)
    }
  }

  const loadDocuments = async () => {
    try {
      const response = await fetch('/api/documents')
      const data = await response.json()
      setDocuments(data.documents || [])
    } catch (error) {
      console.error('Failed to load documents:', error)
    }
  }

  const loadCSVFiles = async () => {
    try {
      const response = await fetch('/api/farm-data')
      const data = await response.json()
      setCsvFiles(data.files || [])
    } catch (error) {
      console.error('Failed to load CSV files:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    const startTime = Date.now()

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId,
          documents: documents.map(d => d.id),
          csvFiles: csvFiles.map(c => c.id)
        })
      })

      const data = await response.json()
      const responseTime = (Date.now() - startTime) / 1000

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        sources: data.sources,
        queryType: data.queryType,
        responseTime,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])

      // Reload documents and CSV files in case new data was added
      await Promise.all([loadDocuments(), loadCSVFiles()])
    } catch (error: any) {
      console.error('Failed to send message:', error)
      toast.error('Failed to send message. Please try again.')

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleFileUpload = async (files: FileList | null, type: 'pdf' | 'csv') => {
    if (!files || files.length === 0) return

    setUploading(true)

    try {
      const formData = new FormData()
      for (const file of files) {
        formData.append('files', file)
      }

      const endpoint = type === 'pdf' ? '/api/documents/upload' : '/api/farm-data/upload'
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`Successfully uploaded ${files.length} file(s)`)
        if (type === 'pdf') {
          await loadDocuments()
        } else {
          await loadCSVFiles()
        }
      } else {
        toast.error(data.error || 'Upload failed')
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (csvInputRef.current) csvInputRef.current.value = ''
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Document deleted successfully')
        await loadDocuments()
      } else {
        toast.error('Failed to delete document')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete document')
    }
  }

  const handleDeleteCSVFile = async (fileId: string) => {
    try {
      const response = await fetch(`/api/farm-data/${fileId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('File deleted successfully')
        await loadCSVFiles()
      } else {
        toast.error('Failed to delete file')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete file')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getQueryTypeIcon = (type?: string) => {
    switch (type) {
      case 'rag':
        return <FileText className="h-4 w-4" />
      case 'web_search':
        return <Globe className="h-4 w-4" />
      case 'csv_analysis':
        return <Table className="h-4 w-4" />
      case 'hybrid':
        return <Database className="h-4 w-4" />
      default:
        return <Database className="h-4 w-4" />
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b px-6 py-4 bg-card">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Smart Dairy AI</h1>
              <p className="text-sm text-muted-foreground">
                RAG & Agentic AI for Dairy Farming
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="gap-2">
              <FileText className="h-3 w-3" />
              {documents.length} Documents
            </Badge>
            <Badge variant="outline" className="gap-2">
              <Table className="h-3 w-3" />
              {csvFiles.length} Data Files
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden max-w-7xl mx-auto w-full">
        {/* Sidebar - Document Management */}
        <aside className="w-80 border-r bg-card/50 flex flex-col">
          <Tabs defaultValue="documents" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2 m-4">
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="data">Farm Data</TabsTrigger>
            </TabsList>

            <TabsContent value="documents" className="flex-1 flex flex-col px-4">
              <div className="mb-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files, 'pdf')}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full"
                  variant="outline"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload PDFs
                    </>
                  )}
                </Button>
              </div>

              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-2">
                  {documents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No documents uploaded yet.<br />
                      Upload dairy farm manuals and scientific papers.
                    </div>
                  ) : (
                    documents.map((doc) => (
                      <Card key={doc.id} className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                              <p className="font-medium text-sm truncate">{doc.fileName}</p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{formatFileSize(doc.fileSize)}</span>
                              {doc.category && (
                                <>
                                  <span>•</span>
                                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                    {doc.category}
                                  </Badge>
                                </>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {doc.chunkCount} chunks
                            </div>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0"
                            onClick={() => handleDeleteDocument(doc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="data" className="flex-1 flex flex-col px-4">
              <div className="mb-4">
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files, 'csv')}
                />
                <Button
                  onClick={() => csvInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full"
                  variant="outline"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload CSV/Excel
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Upload farm management data files
                </p>
              </div>

              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-2">
                  {csvFiles.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No data files uploaded yet.<br />
                      Upload CSV/Excel files from herd management software.
                    </div>
                  ) : (
                    csvFiles.map((file) => (
                      <Card key={file.id} className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Table className="h-4 w-4 text-muted-foreground shrink-0" />
                              <p className="font-medium text-sm truncate">{file.fileName}</p>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {file.rowCount} rows • {file.columns.length} columns
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {file.columns.slice(0, 3).map((col) => (
                                <Badge key={col} variant="outline" className="text-xs px-1 py-0">
                                  {col}
                                </Badge>
                              ))}
                              {file.columns.length > 3 && (
                                <Badge variant="outline" className="text-xs px-1 py-0">
                                  +{file.columns.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0"
                            onClick={() => handleDeleteCSVFile(file.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </aside>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FileText className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h2 className="text-2xl font-semibold mb-2">
                    Welcome to Smart Dairy AI
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Upload your dairy farm manuals, scientific papers, and farm data to get started.
                    I can help answer questions using RAG, web search, and data analysis.
                  </p>
                  <div className="grid md:grid-cols-3 gap-4 text-left">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Document Q&A
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Ask questions about your uploaded dairy manuals and research papers
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Web Search
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Get up-to-date information from web when documents aren't enough
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Table className="h-4 w-4" />
                          Data Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Analyze your farm management data for insights and trends
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {message.role !== 'user' && getQueryTypeIcon(message.queryType)}
                        <span className="text-sm font-medium">
                          {message.role === 'user' ? 'You' : 'Smart Dairy AI'}
                        </span>
                        {message.responseTime && message.role !== 'user' && (
                          <Badge variant="outline" className="text-xs">
                            {message.responseTime.toFixed(1)}s
                          </Badge>
                        )}
                      </div>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <p className="text-xs font-medium mb-2">Sources:</p>
                          <div className="flex flex-wrap gap-1">
                            {message.sources.map((source: any, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {source.title || source.fileName || `Source ${idx + 1}`}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t p-4 bg-card">
            <div className="max-w-3xl mx-auto flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about dairy farming, breeding, nutrition, or upload your data..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !input.trim()}
                size="icon"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
