# AI Agent — Full-Stack ReAct Agent Application

A production-style AI chat application with a FastAPI backend, React frontend, and a ReAct (Reasoning + Acting) agent powered by Claude.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                    │
│  AuthPage → ChatWindow → MessageBubble → ReActDisplay   │
│  Zustand Store → useChat hook → fetch (SSE streaming)   │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP / SSE
┌────────────────────▼────────────────────────────────────┐
│                    BACKEND (FastAPI)                     │
│  Routes → Services → ReAct Agent → Anthropic Claude     │
│  JWT Auth  │  SQLAlchemy + SQLite  │  File Upload       │
└────────────────────┬────────────────────────────────────┘
                     │ Anthropic API
┌────────────────────▼────────────────────────────────────┐
│              CLAUDE (claude-sonnet-4-6)                  │
│  Tool use: calculator, web_search, read_file            │
└─────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
AI Agent/
├── backend/
│   ├── main.py                  # FastAPI entry point
│   ├── config.py                # Settings from .env
│   ├── requirements.txt         # Python dependencies
│   ├── .env.example             # Copy to .env and fill in values
│   ├── agent/
│   │   ├── react_agent.py       # Core ReAct streaming loop
│   │   └── memory.py            # Conversation memory management
│   ├── tools/
│   │   ├── base_tool.py         # Abstract base class
│   │   ├── calculator_tool.py   # Safe math evaluator
│   │   ├── search_tool.py       # Web search (mock → real API)
│   │   └── file_tool.py         # Uploaded file reader
│   ├── prompts/
│   │   └── system_prompts.py    # Agent system prompts
│   ├── memory/
│   │   └── conversation_memory.py # History trimming
│   ├── models/
│   │   ├── database.py          # SQLAlchemy models + session
│   │   └── schemas.py           # Pydantic request/response models
│   ├── services/
│   │   ├── auth_service.py      # JWT + bcrypt auth
│   │   └── chat_service.py      # Chat orchestration
│   ├── routes/
│   │   ├── auth.py              # /api/auth/*
│   │   ├── chat.py              # /api/chat/*
│   │   └── files.py             # /api/files/*
│   └── utils/
│       └── logger.py            # Loguru logging setup
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx             # React entry point
│   │   ├── App.tsx              # Root component + routing
│   │   ├── types/index.ts       # TypeScript type definitions
│   │   ├── store/
│   │   │   ├── authStore.ts     # Auth state (Zustand)
│   │   │   └── chatStore.ts     # Chat/streaming state (Zustand)
│   │   ├── services/
│   │   │   └── api.ts           # Axios + streaming fetch
│   │   ├── hooks/
│   │   │   ├── useChat.ts       # Chat send + SSE processing
│   │   │   └── useTheme.ts      # Dark/light mode toggle
│   │   └── components/
│   │       ├── layout/          # Sidebar, Header
│   │       ├── chat/            # ChatWindow, MessageBubble, InputBar, ReActDisplay
│   │       ├── auth/            # AuthPage (login + register)
│   │       └── shared/          # FileUpload
│   └── ...config files
│
└── docs/
    └── README.md                # This file
```

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- An Anthropic API key (get one at https://console.anthropic.com)

### 1. Backend Setup

```bash
cd backend

# Copy env file and fill in your values
copy .env.example .env
# Edit .env: set ANTHROPIC_API_KEY=sk-ant-your-key-here
# Edit .env: set SECRET_KEY=some-long-random-string

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate
# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the backend (auto-creates database on first run)
uvicorn main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open: http://localhost:5173

### 3. Create an Account

- Open http://localhost:5173
- Click "Sign Up" and create an account
- Start chatting!

---

## Features

| Feature | Description |
|---------|-------------|
| **ReAct Reasoning** | Click the "Reasoning" panel above any AI response to see its thought process |
| **Tool Calling** | Agent uses calculator, web search, and file reader tools automatically |
| **Streaming** | Responses stream in real-time token by token |
| **Dark/Light Mode** | Toggle with the sun/moon button in the header |
| **File Upload** | Drag and drop files in the chat input area |
| **Chat History** | All conversations saved and accessible in the sidebar |
| **Auth** | JWT-based login/register with secure password hashing |

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Login, get JWT token |
| GET | `/api/auth/me` | Get current user |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/message` | Send message (SSE stream) |
| GET | `/api/chat/conversations` | List all conversations |
| GET | `/api/chat/conversations/{id}` | Get messages in conversation |
| DELETE | `/api/chat/conversations/{id}` | Delete conversation |

### Files
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/files/upload` | Upload a file |
| GET | `/api/files/{id}` | Get file metadata |

---

## Adding New Tools

Create a file in `backend/tools/your_tool.py`:

```python
from tools.base_tool import BaseTool

class YourTool(BaseTool):
    @property
    def name(self) -> str:
        return "your_tool_name"

    @property
    def description(self) -> str:
        return "Explain when the AI should use this tool."

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "param": {"type": "string", "description": "..."}
            },
            "required": ["param"]
        }

    async def execute(self, param: str, **kwargs) -> str:
        return f"Result: {param}"
```

Then register it in `backend/tools/__init__.py`:
```python
from .your_tool import YourTool
TOOL_REGISTRY = [..., YourTool]
```

---

## Connecting a Real Search API

Edit `backend/tools/search_tool.py`, replace `_do_search()`:

```python
import httpx

async def _do_search(self, query: str, num_results: int) -> str:
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.search.brave.com/res/v1/web/search",
            headers={"X-Subscription-Token": os.getenv("BRAVE_API_KEY")},
            params={"q": query, "count": num_results}
        )
        data = response.json()
        results = []
        for r in data.get("web", {}).get("results", []):
            results.append(f"**{r['title']}**\n{r['url']}\n{r.get('description', '')}")
        return "\n\n".join(results)
```

---

## Production Deployment

### Backend (PostgreSQL)
1. Change `DATABASE_URL` in `.env` to `postgresql+asyncpg://user:pass@host/db`
2. Install: `pip install asyncpg`
3. Use gunicorn: `gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker`

### Frontend
```bash
cd frontend
npm run build
# Deploy the dist/ folder to any static host (Vercel, Netlify, S3+CloudFront)
```

---

## Future Scalability Suggestions

1. **Vector Memory** — Add `pgvector` + embeddings to retrieve relevant past conversation chunks instead of just the last N messages. Enables infinite long-term memory.

2. **Multi-Agent** — Use the Anthropic Agents SDK to orchestrate multiple specialized agents (researcher, coder, writer) that hand off tasks to each other.

3. **Redis Session Store** — Replace in-process state with Redis for horizontal scaling and real-time features across multiple backend instances.

4. **Message Queue** — Use Celery + Redis/RabbitMQ for long-running agent tasks that shouldn't block the HTTP request.

5. **Rate Limiting** — Add `slowapi` middleware to protect API endpoints from abuse.

6. **Real Search API** — Connect Brave Search, Serper, or Tavily for live web search results.

7. **Voice Input/Output** — Add browser `MediaRecorder` for voice input + Anthropic's speech capabilities for output.

8. **Custom Tool Marketplace** — Allow users to enable/disable tools per-conversation via a settings UI.

9. **Monitoring** — Add Prometheus metrics + Grafana dashboard for production observability.

10. **Testing** — Add pytest with async fixtures for backend, Vitest + React Testing Library for frontend.
