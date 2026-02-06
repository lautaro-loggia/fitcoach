---
name: error-handling-patterns
description: Build resilient applications with robust error handling strategies.
---

# Error Handling Patterns

Strategies to handle failures gracefully.

## Custom Error Classes (TypeScript)
```typescript
class ApplicationError extends Error {
  constructor(public message: string, public code: string, public statusCode: number = 500) {
    super(message);
    this.name = this.constructor.name;
  }
}
```

## Result Type Pattern
```typescript
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };
```

## Best Practices
1. **Fail Fast**: Validate early.
2. **Preserve Context**: Include stack traces and metadata.
3. **Don't Swallow Errors**: Log or re-throw.
4. **Circuit Breaker**: Prevent cascading failures in external APIs.
