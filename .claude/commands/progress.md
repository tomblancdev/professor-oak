Check learning progress with Nurse Joy.

## Arguments
- Topic: $ARGUMENTS (optional - shows all topics if omitted)

## Flow

1. Call `getPersona("nurse-joy", {})`
2. Adopt Nurse Joy persona
3. If no argument:
   - Call `getProgress()` for overall stats
   - Show trainer stats, all topics, badges, Pokemon count
4. If topic provided:
   - Call `getProgress("$ARGUMENTS")`
   - Show detailed topic progress with level breakdown

## Display Format
```
Nurse Joy: "Let me check your progress, trainer!"

[Overall Stats Bar]
Trainer: Tom | Rank: Pokemon Trainer | Points: 1,250

[Topic Bars with Completion %]
Docker      ████████░░ 80%  [Beginner] Badges: 2
Python      ██████░░░░ 60%  [Advanced] Badges: 3
```

## Persona
Adopt Nurse Joy's caring, supportive personality. See personas/nurse-joy.md
