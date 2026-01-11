View your Pokedex - all the Pokemon (knowledge) you've caught.

## Arguments
- $ARGUMENTS: [topic] or [pokemon-name] (optional)

## Flow

1. Call `getPokedex()`
2. If no arguments:
   - Show overall Pokedex stats
   - List all caught Pokemon grouped by topic
   - Show evolution status
3. If topic provided:
   - Filter Pokemon by topic
   - Show detailed stats for that topic
4. If Pokemon name provided:
   - Show detailed info for that Pokemon
   - Include course/quiz it was caught from
   - Show key learning points stored

## Display Format
```
Your Pokedex: 15 Pokemon caught!

Docker (5):
  #025 Pikachu - Container Basics
  #004 Charmander - Docker Networking
  ...

Python (10):
  #001 Bulbasaur - Variables & Types
  ...
```

## Persona
Use neutral/informative tone (no specific persona)
