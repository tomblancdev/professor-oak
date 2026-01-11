# Quick Setup Guide

Follow these steps to activate the AI-enhanced CI/CD pipeline.

## 1. Add Required Secrets

### ANTHROPIC_API_KEY (Required for AI Code Review)

1. Get your API key from [Anthropic Console](https://console.anthropic.com/)
2. Go to repository Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `ANTHROPIC_API_KEY`
5. Value: Your API key
6. Click "Add secret"

### Alternative: Use GitHub App

Instead of an API key, you can install the Claude Code GitHub App:

```bash
# From your terminal with Claude Code
claude
> /install-github-app
```

This provides better integration and doesn't require managing API keys.

## 2. Enable GitHub Actions

1. Go to Settings → Actions → General
2. Under "Actions permissions", select "Allow all actions and reusable workflows"
3. Click "Save"

## 3. Enable GitHub Container Registry (for releases)

1. Go to Settings → Packages
2. Enable "Improved container support"

## 4. Configure Branch Protection (Recommended)

1. Go to Settings → Branches
2. Click "Add rule" for `main` branch
3. Enable:
   - ✅ Require status checks to pass before merging
   - ✅ Require pull request reviews before merging
   - ✅ Require conversation resolution before merging
4. Select these status checks:
   - Build & Test (MCP Server)
   - Lint Check
   - Build Status
   - CodeQL
5. Click "Create"

## 5. Test the Setup

### Create a Test PR

```bash
git checkout -b test/ci-pipeline
echo "# Test" >> README.md
git add README.md
git commit -m "test: verify CI/CD pipeline"
git push -u origin test/ci-pipeline

# Create PR via GitHub CLI
gh pr create --title "Test CI/CD Pipeline" --body "Testing automated workflows"
```

### What Should Happen

1. CI workflow runs (build, test, lint)
2. CodeQL security scan runs
3. Claude AI reviews the PR automatically
4. Test coverage report appears as PR comment
5. All checks should pass

### Test AI Review

Comment on the PR:
```
@claude review this PR
```

Claude should respond with a code review.

## 6. Verify Dependabot

1. Go to Insights → Dependency graph → Dependabot
2. You should see 3 ecosystems configured:
   - npm (for MCP server)
   - github-actions
   - docker
3. First PRs will appear on Monday

## 7. Create Your First Release

When ready to release:

```bash
git checkout main
git pull
git tag -a v1.0.0 -m "Initial release with AI CI/CD"
git push origin v1.0.0
```

This triggers:
- Automated changelog generation
- GitHub release creation
- Docker image build and publish to GHCR

## Troubleshooting

### AI Review Not Working

**Problem:** PR opened but no AI review appears

**Solutions:**
1. Check `ANTHROPIC_API_KEY` is set in repository secrets
2. Verify workflow has `pull_request` trigger enabled
3. Check Actions tab for workflow errors
4. Ensure you have API credits remaining

### CI Build Failing

**Problem:** "Build & Test" job fails

**Solutions:**
1. Run locally to reproduce:
   ```bash
   cd mcp/professor-oak-mcp
   npm install
   npm run build
   npm run test:run
   ```
2. Check devcontainer.json is valid
3. Verify package-lock.json is committed

### CodeQL Scan Issues

**Problem:** CodeQL workflow fails

**Solutions:**
1. Ensure repository is public (or has GitHub Advanced Security enabled)
2. Check language detection is correct (JavaScript/TypeScript)
3. Review CodeQL logs in Actions tab

### Docker Image Not Publishing

**Problem:** Release workflow completes but no Docker image

**Solutions:**
1. Verify GITHUB_TOKEN permissions:
   - Settings → Actions → General → Workflow permissions
   - Enable "Read and write permissions"
2. Check image name matches repository
3. Ensure tag follows semver format (v1.2.3)

## Next Steps

1. **Customize AI Review Prompts**: Edit `.github/workflows/pr-review.yml` to focus on project-specific patterns
2. **Add Custom CI Checks**: Extend `ci.yml` with project-specific validations
3. **Configure Notifications**: Set up Slack/Discord webhooks for build status
4. **Add Performance Benchmarks**: Create workflow to track MCP server performance over time
5. **Create Development Wiki**: Document project patterns for AI to reference

## Resources

- [Complete Documentation](.github/README.md)
- [Workflow Files](.github/workflows/)
- [MCP Best Practices](https://modelcontextprotocol.info/docs/best-practices/)
- [Claude Code Docs](https://code.claude.com/docs/en/github-actions)

---

**Questions?** Check the main [README](.github/README.md) or open an issue.
