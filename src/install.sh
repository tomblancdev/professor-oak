#!/bin/bash
#
# Professor Oak - Installation Script for Linux/macOS
# Gamified Learning System
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  Professor Oak - Installation Script   ${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check prerequisites
echo -e "${YELLOW}[1/4] Checking prerequisites...${NC}"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}ERROR: Docker is not installed.${NC}"
    echo "Please install Docker Desktop from https://www.docker.com/products/docker-desktop/"
    exit 1
fi

if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Docker is not running.${NC}"
    echo "Please start Docker Desktop and try again."
    exit 1
fi

echo -e "${GREEN}Docker is installed and running.${NC}"
echo ""

# Build the MCP server Docker image
echo -e "${YELLOW}[2/4] Building MCP server Docker image...${NC}"
echo ""

cd "$SCRIPT_DIR/mcp-server"
docker build -t professor-oak-mcp:latest --target runtime .

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Failed to build Docker image.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Docker image built successfully!${NC}"
echo ""

# Create data directories
echo -e "${YELLOW}[3/4] Creating data directories...${NC}"
echo ""

cd "$SCRIPT_DIR"
mkdir -p topics
mkdir -p quiz-history

echo -e "${GREEN}Data directories created.${NC}"
echo ""

# Configure Claude
echo -e "${YELLOW}[4/4] Configuration instructions...${NC}"
echo ""

echo "To use Professor Oak with Claude Code CLI:"
echo ""
echo "  1. Navigate to this directory in your terminal:"
echo "     cd $SCRIPT_DIR"
echo ""
echo "  2. Start Claude Code:"
echo "     claude"
echo ""
echo "  3. Use the slash commands:"
echo "     /learn docker     - Start learning a topic"
echo "     /progress         - Check your progress"
echo "     /quiz docker      - Take a quiz"
echo "     /pokedex          - View caught Pokemon"
echo ""
echo ""
echo "To use with Claude Desktop App, add this to your claude_desktop_config.json:"
echo ""
cat << 'EOF'
{
  "mcpServers": {
    "professor-oak": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-v", "PATH_TO_THIS_FOLDER:/data:rw",
        "professor-oak-mcp:latest"
      ]
    }
  }
}
EOF
echo ""
echo "Replace PATH_TO_THIS_FOLDER with: $SCRIPT_DIR"
echo ""

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  Installation Complete!                 ${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Your Pokemon journey awaits, trainer!"
echo ""
