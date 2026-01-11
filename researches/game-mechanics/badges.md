# Game Mechanics: Badge System

## Badges = Level Completion Rewards

Badges are separate from Pokemon catching. They represent mastery of a level.

---

## Gym Leaders per Level

| Level | Gym Leader | Badge |
|-------|------------|-------|
| starter | Brock | Boulder Badge |
| beginner | Misty | Cascade Badge |
| advanced | Lt. Surge | Thunder Badge |
| expert | Sabrina | Marsh Badge |

---

## Requirements for a Badge

| Requirement | Description |
|-------------|-------------|
| All courses completed | Every course in the level |
| Mandatory exercises done | Exercises marked `mandatory: true` in roadmap |
| Level quiz passed | Final quiz for the level (not per-course) |

---

## Roadmap with Mandatory Exercises

```yaml
# progress.yaml
roadmap:
  starter:
    courses:
      - 01-what-is-docker
      - 02-installation
    exercices:
      02-installation:
        - exercice: 1
          mandatory: true    # Must complete for badge
        - exercice: 2
          mandatory: false   # Optional, but gives points
    quiz_required: true
```

---

## Badge Ceremony

When all requirements met → Gym Leader awards badge:

```
🏆 Gym Leader Brock:
"You've proven your knowledge, trainer!"

🏅 You earned the BOULDER BADGE!
   Level: Starter
   Topic: Docker

⭐ +500 points
📊 Progress: Starter 100% → Beginner unlocked!
```

---

## Badges vs Pokemon

| Reward | How to earn | Trigger |
|--------|-------------|---------|
| Badge | Complete level (courses + mandatory exercises + quiz) | Level completion |
| Pokemon | Pass quiz or wild encounter | Quiz/Wild success |

This separates:
- **Progression** (badges, levels)
- **Collection** (Pokemon, knowledge pieces)

---

## Badge Storage

```yaml
# rewards.yaml (per topic)
badges:
  - id: boulder-badge
    name: "Boulder Badge"
    level: starter
    gym_leader: Brock
    earned_at: 2026-01-11
    asset: rewards/boulder-badge.svg

  - id: cascade-badge
    name: "Cascade Badge"
    level: beginner
    gym_leader: Misty
    earned_at: 2026-01-15
    asset: rewards/cascade-badge.svg
```
