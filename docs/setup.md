# Setup Guide

This guide covers everything you need to get Professor Oak running on your system.

## Prerequisites

### Required

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Docker | 20.10+ | Runs MCP server and dev environment |
| Git | 2.30+ | Clone repository |

### Claude Integration (Choose One)

| Option | Description |
|--------|-------------|
| Claude CLI | Command-line interface for Claude |
| Claude Desktop | Desktop application with MCP support |

## Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/tomblancdev/professor-oak.git
cd professor-oak
```

### Step 2: Build the MCP Server Docker Image

```bash
cd src/mcp-server
docker build -t professor-oak-mcp:latest --target runtime .
```

Verify the build:
```bash
docker images | grep professor-oak-mcp
```

Expected output:
```
professor-oak-mcp   latest    abc123def456   Just now   150MB
```

### Step 3: Configure Claude

#### Option A: Claude CLI

The repository includes a pre-configured `.mcp.json` file in the `src/` directory. Run Claude from the `src/` directory:

```bash
cd /path/to/professor-oak/src
claude
```

> **Note**: The `.mcp.json` file uses `${workspaceFolder}` which is a VS Code variable. When using Claude CLI directly, you may need to copy the config and replace `${workspaceFolder}` with the absolute path to your project.

#### Option B: Claude Desktop

Add the MCP server to your Claude Desktop configuration:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "professor-oak": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-v", "/absolute/path/to/professor-oak:/data:rw",
        "professor-oak-mcp:latest"
      ]
    }
  }
}
```

**Important**: Replace `/absolute/path/to/professor-oak` with the actual path to your cloned repository.

**Windows paths**: Use forward slashes or escaped backslashes:
```json
"args": [
  "run", "--rm", "-i",
  "-v", "C:/Users/YourName/projects/professor-oak:/data:rw",
  "professor-oak-mcp:latest"
]
```

### Step 4: Verify Installation

1. Start Claude (CLI or Desktop)
2. Test the MCP connection:

```
You: /learn test-topic

Expected: Professor Oak should respond and offer to create a new topic
```

If you see an error about MCP not being available, check:
- Docker is running
- The image was built successfully
- The path in your configuration is correct

## Development Setup

For contributing or extending Professor Oak, use the devcontainer setup.

### Using VS Code Devcontainers

1. Install the "Dev Containers" VS Code extension
2. Open the project in VS Code
3. Click "Reopen in Container" when prompted

Or from command palette:
```
Dev Containers: Reopen in Container
```

This will:
- Start a development container
- Install all dependencies
- Mount the project files

### Manual Development Setup

If not using devcontainers:

```bash
cd src/mcp-server

# Install dependencies (using Docker)
docker run --rm -v $(pwd):/app -w /app node:20-alpine npm ci

# Build TypeScript
docker run --rm -v $(pwd):/app -w /app node:20-alpine npm run build

# Run tests
docker run --rm -v $(pwd):/app -w /app node:20-alpine npm run test:run
```

## Configuration Files

### .mcp.json

MCP server configuration for Claude (located in `src/.mcp.json`):

```json
{
  "mcpServers": {
    "professor-oak": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-v", "${workspaceFolder}:/data:rw",
        "professor-oak-mcp:latest"
      ]
    }
  }
}
```

> **Note**: `${workspaceFolder}` is a VS Code variable. For Claude CLI usage, replace it with the absolute path to the `src/` directory (e.g., `/home/user/professor-oak/src`).

### .claudeignore

Protected files that Claude cannot directly modify:

```
trainer.yaml
pokedex.yaml
**/progress.yaml
**/rewards.yaml
**/rewards/*.svg
**/rewards/*.png
quiz-history/
```

### trainer.yaml

Initial trainer profile (auto-created and managed by MCP on first use - you don't need to create this file manually):

```yaml
version: 1
trainer: null
started_at: null
total_points: 0
rank: "Rookie Trainer"

settings:
  wild_encounters: true
  notifications: true

achievements:
  first_pokemon: null
  first_badge: null
  first_legendary: null

point_history: []
```

### pokedex.yaml

Initial Pokedex (auto-created and managed by MCP on first use - you don't need to create this file manually):

```yaml
version: 1
trainer: null
created_at: null

pokemon: []

stats:
  total_caught: 0
  total_evolved: 0
  legendaries: 0
  by_topic: {}
```

## Verifying Your Setup

### Check MCP Tools

Ask Claude to list available tools:

```
You: What MCP tools do you have available?
```

Claude should list tools like `createTopic`, `getProgress`, `startQuiz`, etc.

### Test Topic Creation

```
You: /learn docker
```

This should:
1. Trigger Professor Oak persona
2. Ask for your level
3. Create the topic structure

Verify the structure was created:
```bash
ls -la src/docker/
```

### Test Progress Tracking

```
You: /progress
```

This should:
1. Trigger Nurse Joy persona
2. Show your overall progress (empty if new)

## Troubleshooting

### Docker Issues

**Error: "Docker is not running"**

Solution: Start Docker Desktop or the Docker daemon:
```bash
# Linux
sudo systemctl start docker

# macOS/Windows
# Open Docker Desktop application
```

**Error: "Cannot connect to the Docker daemon"**

Solution: Ensure your user is in the docker group:
```bash
sudo usermod -aG docker $USER
# Log out and back in
```

### MCP Connection Issues

**Error: "MCP server not found"**

Solutions:
1. Verify Docker image exists: `docker images | grep professor-oak`
2. Rebuild if needed: `docker build -t professor-oak-mcp:latest .`
3. Check configuration paths are absolute

**Error: "Permission denied" on /data**

Solutions:
1. Ensure the volume mount path exists
2. Check file permissions on the project directory
3. Try running Docker with explicit user mapping:
```json
"args": [
  "run", "--rm", "-i",
  "-u", "1000:1000",
  "-v", "/path/to/project:/data:rw",
  "professor-oak-mcp:latest"
]
```

### Build Errors

**TypeScript compilation errors**

```bash
cd src/mcp-server
docker run --rm -v $(pwd):/app -w /app node:20-alpine sh -c "npm ci && npx tsc --noEmit"
```

Review and fix any type errors shown.

**Missing dependencies**

```bash
docker run --rm -v $(pwd):/app -w /app node:20-alpine npm ci
```

### File Access Issues

**Error: "Cannot access trainer.yaml"**

This is expected - Claude cannot directly access protected files. The MCP server handles these files. Use commands like `/progress` instead.

## Platform-Specific Notes

### Windows

- Use Git Bash or WSL for shell commands
- Ensure Docker Desktop is set to use WSL 2 backend
- Use forward slashes in paths for Docker volume mounts

### macOS

- Docker Desktop is recommended over Docker Engine
- Allow file sharing for your project directory in Docker Desktop preferences

### Linux

- Install Docker Engine: https://docs.docker.com/engine/install/
- Add your user to the docker group to avoid sudo

## CI/CD Setup

For GitHub repository setup with CI/CD:

1. Add repository secrets:
   - `ANTHROPIC_API_KEY` - For AI code reviews

2. Enable GitHub Actions in repository settings

3. Configure branch protection (recommended):
   - Require status checks to pass
   - Require PR reviews

See `.github/SETUP.md` for detailed CI/CD configuration.

## Pre-Commit Hooks

The project includes Claude Code hooks for local development:

**Configuration**: `.claude/settings.json`
**Hook Script**: `.claude/hooks/precommit.sh`

When Claude executes a `git commit`, the hook:
1. Builds TypeScript
2. Runs type checking
3. Runs all tests

To test manually:
```bash
bash .claude/hooks/precommit.sh
```

## Next Steps

Once setup is complete:

1. **Start Learning**: Run `/learn` to begin your first topic
2. **Read the User Guide**: [user-guide.md](user-guide.md)
3. **Explore Commands**: Try `/help` or see the README

## Getting Help

- Check [Architecture Guide](architecture.md) for system design
- Review [Developer Guide](developer-guide.md) for contributing
- Open an issue on GitHub for bugs or questions
