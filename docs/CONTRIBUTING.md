# Contributing to AutoInfra Agent

First off, thank you for considering contributing to AutoInfra Agent! We welcome contributions from the community to make infrastructure automation better for everyone.

## Code of Conduct

This project adheres to the [Contributor Covenant](https://www.contributor-covenant.org/) code of conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs
1. Check if the bug has already been reported in [Issues](https://github.com/autoinfra/autoinfra-agent/issues)
2. If not, open a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Environment details (OS, Node version, Docker version)

### Suggesting Features
1. Check the [ROADMAP.md](./ROADMAP.md) first
2. Open an issue with:
   - Feature description and use case
   - How it benefits the project
   - Any implementation ideas you have

### Pull Requests

1. **Fork** the repository
2. **Create a feature branch**: `git checkout -b feature/my-feature`
3. **Make your changes**
4. **Run tests**: `npm test`
5. **Commit** with clear messages: `git commit -m "feat: add SSH remote execution"`
6. **Push** to your fork: `git push origin feature/my-feature`
7. **Open a Pull Request**

## Development Setup

```bash
# Fork and clone the repo
git clone https://github.com/YOUR-USERNAME/autoinfra-agent.git
cd autoinfra-agent

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Generate sample logs
npm run generate:logs

# Start in development mode
npm run dev
```

## Code Style

- Use ES6+ syntax
- 2 spaces for indentation
- Use `'use strict'` at the top of files
- JSDoc comments for functions and classes
- Follow existing patterns in the codebase
- Run `npm run lint` before committing

## Project Structure

```
autoinfra-agent/
├── src/              # Source code
│   ├── config/       # Configuration loading
│   ├── middleware/    # Express middleware
│   ├── routes/       # API route handlers
│   ├── services/     # Business logic services
│   ├── utils/        # Utility functions
│   ├── ws/           # WebSocket server
│   ├── app.js        # Express app setup
│   └── index.js      # Entry point
├── public/           # Dashboard frontend
├── scripts/          # CLI utilities
├── tests/            # Test files
├── docs/             # Documentation
└── examples/         # Usage examples
```

## Testing

```bash
# Run all tests
npm test

# Run with watch mode
npm run test:watch

# Generate coverage report
npm test -- --coverage
```

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation changes
- `style:` — Code style changes (formatting, etc.)
- `refactor:` — Code refactoring
- `test:` — Adding or updating tests
- `chore:` — Build process or tool changes

## Getting Help

- Open a [Discussion](https://github.com/autoinfra/autoinfra-agent/discussions)
- Join our community chat (coming soon)
- Read the [docs](./README.md)

Thank you for contributing! 🚀