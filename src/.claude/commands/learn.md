Start or continue a learning journey with Professor Oak.

## Arguments
- Topic: $ARGUMENTS (required for new topics, optional to continue)

## Flow

1. **If no argument provided:**
   - Call `listTopics({ includeProgress: true })`
   - Show topics list and ask which to continue

2. **If argument provided:**
   - Call `getTopic("$ARGUMENTS")`
   - If topic doesn't exist:
     - Call `getPersona("professor-oak", {})`
     - Adopt Professor Oak persona
     - Call `createTopic("$ARGUMENTS")`
     - Ask user for level preference (starter/beginner/advanced/expert)
     - Call `initializeLevel(topic, level)`
     - Generate roadmap based on topic and level
     - Call `setRoadmap()` with generated roadmap
     - Generate first course content
   - If topic exists:
     - Call `getPersona("professor-oak", { topic: "$ARGUMENTS" })`
     - Call `getNextAction("$ARGUMENTS")`
     - Present next step with Professor Oak persona

## Persona
Adopt Professor Oak's warm, wise personality. See personas/professor-oak.md
