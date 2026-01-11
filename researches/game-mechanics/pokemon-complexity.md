# Game Mechanics: Pokemon Complexity & Quiz System

## Pokemon Complexity Tiers

Complexity based on Pokemon's **base stat total** (from PokéAPI) + **rarity**:

| Tier | Complexity | Base Stat Total | Pokemon Examples |
|------|------------|-----------------|------------------|
| 1 | Easy | < 300 | Pidgey, Rattata, Caterpie |
| 2 | Medium | 300-400 | Pikachu, Charmander, Bulbasaur |
| 3 | Hard | 400-500 | Charizard, Venusaur, Gyarados |
| 4 | Expert | 500-600 | Dragonite, Tyranitar, Alakazam |
| 5 | Legendary | 600+ | Mewtwo, Rayquaza, Arceus |

---

## Quiz Parameters by Tier

| Tier | Questions | Pass % | Time (optional) |
|------|-----------|--------|-----------------|
| 1 | 3 | 66% (2/3) | - |
| 2 | 4 | 75% (3/4) | - |
| 3 | 5 | 80% (4/5) | - |
| 4 | 6 | 83% (5/6) | - |
| 5 | 8 | 87% (7/8) | - |

---

## Level → Tier Mapping

Which tiers can appear at each level:

| Level | Available Tiers | Typical Pokemon |
|-------|-----------------|-----------------|
| starter | 1-2 | Pidgey, Charmander |
| beginner | 2-3 | Pikachu, Charmeleon |
| advanced | 3-4 | Charizard, Dragonite |
| expert | 4-5 | Tyranitar, Mewtwo |

---

## Pokemon Selection by Level

| Level | Pokemon Pool | Examples |
|-------|--------------|----------|
| starter | Base forms (can_evolve=true) | Charmander, Bulbasaur, Pidgey |
| beginner | 1st evolutions | Charmeleon, Ivysaur, Pidgeotto |
| advanced | 2nd/final evolutions | Charizard, Venusaur, Pidgeot |
| expert | Legendaries & Mythicals | Mewtwo, Articuno, Mew |

---

## Quiz Difficulty Based on Pokemon

- AI selects a Pokemon that could appear
- Harder Pokemon = harder quiz questions
- e.g., Pidgey = easy quiz, Charizard = complex quiz

---

## Evolution Mechanic

- Same knowledge can evolve its Pokemon
- Review quiz on "dockerfile-basics" → Charmander evolves to Charmeleon
- Deep dive course → Charmeleon evolves to Charizard

**User sees**:
```
🎉 Wild CHARMANDER appeared!
You caught CHARMANDER!

📝 Knowledge: "Docker multi-stage builds"
⭐ +100 points

💡 Tip: Review this knowledge later to evolve Charmander!
```

---

## Quiz Result Storage

```yaml
# Stored in progress.yaml
quizzes:
  - date: 2026-01-11
    topic: docker
    course: 01-first-container
    pokemon: Charmander
    tier: 2
    questions: 4
    correct: 3
    passed: false
    points_earned: 26
```
