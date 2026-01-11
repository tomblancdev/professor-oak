# Game Mechanics: Points System

## Core Learning Points

| Action | Points |
|--------|--------|
| Complete a course | +25 |
| Complete exercise (optional) | +15 |
| Complete exercise (mandatory) | +30 |
| Create extra learning | +15 |
| Extra learning + quiz | +30 bonus |

---

## Quiz Points by Tier

| Tier | Base | Catch Bonus | Per Correct | Max Total |
|------|------|-------------|-------------|-----------|
| 1 Easy | 15 | +25 | +3 | ~55 |
| 2 Medium | 25 | +35 | +4 | ~80 |
| 3 Hard | 35 | +50 | +5 | ~120 |
| 4 Expert | 50 | +75 | +6 | ~180 |
| 5 Legendary | 100 | +150 | +10 | ~380 |

---

## Legendary Bonuses

| Bonus | Points | Condition |
|-------|--------|-----------|
| First legendary catch | +500 | One-time milestone |
| Legendary perfect score | +200 | 8/8 correct |
| Legendary collection (5) | +1000 | Catch 5 different legendaries |

---

## Milestone Points

| Action | Points |
|--------|--------|
| Earn a badge | +500 |
| Complete a level | +200 |
| Evolve a Pokemon | +100 |

---

## Points Calculation

```
If PASS:
  Total = Base + Catch Bonus + (correct × per-answer bonus)

If FAIL:
  Total = (Base × 0.4) + (correct × 2)
  Pokemon flees
```

**Example - Tier 3 (Charizard, 5 questions)**:
```
PASS (4/5 correct):
  35 + 50 + (4 × 5) = 105 points
  🎉 Caught Charizard!

FAIL (3/5 correct):
  (35 × 0.4) + (3 × 2) = 14 + 6 = 20 points
  💨 Charizard fled...
```

**Example - Tier 5 (Mewtwo, 8 questions)**:
```
PERFECT (8/8 correct):
  100 + 150 + (8 × 10) + 200 (perfect) = 530 points
  🎉 Caught MEWTWO! ⭐ PERFECT!

PASS (7/8 correct):
  100 + 150 + (7 × 10) = 320 points
  🎉 Caught MEWTWO!

FAIL (5/8 correct):
  (100 × 0.4) + (5 × 2) = 40 + 10 = 50 points
  💨 Mewtwo fled...
```

---

## Wild Encounter Bonus

Wild encounters have higher risk/reward:
- Pass: Base points × 1.5
- Fail: Base points × 0.3 (riskier!)

---

## Trainer Ranks

| Points | Rank |
|--------|------|
| 0 | Rookie Trainer |
| 500 | Pokemon Trainer |
| 2000 | Great Trainer |
| 5000 | Expert Trainer |
| 10000 | Pokemon Master |

---

## Storage: trainer.yaml

```yaml
trainer: Tom
started_at: 2026-01-11
total_points: 1250
rank: Pokemon Trainer

point_history:
  - date: 2026-01-11
    action: course_complete
    topic: docker
    points: +25
  - date: 2026-01-11
    action: quiz_pass
    topic: docker
    pokemon: Charmander
    points: +72
  - date: 2026-01-11
    action: badge_earned
    topic: docker
    level: starter
    badge: "Boulder Badge"
    points: +500
```
