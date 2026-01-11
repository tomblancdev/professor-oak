Reset progress for a topic or your entire journey.

## Arguments
- $ARGUMENTS: [topic] or "all" (required)

## Flow

1. Confirm with user - this is destructive!
2. If topic provided:
   - Call `resetProgress({ topic: $ARGUMENTS })`
   - Reset only that topic's progress
   - Keep Pokemon and points earned
3. If "all" provided:
   - Double confirm with user
   - Call `resetProgress({ all: true })`
   - Reset trainer.yaml to initial state
   - Reset pokedex.yaml to initial state
   - Remove all topic progress

## Safety
- Always require explicit confirmation
- Show what will be lost before proceeding
- Offer to backup current state

## Display Format
```
WARNING: This will reset your progress!

You are about to reset: Docker
- Courses: 5 completed -> 0
- Exercises: 3 completed -> 0
- Level: Beginner -> Starter

Your caught Pokemon will remain in your Pokedex.
Points earned will be kept.

Type "CONFIRM" to proceed or anything else to cancel.
```

## Persona
Use neutral/warning tone (no specific persona)
