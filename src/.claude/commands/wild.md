Trigger a random wild Pokemon encounter!

## Arguments
None

## Flow

1. Call `listTopics()` to get user's topics
2. Select random topic with progress
3. Call `startQuiz({ topic, type: "wild" })`
4. Call `getPersona("wild-encounter", {})`
5. Adopt wild encounter narrator style
6. Quick 3-question quiz format
7. Higher risk/reward scoring:
   - Pass: Points x 1.5
   - Fail: Points x 0.3
8. Call `submitQuizResult()`

## Display Format
```
*rustling in the tall grass*

A wild PIKACHU appeared!
Difficulty: **

Quick! Answer correctly to catch it!

Q1/3: [Question]
```

## Persona
Dramatic, exciting narrator style. See personas/wild-encounter.md
