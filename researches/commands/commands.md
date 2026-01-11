# Commands

## Overview

| Command | Purpose | Persona |
|---------|---------|---------|
| `/learn` | Start/continue learning | Professor Oak |
| `/progress` | View progress | Nurse Joy |
| `/quiz` | Take quiz, catch Pokemon | Gym Leader |
| `/pokedex` | Browse caught Pokemon | - |
| `/wild` | Random encounter | Wild Pokemon |
| `/save` | Save extra learning | Professor Oak |
| `/extras` | Browse extra learnings | - |
| `/reset` | Reset progress | Professor Oak |

---

## /learn

```
/learn <topic> [subtopic]
```

**Purpose**: Create new topic or continue learning

**Behavior**:
- If topic doesn't exist → Professor Oak creates structure + asks for level
- If topic exists → Check progress.yaml, suggest next course
- Opens course in learning mode

**Examples**:
```
/learn docker
/learn aws ec2
```

---

## /progress

```
/progress [topic] [subtopic]
```

**Purpose**: Show learning progress

**Behavior**:
| Args | Shows |
|------|-------|
| none | Global stats: all topics, total %, points, badges |
| topic | Topic progress: level, completion %, courses done |
| topic subtopic | Subtopic-specific progress |

**Persona**: Nurse Joy reviews your progress

**Example output**:
```
🏥 Nurse Joy: "Let me check your progress, trainer!"

📊 Overall: 3 topics, 42 Pokemon caught, 1,250 points

Docker      ████████░░ 80%  [Beginner] 🏅 2 badges
AWS         ██░░░░░░░░ 20%  [Starter]  🏅 1 badge
└─ EC2      ████░░░░░░ 40%  [Beginner]
└─ S3       ░░░░░░░░░░ 0%   [Not started]
Python      ██████░░░░ 60%  [Advanced] 🏅 3 badges
```

---

## /quiz

```
/quiz [topic] [subtopic] [course]
```

**Purpose**: Knowledge validation via Gym Leader + catch Pokemon

**Behavior**:
| Args | Quiz scope |
|------|------------|
| none | Last learned course |
| topic | Random from current level |
| topic subtopic | Subtopic current level |
| topic subtopic course | Specific course |

**Persona**: Gym Leader based on level (Brock/Misty/Lt. Surge/Sabrina)

**Quiz Flow**:
1. Gym Leader appears with a Pokemon
2. Pokemon difficulty = quiz difficulty (AI determines)
3. Use Claude's `AskUserQuestion` for interactive questions
4. Pass → catch the Pokemon + earn points
5. Fail → no catch, Nurse Joy suggests review

**Interactive Quiz UI**:
```
┌─────────────────────────────────────────────┐
│ ⚔️  Gym Leader Brock challenges you!        │
│                                             │
│ 🔥 A wild CHARMANDER appears!               │
│ Difficulty: ★★☆☆☆                          │
│                                             │
│ Q1/3: What command runs a Docker container? │
│                                             │
│ ● docker run         (Recommended)          │
│ ○ docker start                              │
│ ○ docker execute                            │
│ ○ docker begin                              │
└─────────────────────────────────────────────┘
```

**On pass**:
- Catch the Pokemon that appeared
- Earn points (base + catch bonus)
- Progress tracked in progress.yaml

**On fail**:
- Pokemon flees
- Earn partial points (base × 0.4 multiplier)
- Nurse Joy suggests which course to review

---

## /pokedex

```
/pokedex [topic] [subtopic]
```

**Purpose**: Browse caught Pokemon / knowledge

**Behavior**:
| Args | Shows |
|------|-------|
| none | Full Pokedex: caught + undiscovered count |
| topic | Pokemon from that topic |
| topic subtopic | Pokemon from subtopic |

**Example output**:
```
📖 POKEDEX - Tom's Collection

Caught: 42 | Undiscovered: ???

🔥 Docker (12 Pokemon)
   #004 Charmander  - dockerfile-basics
   #005 Charmeleon  - multi-stage-builds
   #006 Charizard   - orchestration ⭐ EVOLVED

⚡ AWS/EC2 (5 Pokemon)
   #025 Pikachu     - ec2-instances
   #026 Raichu      - auto-scaling ⭐ EVOLVED

🌿 Python (8 Pokemon)
   #001 Bulbasaur   - list-comprehensions
   ...
```

---

## /wild

```
/wild
```

**Purpose**: Random knowledge encounter (gamification!)

**Behavior**:
1. Pick random topic from user's learning list
2. Generate surprise challenge:
   - Quick quiz (3 questions)
   - Code challenge
   - Explain a concept
3. Success → bonus points + rare Pokemon chance
4. Fail → no penalty, Nurse Joy suggests review

**Wild Encounter Bonus**:
- Pass: Base points × 1.5
- Fail: Base points × 0.3 (riskier!)

**Example**:
```
🌿 A wild CHALLENGE appeared!

Topic: Docker
Level: Beginner

❓ Quick Quiz:
"What's the difference between CMD and ENTRYPOINT?"

[ Answer correctly to catch a bonus Pokemon! ]
```

---

## /save

```
/save [topic]
```

**Purpose**: Save current conversation learning as extra knowledge

**Behavior**:
| Args | Behavior |
|------|----------|
| none | Claude asks which topic to save under |
| topic | Save directly under that topic |

**Persona**: Professor Oak helps organize knowledge

**Flow**:
```
User: "What is GraphRAG?"
Claude: *explains GraphRAG in detail*
User: /save

Claude (Professor Oak):
┌─────────────────────────────────────────┐
│ 🧑‍🔬 "Ah, excellent learning moment!     │
│ Where shall we file this knowledge?"   │
│                                         │
│ ○ langchain (exists)                   │
│ ○ neo4j (exists)                       │
│ ○ Create new topic...                  │
└─────────────────────────────────────────┘
```

**Example output**:
```
📝 Knowledge saved!

Topic: graph-rag (new!)
Entry: "What is GraphRAG"
Tags: #rag #knowledge-graph #llm

⭐ +15 points

🎮 Want a quick quiz to catch a Pokemon?
   [Yes] [No, maybe later]
```

---

## /extras

```
/extras [topic] [--tags tag1,tag2]
```

**Purpose**: Browse saved extra learnings

**Behavior**:
| Args | Shows |
|------|-------|
| none | All extras across all topics |
| topic | Extras for specific topic |
| --tags | Filter by tags |

**Example output**:
```
📚 Extra Learnings

🔥 neo4j (2 entries)
   📄 2026-01-11 - LangChain Extension  #integration
   📄 2026-01-10 - Cypher Basics        #query

⚡ graph-rag (1 entry)
   📄 2026-01-11 - What is GraphRAG     #rag #llm

🌿 docker (3 entries)
   📄 2026-01-09 - Alpine vs Debian     #images
   📄 2026-01-08 - Multi-arch builds    #advanced
   📄 2026-01-05 - Docker secrets       #security

Total: 6 extras | 45 points earned
```

---

## /reset

```
/reset [scope] [target] [--keep-points] [--keep-pokemon] [--keep-badges]
```

**Purpose**: Reset progress at various levels

**Scopes**:

| Scope | Command | Resets |
|-------|---------|--------|
| Global | `/reset all` | Everything, fresh start |
| Topic | `/reset docker` | All docker progress |
| Level | `/reset docker/beginner` | Just beginner level |
| Course | `/reset docker/beginner/01-first-container` | Single course |

**Persona**: Professor Oak (with caution)

**Behavior**:
1. Professor Oak asks for confirmation
2. Shows preview of what will be reset
3. Requires explicit "yes" to proceed
4. Reports what was reset

**Options**:
| Flag | Effect |
|------|--------|
| `--keep-points` | Don't remove earned points |
| `--keep-pokemon` | Keep caught Pokemon (default) |
| `--keep-badges` | Don't remove earned badges |

**Example flow**:
```
User: /reset docker/beginner

🧑‍🔬 Professor Oak:
"Hmm, you want to reset your Beginner progress in Docker?
 Let me check what this would affect..."

┌─────────────────────────────────────────┐
│ ⚠️  Reset Preview: docker/beginner      │
│                                         │
│ Will reset:                             │
│   📚 3 courses                          │
│   🏋️ 5 exercises                        │
│   📝 2 quiz attempts                    │
│                                         │
│ Will remove:                            │
│   ⭐ 175 points                         │
│   🏅 Cascade Badge                      │
│                                         │
│ Will keep:                              │
│   🐾 5 Pokemon (knowledge preserved)    │
│                                         │
│ Are you sure?                           │
│ [Yes, reset] [No, cancel]               │
└─────────────────────────────────────────┘

User: Yes, reset

🧑‍🔬 Professor Oak:
"Done! Your Beginner journey in Docker has been reset.
 Your Pokemon remember what they learned, but you'll
 need to prove your knowledge again to earn back
 that Cascade Badge. Misty awaits your return!"

✅ Reset complete:
   - 3 courses marked incomplete
   - 5 exercises marked incomplete
   - 175 points removed
   - Cascade Badge removed
   - 5 Pokemon kept
```

**Global reset warning**:
```
User: /reset all

🧑‍🔬 Professor Oak:
"A complete reset? That's a big decision, trainer.
 You'll lose ALL progress across ALL topics..."

⚠️  WARNING: This cannot be undone!

┌─────────────────────────────────────────┐
│ 🚨 GLOBAL RESET                         │
│                                         │
│ Will reset:                             │
│   📚 15 courses across 3 topics         │
│   🏋️ 22 exercises                       │
│   📝 8 quiz attempts                    │
│                                         │
│ Will remove:                            │
│   ⭐ 1,250 points (Rank: Rookie)        │
│   🏅 3 badges                           │
│                                         │
│ Will keep:                              │
│   🐾 42 Pokemon                         │
│                                         │
│ Type "RESET ALL" to confirm:            │
└─────────────────────────────────────────┘
```
