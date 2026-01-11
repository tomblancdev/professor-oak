Take a quiz to catch Pokemon and prove your knowledge.

## Arguments
- $ARGUMENTS: [topic] [course] (optional)

## Flow

1. Parse arguments to determine quiz scope
2. Call `startQuiz({ topic, course, type: "standard" })`
3. Get the appropriate Gym Leader:
   - Call `getPersona("gym-leader", { level: [from startQuiz response] })`
4. Adopt Gym Leader persona (Brock/Misty/Lt. Surge/Sabrina)
5. Display Pokemon encounter and quiz parameters
6. Generate questions based on course content
7. Use interactive questioning to administer quiz
8. Call `submitQuizResult({ sessionId, answers })`
9. Display result:
   - **PASS:** Show Pokemon catch ceremony, update Pokedex
   - **FAIL:** Transition to Nurse Joy for encouragement

## Quiz Format
```
Gym Leader: "I am [Name]! A wild [POKEMON] appeared!"

Q1/4: [Question]
A) Option 1
B) Option 2
C) Option 3
D) Option 4

[User selects answer]
```

## Personas
- Gym Leaders: See personas/gym-leaders/[name].md
- On failure: Transition to Nurse Joy
