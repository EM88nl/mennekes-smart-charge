# Contributing to Mennekes Smart Charge

First off, thank you for considering contributing to Mennekes Smart Charge! It's people like you that make this project better for everyone.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

**Bug Report Template:**
- **Description**: Clear and concise description of the bug
- **Steps to Reproduce**: Detailed steps to reproduce the behavior
- **Expected Behavior**: What you expected to happen
- **Actual Behavior**: What actually happened
- **Environment**:
  - Node.js version
  - Operating system
  - Charger model
  - P1 meter setup
- **Logs**: Relevant log output (from `logs/app.log`)
- **Configuration**: Sanitized `config.json` (remove sensitive info)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Use Case**: Why is this enhancement useful?
- **Proposed Solution**: How should it work?
- **Alternatives**: Other solutions you've considered
- **Additional Context**: Screenshots, diagrams, etc.

### Pull Requests

1. **Fork the Repository**
   ```bash
   git clone https://github.com/EM88nl/mennekes-smart-charge.git
   cd mennekes-smart-charge
   ```

2. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

3. **Make Your Changes**
   - Write clean, readable code
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

4. **Test Your Changes**
   ```bash
   # Run tests
   npm test

   # Run with coverage
   npm run test:coverage

   # Build the project
   npm run build

   # Test in development mode
   npm run dev
   ```

5. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

   **Commit Message Format:**
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `test:` Adding or updating tests
   - `refactor:` Code refactoring
   - `perf:` Performance improvements
   - `chore:` Build process or auxiliary tool changes

6. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request**
   - Use a clear, descriptive title
   - Reference any related issues
   - Describe your changes in detail
   - Include screenshots for UI changes

## Development Setup

### Prerequisites
- Node.js >= 18.0.0
- npm or yarn
- Git

### Setup
```bash
# Clone your fork
git clone https://github.com/EM88nl/mennekes-smart-charge.git
cd mennekes-smart-charge

# Install dependencies
npm install

# Copy and configure
cp config.json config.local.json
# Edit config.local.json with your settings

# Run tests
npm test

# Start development server
npm run dev
```

### Project Structure
```
mennekes-smart-charge/
├── src/
│   ├── api/           # REST API and WebSocket server
│   ├── charging/      # Charging logic and controllers
│   ├── modbus/        # Modbus RTU client
│   ├── mqtt/          # MQTT client for P1 data
│   ├── types.ts       # TypeScript type definitions
│   ├── logger.ts      # Logging configuration
│   └── index.ts       # Application entry point
├── frontend/          # Web interface
├── logs/              # Log files (gitignored)
├── dist/              # Build output (gitignored)
└── config.json        # Configuration file
```

## Coding Guidelines

### TypeScript Style
- Use TypeScript strict mode
- Prefer `const` over `let`
- Use meaningful variable names
- Add JSDoc comments for public APIs
- Use interfaces for object types

### Testing
- Write tests for new functionality
- Aim for >80% code coverage
- Use descriptive test names
- Group related tests with `describe` blocks

**Example:**
```typescript
describe('ChargingController', () => {
  describe('calculateSolarOnly', () => {
    it('should start charging when surplus exceeds threshold', () => {
      // Test implementation
    });
  });
});
```

### Error Handling
- Use try-catch blocks for async operations
- Log errors with context
- Provide meaningful error messages
- Don't swallow errors silently

### Logging
- Use appropriate log levels:
  - `error`: Errors that need attention
  - `warn`: Warnings that don't stop execution
  - `info`: Important events (startup, mode changes)
  - `debug`: Detailed debugging information

## Documentation

### Code Comments
- Comment complex logic
- Explain "why" not "what"
- Keep comments up-to-date

### README Updates
- Update README.md for user-facing changes
- Add examples for new features
- Update API documentation

### Type Definitions
- Export types in `types.ts`
- Document interfaces with JSDoc
- Use descriptive type names

## Testing Hardware

If you don't have a Mennekes charger, you can still contribute:

### Mocking for Development
- The test suite includes mocked components
- Use mock MQTT broker for P1 data simulation
- Use mock Modbus for charger simulation

### Documentation
- Improve documentation
- Add diagrams
- Write tutorials

### Code Review
- Review pull requests
- Test on your setup
- Provide constructive feedback

## Release Process

(For maintainers)

1. Update `CHANGELOG.md`
2. Bump version in `package.json`
3. Create git tag: `git tag v1.0.0`
4. Push tag: `git push --tags`
5. Create GitHub release

## Questions?

Don't hesitate to ask! You can:
- Open an issue with your question
- Start a discussion on GitHub Discussions
- Contact the maintainers

## Recognition

Contributors are recognized in:
- GitHub contributors page
- Release notes
- Project acknowledgments

Thank you for contributing! 🎉
