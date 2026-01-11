# CI/CD Pipeline Documentation

This directory contains the AI-enhanced CI/CD workflows for the Professor Oak project.

## Workflows

### 1. CI (`ci.yml`)

**Triggers:** Push to main/develop, Pull Requests

**Jobs:**
- **Build & Test**: Uses devcontainers to build and test the MCP server
- **Lint**: TypeScript type checking
- **Security Scan**: npm audit + TruffleHog secret detection

**Tech Stack:**
- DevContainers CI action for consistent build environments
- Vitest for testing
- TruffleHog for secret scanning

### 2. AI-Powered PR Review (`pr-review.yml`)

**Triggers:** PR opened/updated, Comments with @claude

**Jobs:**
- **Claude Code Review**: AI-powered code review using Anthropic's Claude
  - MCP server best practices validation
  - TypeScript quality checks
  - Security analysis
  - Testing coverage validation
  - Documentation completeness

- **Test Coverage Report**: Automated coverage reporting on PRs
- **Build Check**: Validates build artifacts

**Special Features:**
- Responds to @claude mentions in PR comments
- Context-aware reviews focused on MCP server patterns
- Constructive, actionable feedback

### 3. CodeQL Security Scan (`codeql.yml`)

**Triggers:** Push, PR, Weekly schedule (Sundays 3 AM UTC)

**Features:**
- Static analysis for security vulnerabilities
- JavaScript/TypeScript code scanning
- Extended security queries
- Automated weekly scans

### 4. Dependabot (`dependabot.yml`)

**Configuration:**
- **npm**: Weekly updates for MCP server dependencies
- **GitHub Actions**: Weekly updates for workflow actions
- **Docker**: Weekly updates for base images

**Settings:**
- Runs every Monday at 9 AM UTC
- Automatic PR creation with labels
- Conventional commit messages

### 5. Release (`release.yml`)

**Triggers:** Version tags (v*.*.*)

**Jobs:**
- **Create Release**: Automated changelog generation
- **Build Docker**: Multi-platform Docker image build and publish to GHCR

**Outputs:**
- GitHub Release with changelog
- Docker image: `ghcr.io/tomblancdev/professor-oak`
- Tags: version, major.minor, major, latest

## Setup Requirements

### Secrets

Add these secrets to your repository settings:

1. **ANTHROPIC_API_KEY** (Required for AI code review)
   - Get from: https://console.anthropic.com/
   - Permissions: API key with access to Claude Sonnet 4.5

2. **GITHUB_TOKEN** (Automatically provided)
   - Used for GitHub API interactions

### Repository Settings

1. Enable GitHub Actions:
   - Settings → Actions → General → Allow all actions

2. Enable GitHub Container Registry:
   - Settings → Packages → Enable packages

3. Branch Protection Rules (Recommended):
   ```
   Branch: main
   - Require status checks to pass before merging
     ✓ Build & Test (MCP Server)
     ✓ Lint Check
     ✓ Build Status
   - Require pull request reviews before merging
   - Require conversation resolution before merging
   ```

## Using the AI Code Review

### Automatic Review

The AI reviewer runs automatically on all PRs, analyzing:
- Code quality and TypeScript best practices
- MCP server patterns (tool descriptions, error handling, etc.)
- Security vulnerabilities
- Test coverage

### Interactive Review

Comment on any PR with:
```
@claude review this code for security issues
```

The AI will respond with targeted analysis based on your request.

### Review Focus Areas

The AI reviewer is specifically trained to check:

1. **MCP Server Patterns**
   - Tool descriptions teach AI when to use tools
   - Structured JSON responses
   - Idempotent operations
   - Proper Zod schema validation

2. **Security**
   - No hardcoded secrets
   - Input validation
   - File path sanitization
   - Environment variable usage

3. **TypeScript Quality**
   - Type safety
   - Avoiding 'any' types
   - Async/await error handling

4. **Testing**
   - Test coverage for new features
   - Edge case handling
   - Proper mocking

## Workflow Customization

### Changing AI Model

Edit `pr-review.yml`:
```yaml
model: claude-opus-4-5-20251101  # For more powerful reviews
```

### Adjusting Dependabot Frequency

Edit `dependabot.yml`:
```yaml
schedule:
  interval: "daily"  # or "monthly"
```

### Adding More CI Checks

Add steps to `ci.yml`:
```yaml
- name: Custom Check
  run: npm run custom-script
```

## CI/CD Best Practices Applied

Based on 2025 MCP and GitHub Actions best practices:

1. **Container-First Approach**: All builds use devcontainers for consistency
2. **Semantic Versioning**: Automated via release tags
3. **Security as Code**: TruffleHog, CodeQL, npm audit
4. **AI-Powered Reviews**: Claude Code for context-aware feedback
5. **Idempotent Workflows**: Can be re-run safely
6. **Observability**: Test results, coverage reports, build artifacts
7. **Automated Dependencies**: Dependabot for security patches

## Monitoring & Debugging

### View Workflow Runs
- Actions tab → Select workflow → View logs

### Debug Failed Builds
```bash
# Run locally with same devcontainer
cd mcp/professor-oak-mcp
docker compose up
```

### Test Coverage Locally
```bash
cd mcp/professor-oak-mcp
npm run test:run -- --coverage
```

## Resources

- [Claude Code GitHub Actions Docs](https://code.claude.com/docs/en/github-actions)
- [DevContainers CI](https://github.com/devcontainers/ci)
- [MCP Best Practices](https://modelcontextprotocol.info/docs/best-practices/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## Troubleshooting

### AI Review Not Running

1. Check `ANTHROPIC_API_KEY` is set
2. Verify GitHub App is installed (if using claude-code-action)
3. Check workflow permissions in repo settings

### Build Failures

1. Ensure devcontainer.json is valid
2. Check npm dependencies are locked (package-lock.json)
3. Verify Docker is available on runner

### Coverage Report Missing

1. Ensure vitest is configured with coverage
2. Check coverage directory path in workflow
3. Verify tests are actually running

---

**Need help?** Open an issue or consult the [learning materials](C:/Users/Tom/learning/claude/).
