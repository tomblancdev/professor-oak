# Professor Oak - Gamified Learning System

Catch knowledge like Pokemon! A gamified learning system powered by Claude and MCP.

## Quick Start

### Prerequisites

- Docker Desktop installed and running
- Claude Code CLI or Claude Desktop App

### Installation

**Linux/macOS:**
```bash
chmod +x install.sh
./install.sh
```

**Windows (PowerShell):**
```powershell
.\install.ps1
```

### Usage

Navigate to this folder and start Claude Code:

```bash
cd /path/to/professor-oak
claude
```

Then use the slash commands:

| Command | Description |
|---------|-------------|
| `/learn [topic]` | Start or continue learning a topic |
| `/progress` | Check your progress with Nurse Joy |
| `/quiz [topic]` | Take a quiz to catch Pokemon |
| `/pokedex` | View your caught Pokemon |
| `/wild` | Random wild encounter quiz |
| `/save [name]` | Save an extra learning discovery |
| `/extras` | List all extra learnings |
| `/reset [topic\|all]` | Reset progress |

## How It Works

1. **Start Learning** - Use `/learn docker` to begin a topic
2. **Take Courses** - Work through structured learning content
3. **Complete Exercises** - Practice what you've learned
4. **Take Quizzes** - Prove your knowledge and catch Pokemon
5. **Earn Badges** - Beat Gym Leaders to unlock new levels

## Folder Structure

```
professor-oak/
├── CLAUDE.md           # Instructions for Claude
├── .claude/            # Commands and hooks
├── .mcp.json           # MCP server configuration
├── mcp-server/         # The MCP server (Docker)
├── personas/           # Character personalities
├── topics/             # Your learning content (created automatically)
├── trainer.yaml        # Your trainer profile (created automatically)
├── pokedex.yaml        # Your caught Pokemon (created automatically)
└── quiz-history/       # Quiz records
```

## Troubleshooting

**Docker image not found:**
```bash
# Rebuild the image
cd mcp-server
docker build -t professor-oak-mcp:latest --target runtime .
```

**MCP server not connecting:**
- Ensure Docker Desktop is running
- Check that the image exists: `docker images | grep professor-oak`

## License

MIT
