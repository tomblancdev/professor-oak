#
# Professor Oak - Installation Script for Windows
# Gamified Learning System
#

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Blue
Write-Host "  Professor Oak - Installation Script   " -ForegroundColor Blue
Write-Host "=========================================" -ForegroundColor Blue
Write-Host ""

# Get the directory where this script is located
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Check prerequisites
Write-Host "[1/4] Checking prerequisites..." -ForegroundColor Yellow
Write-Host ""

# Check Docker
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Docker not found"
    }
} catch {
    Write-Host "ERROR: Docker is not installed." -ForegroundColor Red
    Write-Host "Please install Docker Desktop from https://www.docker.com/products/docker-desktop/"
    exit 1
}

try {
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker not running"
    }
} catch {
    Write-Host "ERROR: Docker is not running." -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again."
    exit 1
}

Write-Host "Docker is installed and running." -ForegroundColor Green
Write-Host ""

# Build the MCP server Docker image
Write-Host "[2/4] Building MCP server Docker image..." -ForegroundColor Yellow
Write-Host ""

Push-Location "$ScriptDir\mcp-server"
try {
    docker build -t professor-oak-mcp:latest --target runtime .
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed"
    }
} catch {
    Write-Host "ERROR: Failed to build Docker image." -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

Write-Host ""
Write-Host "Docker image built successfully!" -ForegroundColor Green
Write-Host ""

# Create data directories
Write-Host "[3/4] Creating data directories..." -ForegroundColor Yellow
Write-Host ""

New-Item -ItemType Directory -Path "$ScriptDir\topics" -Force | Out-Null
New-Item -ItemType Directory -Path "$ScriptDir\quiz-history" -Force | Out-Null

Write-Host "Data directories created." -ForegroundColor Green
Write-Host ""

# Configure Claude
Write-Host "[4/4] Configuration instructions..." -ForegroundColor Yellow
Write-Host ""

Write-Host "To use Professor Oak with Claude Code CLI:"
Write-Host ""
Write-Host "  1. Navigate to this directory in your terminal:"
Write-Host "     cd $ScriptDir"
Write-Host ""
Write-Host "  2. Start Claude Code:"
Write-Host "     claude"
Write-Host ""
Write-Host "  3. Use the slash commands:"
Write-Host "     /learn docker     - Start learning a topic"
Write-Host "     /progress         - Check your progress"
Write-Host "     /quiz docker      - Take a quiz"
Write-Host "     /pokedex          - View caught Pokemon"
Write-Host ""
Write-Host ""
Write-Host "To use with Claude Desktop App, add this to your claude_desktop_config.json:"
Write-Host ""

# Convert path to Docker-compatible format (forward slashes)
$DockerPath = $ScriptDir -replace '\\', '/'
$DockerPath = $DockerPath -replace '^([A-Za-z]):', '/$1'

Write-Host @"
{
  "mcpServers": {
    "professor-oak": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-v", "$DockerPath`:/data:rw",
        "professor-oak-mcp:latest"
      ]
    }
  }
}
"@
Write-Host ""
Write-Host "Config file location:"
Write-Host "  Windows: %APPDATA%\Claude\claude_desktop_config.json"
Write-Host ""

Write-Host "=========================================" -ForegroundColor Green
Write-Host "  Installation Complete!                 " -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your Pokemon journey awaits, trainer!"
Write-Host ""
