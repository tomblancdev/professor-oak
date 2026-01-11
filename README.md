# Professor Oak - Gamified Learning System

**Catch knowledge like Pokemon. Level up your skills. Become a master.**

Professor Oak is a gamified learning system that transforms your educational journey into a Pokemon adventure. Powered by Claude and the Model Context Protocol (MCP), it tracks your progress, awards points, and lets you "catch" knowledge as Pokemon.

```
                    Welcome, Trainer!

    Your journey to become a Knowledge Master begins here.

        ______________________
       |                      |
       |   PROFESSOR OAK      |
       |   Learning Lab       |
       |______________________|
              ||    ||

    "Every great trainer starts with a single step."
```

## Features

| Feature | Description |
|---------|-------------|
| **Pokemon-Themed Learning** | Catch knowledge pieces as Pokemon through quizzes |
| **Four Expertise Levels** | Progress from Starter to Expert with increasing difficulty |
| **Gym Leader Challenges** | Face Brock, Misty, Lt. Surge, and Sabrina to earn badges |
| **Points & Ranks** | Earn points and climb from Rookie to Pokemon Master |
| **Wild Encounters** | Random knowledge challenges for bonus rewards |
| **Persona System** | Professor Oak guides you, Nurse Joy tracks progress |

## Quick Start

### Prerequisites

- Docker (required)
- Claude CLI or Claude Desktop

### 1. Clone the Repository

```bash
git clone https://github.com/tomblancdev/professor-oak.git
cd professor-oak
```

### 2. Build the MCP Server

```bash
cd src/mcp-server
docker build -t professor-oak-mcp:latest --target runtime .
```

### 3. Configure Claude

The `.mcp.json` file is in the `src/` directory. Run Claude from there, or for Claude Desktop, add to your config:

```json
{
  "mcpServers": {
    "professor-oak": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-v", "/path/to/professor-oak:/data:rw",
        "professor-oak-mcp:latest"
      ]
    }
  }
}
```

### 4. Start Learning!

```bash
# Using Claude CLI
cd professor-oak/src
claude

# Then use the /learn command
> /learn docker
```

## Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/learn [topic]` | Start or continue learning a topic | `/learn docker` |
| `/progress [topic]` | Check your learning progress | `/progress` |
| `/quiz [topic]` | Take a quiz to catch Pokemon | `/quiz docker` |
| `/pokedex [topic]` | View your caught Pokemon | `/pokedex` |
| `/wild` | Trigger a random encounter | `/wild` |
| `/save [topic]` | Save ad-hoc learning | `/save` |
| `/extras [topic]` | Browse extra learnings | `/extras docker` |
| `/reset [scope]` | Reset progress | `/reset docker/starter` |

## How It Works

```
┌──────────────────────────────────────────────────────────────┐
│                     YOUR LEARNING JOURNEY                     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. CHOOSE A TOPIC         2. SELECT YOUR LEVEL             │
│     /learn docker             Starter → Expert              │
│                                                              │
│  3. STUDY COURSES          4. COMPLETE EXERCISES            │
│     Read & Learn              Practice Skills               │
│                                                              │
│  5. TAKE QUIZZES           6. CATCH POKEMON!                │
│     Prove Knowledge           Collect Knowledge             │
│                                                              │
│  7. EARN BADGES            8. LEVEL UP!                     │
│     Beat Gym Leaders          Unlock New Content            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Progression System

### Levels & Gym Leaders

| Level | Gym Leader | Badge | Description |
|-------|------------|-------|-------------|
| Starter | Brock | Boulder Badge | Absolute fundamentals |
| Beginner | Misty | Cascade Badge | Building basic skills |
| Advanced | Lt. Surge | Thunder Badge | Complex patterns |
| Expert | Sabrina | Marsh Badge | Deep mastery |

### Trainer Ranks

| Points | Rank |
|--------|------|
| 0+ | Rookie Trainer |
| 500+ | Pokemon Trainer |
| 2,000+ | Great Trainer |
| 5,000+ | Expert Trainer |
| 10,000+ | Pokemon Master |

### Points System

| Action | Points |
|--------|--------|
| Complete a course | +25 |
| Complete mandatory exercise | +30 |
| Complete optional exercise | +15 |
| Pass quiz (varies by tier) | +50 to +380 |
| Earn a badge | +500 |
| Evolve a Pokemon | +100 |

## Project Structure

```
professor-oak/
├── CLAUDE.md              # Claude instructions (root)
├── docs/                  # Documentation
└── src/                   # Main source directory
    ├── CLAUDE.md          # Persona system instructions
    ├── .mcp.json          # MCP server configuration
    ├── trainer.yaml       # Your trainer profile (auto-created)
    ├── pokedex.yaml       # Your Pokemon collection (auto-created)
    ├── mcp-server/        # MCP server source code
    └── [topic]/           # Learning content (per topic)
        ├── courses/
        ├── exercices/
        └── extras/
```

## Documentation

- [Architecture Guide](docs/architecture.md) - System design and MCP tools
- [Setup Guide](docs/setup.md) - Detailed installation instructions
- [User Guide](docs/user-guide.md) - How to use the learning system
- [Developer Guide](docs/developer-guide.md) - Contributing and extending

## Example Learning Session

```
You: /learn docker

Professor Oak: "Ah, a new region to explore! Welcome to the world of Docker,
trainer! Let me help you map out your journey.

What's your current experience level?
- Starter: Complete beginner
- Beginner: Know the basics
- Advanced: Solid foundation
- Expert: Deep experience"

You: Starter

Professor Oak: "Excellent choice! Every journey starts with a single step.
I've prepared a roadmap for you:

1. What is Docker?
2. Installing Docker
3. Your First Container

Let's begin with the fundamentals!"
```

## Personas

| Character | Role | When They Appear |
|-----------|------|------------------|
| Professor Oak | Learning mentor | `/learn`, `/save`, creating topics |
| Nurse Joy | Progress reviewer | `/progress`, after quiz failures |
| Gym Leaders | Quiz masters | `/quiz`, badge ceremonies |
| Wild Narrator | Challenge host | `/wild` encounters |

## Contributing

We welcome contributions! See the [Developer Guide](docs/developer-guide.md) for:

- How to add new topics
- Extending the MCP server
- Testing guidelines
- CI/CD pipeline

## Tech Stack

- **MCP Server**: Node.js + TypeScript
- **Data Storage**: YAML files
- **Containerization**: Docker
- **AI Integration**: Claude (Anthropic)

## License

MIT License - See LICENSE file for details.

---

**Ready to start your journey?** Run `/learn` and catch 'em all!

*"The world of knowledge is vast and full of wonders. Your Pokedex awaits!"* - Professor Oak
