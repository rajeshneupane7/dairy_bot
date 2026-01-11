# Smart Dairy AI - RAG & Agentic AI System

A comprehensive RAG (Retrieval-Augmented Generation) and Agentic AI application for dairy farming that works with locally installed LLMs, accepts PDF documents from dairy farm manuals and scientific papers, and includes a web agent that extracts relevant information for users. All queries are stored in SQLite for easy retrieval.

## Features

### 📄 Document Processing (RAG)
- **PDF Upload**: Upload dairy farm manuals, scientific papers, and other PDF documents
- **Text Extraction**: Automatic text extraction from PDFs using pypdf
- **Smart Chunking**: Recursive text chunking with overlapping windows (1000 tokens with 200-token overlap)
- **Semantic Search**: Keyword-based retrieval of relevant document chunks
- **Document Management**: View, organize, and delete uploaded documents

### 🌐 Web Search Integration
- **Intelligent Web Agent**: Automatically triggers web search when document knowledge is insufficient
- **Query Caching**: Caches web search results for 1 hour to reduce redundant searches
- **Source Attribution**: Always provides source URLs for web-based information
- **Quality Evaluation**: Evaluation agent assesses response quality and determines if web search is needed

### 📊 CSV/Excel Analysis
- **Farm Data Upload**: Support for CSV and Excel files from herd management software
- **Automatic Analysis**: Python script generation for data queries
- **Natural Language Queries**: Ask questions about your farm data in plain English
- **Data Insights**: Get averages, summaries, and trends from your data

### 💬 Multi-Agent Chat System
- **Query Routing**: Intelligently routes queries to appropriate agents (RAG, Web Search, CSV Analysis)
- **Hybrid Responses**: Combines information from multiple sources when needed
- **Session Management**: Maintains conversation context and history
- **Source Tracking**: Shows which sources were used for each response
- **Response Time Tracking**: Displays response time for transparency

### 🗄️ Data Storage
- **SQLite Database**: All queries, documents, and conversations stored locally
- **Query Logging**: Complete history of all queries with metadata
- **Session History**: Track conversation sessions over time
- **Analytics Ready**: Data structured for analysis and insights

## Architecture

### Multi-Agent Workflow

The system implements a sophisticated multi-agent architecture:

1. **Query Analysis Agent**: Determines the best approach for each query
   - Analyzes query keywords and available resources
   - Routes to RAG, CSV Analysis, Web Search, or Hybrid approach

2. **RAG Agent**: Handles document-based queries
   - Retrieves relevant document chunks
   - Uses keyword matching for retrieval (can be upgraded to vector embeddings)
   - Generates contextually accurate responses

3. **Web Search Agent**: Fetches current information from the web
   - Uses z-ai-web-dev-sdk for web search
   - Caches results for efficiency
   - Provides source attribution

4. **CSV Analysis Agent**: Analyzes farm data
   - Generates Python scripts for data queries
   - Uses pandas for data analysis
   - Interprets results with LLM

5. **Hybrid Agent**: Combines multiple sources
   - Merges RAG and web search results
   - Synthesizes comprehensive answers
   - Prioritizes document sources

### Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5
- **Database**: SQLite with Prisma ORM
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS 4
- **AI SDK**: z-ai-web-dev-sdk for LLM and Web Search
- **PDF Processing**: pypdf (Python)
- **Data Analysis**: pandas (Python)
- **State Management**: React hooks and local state

## Database Schema

### Models

- **User**: User accounts and profiles
- **Document**: Uploaded PDF documents
- **DocumentChunk**: Text chunks from documents (for RAG)
- **ChatSession**: Conversation sessions
- **ChatMessage**: Individual messages in conversations
- **QueryLog**: Query history and analytics
- **FarmDataFile**: CSV/Excel files for analysis
- **WebSearchCache**: Cached web search results

## API Endpoints

### Documents
- `POST /api/documents/upload` - Upload PDF documents
- `GET /api/documents` - List all documents
- `DELETE /api/documents/:id` - Delete a document

### Farm Data
- `POST /api/farm-data/upload` - Upload CSV/Excel files
- `GET /api/farm-data` - List all farm data files
- `DELETE /api/farm-data/:id` - Delete a farm data file

### Chat
- `POST /api/chat` - Send a message to the AI
- `POST /api/chat/session` - Create a new chat session

## Usage

### Getting Started

1. **Navigate to the Application**
   - Open the application in your browser
   - The chat interface will load automatically

2. **Upload Documents**
   - Click "Upload PDFs" in the Documents sidebar
   - Select dairy farm manuals, scientific papers, or other PDFs
   - Documents are automatically processed and chunked

3. **Upload Farm Data**
   - Click "Upload CSV/Excel" in the Farm Data tab
   - Select CSV or Excel files from your herd management software
   - Data is analyzed automatically

4. **Ask Questions**
   - Type your question in the input field
   - Press Enter to send
   - The AI will route your query to the appropriate agent

### Example Queries

**Document-Based Questions:**
- "What are the best practices for dairy cow nutrition?"
- "How should I handle mastitis in my herd?"
- "What is the recommended breeding interval for dairy cows?"

**Farm Data Questions:**
- "What is the average milk production per cow?"
- "Show me the top 5 cows by milk yield"
- "What's the trend in protein percentage over the last month?"

**Web Search Questions:**
- "What are the latest dairy farming technologies?"
- "What are current milk prices?"
- "What are the new regulations for dairy farms?"

### Query Types

The system automatically detects and handles different query types:

1. **RAG (Retrieval-Augmented Generation)**
   - Uses uploaded documents
   - Best for domain-specific knowledge
   - Shows document sources

2. **Web Search**
   - Fetches current information
   - Best for latest trends and prices
   - Shows web sources with URLs

3. **CSV Analysis**
   - Analyzes farm data files
   - Best for data-driven questions
   - Shows file source

4. **Hybrid**
   - Combines multiple sources
   - Provides comprehensive answers
   - Shows all sources

## Local LLM Integration

The system is designed to work with locally installed LLMs such as:

- **Llama 7B/13B/70B**: Efficient models for local deployment
- **DBRX**: 132B parameters for complex reasoning
- **Mistral/Mixtral**: High-performance open-source models
- **Falcon**: Specialized for reasoning tasks

### Configuration

To use a local LLM, configure the z-ai-web-dev-sdk settings:

```typescript
const zai = await ZAI.create({
  // Configure for local LLM endpoint
  baseURL: 'http://localhost:11434', // Example: Ollama endpoint
  model: 'llama2' // Your local model name
})
```

## Farm Data Analysis

### Supported File Formats

- **CSV**: Comma-separated values
- **XLSX**: Excel 2007+ format
- **XLS**: Legacy Excel format

### Analysis Capabilities

- **Statistical Analysis**: Averages, means, standard deviations
- **Grouping**: Group by cow ID, date, or other columns
- **Filtering**: Filter data based on conditions
- **Trends**: Identify patterns over time

### Example Farm Data Structure

```csv
cow_id,date,milk_yield,fat_percentage,protein_percentage
C001,2024-01-01,25.5,3.8,3.2
C001,2024-01-02,26.0,3.7,3.3
C002,2024-01-01,22.3,4.1,3.1
...
```

## Web Search Capabilities

### Features

- **DuckDuckGo Integration**: Privacy-focused web search
- **Result Caching**: Reduces redundant searches
- **Source Attribution**: Always shows where information came from
- **Context-Aware**: Searches with dairy farming context

### Caching Strategy

- Web search results are cached for 1 hour
- Cache hit count is tracked
- Reduces API calls and improves performance
- Results can be refreshed when needed

## RAG Implementation Details

### Text Chunking Strategy

- **Chunk Size**: 1000 tokens
- **Overlap**: 200 tokens
- **Sentence Boundary Detection**: Breaks at periods and newlines
- **Minimum Chunk Size**: 50 characters

### Retrieval Method

- **Current**: Keyword-based matching
- **Future**: Can be upgraded to vector embeddings with ChromaDB or FAISS
- **Scoring**: Chunks are scored based on keyword matches
- **Top Results**: Returns top 5 most relevant chunks

## Development

### Setup

```bash
# Install dependencies
bun install

# Push database schema
bun run db:push

# Start development server
bun run dev
```

### Project Structure

```
src/
├── app/
│   ├── page.tsx                 # Main chat interface
│   ├── api/
│   │   ├── chat/              # Chat endpoints
│   │   │   ├── route.ts       # Main chat logic
│   │   │   └── session/route.ts
│   │   ├── documents/         # Document management
│   │   │   ├── route.ts
│   │   │   ├── upload/route.ts
│   │   │   └── [id]/route.ts
│   │   └── farm-data/         # Farm data management
│   │       ├── route.ts
│   │       ├── upload/route.ts
│   │       └── [id]/route.ts
├── components/ui/             # shadcn/ui components
└── lib/
    ├── db.ts                 # Prisma client
    └── utils.ts             # Utility functions
```

### Python Dependencies

The system uses Python for:
- PDF text extraction: `pypdf`
- CSV/Excel analysis: `pandas`

Install required Python packages:

```bash
pip install pypdf pandas
```

## System Requirements

### Minimum Requirements
- **CPU**: Modern multi-core processor
- **RAM**: 8GB (16GB recommended for larger models)
- **Storage**: 10GB for documents and data
- **Python**: 3.8+
- **Node.js**: 18+

### Recommended for Local LLM
- **GPU**: NVIDIA GPU with 8GB+ VRAM (for Llama 7B)
- **RAM**: 16GB+
- **Storage**: 20GB+ (including model weights)

## Security & Privacy

### Data Privacy

- **Local Processing**: All documents and data processed locally
- **No Cloud Storage**: Files stored on your system only
- **SQLite Database**: Local database, no cloud dependency
- **Controlled Web Search**: Only searches when necessary

### Data Ownership

- **You Own Your Data**: All data remains on your system
- **No API Sharing**: Farm data never shared with third parties
- **Document Privacy**: Uploaded documents are private to your installation

## Future Enhancements

### Planned Features

1. **Vector Embeddings**: Integrate ChromaDB or FAISS for semantic search
2. **Multi-Model Support**: Support for multiple LLM backends
3. **Advanced Analytics**: Dashboard for query patterns and insights
4. **Export Capabilities**: Export conversations and data
5. **User Authentication**: Multi-user support with access control
6. **Document Categories**: Automatic categorization by dairy domain
7. **Real-Time Notifications**: Alerts based on farm data analysis
8. **Mobile App**: Native mobile application for field use

### Improvements

- Better chunk overlap strategy
- Hybrid retrieval (keyword + semantic)
- Advanced CSV analysis with time series
- Integration with IoT farm sensors
- Weather data integration
- Market price tracking

## Troubleshooting

### Common Issues

**PDF Upload Fails**
- Ensure the file is a valid PDF
- Check file permissions in uploads directory
- Verify Python and pypdf are installed

**CSV Analysis Doesn't Work**
- Ensure CSV is properly formatted
- Check column headers are present
- Verify Python and pandas are installed

**Web Search Errors**
- Check internet connection
- Verify z-ai-web-dev-sdk configuration
- Check API credentials

**Slow Response Times**
- Reduce document count for RAG
- Consider using a smaller LLM model
- Check system resources

## License

This project is part of the Z.ai Code development framework.

## Support

For issues and questions, please refer to the project documentation or contact support.

---

**Smart Dairy AI** - Empowering Dairy Producers with AI Intelligence
