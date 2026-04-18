# ============================================================================
# THIS IS FOR LOCAL DEVELOPMENT ONLY
# ============================================================================
# Requires .env file - podman-compose will automatically load it

COMPOSE_FILE=compose.dev.yaml
APP_CONTAINER=app_ui

.PHONY: setup install build run stop logs destroy clean \
        lint fmt check \
        pre-commit-install pre-commit-run semgrep socket \
        help

# ============================================================================
# First-time setup
# ============================================================================

# Full first-time setup: copies .env, installs deps, installs pre-commit hooks, builds container
setup:
	@echo "Setting up development environment..."
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "Created .env from .env.example — fill in your values. Then run make setup again. Also, make sure that the repo is a git repo. If not setup will fail."; \
		exit 1; \
	fi
	@echo "Installing local dependencies..."
	@pnpm install
	@$(MAKE) pre-commit-install
	@$(MAKE) build
	@echo ""
	@echo "Setup complete. Run 'make help' to see available commands."

# Install pre-commit hooks and warm up cache
pre-commit-install:
	@echo "Installing pre-commit hooks..."
	@pre-commit install
	@echo "Pre-warming hook cache (downloads happen once per machine)..."
	@pre-commit install --install-hooks
	@echo "Pre-commit hooks installed."

# ============================================================================
# Development
# ============================================================================

# Install local dependencies
install:
	@echo "Installing local dependencies..."
	@pnpm install

# Build container and start (first time or after container changes)
build:
	@echo "Building development container..."
	@podman-compose -f $(COMPOSE_FILE) build
	@echo "Starting container..."
	@podman-compose -f $(COMPOSE_FILE) up -d
	@echo "Build complete. Application running at http://localhost:3000"
	@echo "Use 'make logs' to view application logs."

# Start container
run:
	@echo "Starting development environment..."
	@podman-compose -f $(COMPOSE_FILE) up -d
	@echo "Development environment ready at http://localhost:3000"

# Stop container
stop:
	@echo "Stopping containers..."
	@podman-compose -f $(COMPOSE_FILE) down
	@echo "Containers stopped."

# View application logs
logs:
	@echo "Viewing application logs (Ctrl+C to exit)..."
	@podman logs -f $(APP_CONTAINER)

# Destroy all containers, volumes, and images
destroy:
	@echo "Stopping and removing containers, volumes, and images..."
	@podman-compose -f $(COMPOSE_FILE) down -v --rmi all
	@echo "Pruning dangling images..."
	@podman image prune -f
	@echo "Cleanup complete."

# Delete all temp, build, and dist folders
clean:
	@echo "Cleaning temp, build, and dist artifacts..."
	@rm -rf node_modules/ dist/ .svelte-kit/
	@rm -rf .env
	@echo "Clean complete."

# ============================================================================
# Code quality
# ============================================================================

# Run ESLint on TypeScript and Svelte files
lint:
	@pnpm exec eslint . --ext .ts,.svelte

# Format all files with Prettier
fmt:
	@pnpm exec prettier --write .

# Run svelte-check for type errors
check:
	@pnpm exec svelte-check --tsconfig ./tsconfig.json

# Run all pre-commit hooks manually against all files
pre-commit-run:
	@pre-commit run --all-files

# Run semgrep with auto config
semgrep:
	@semgrep --config=auto --error --skip-unknown-extensions .

# Run Socket.dev supply chain scan
# Requires: pnpm add -g @socket.dev/cli && socket login
# Scans all dependencies for known malicious packages and supply chain risks.
socket:
	@socket scan create .

# ============================================================================
# Help
# ============================================================================

help:
	@echo ""
	@echo "Development Commands"
	@echo "--------------------"
	@echo "  setup            First-time setup: copies .env, installs deps, installs hooks, builds container"
	@echo "  install          Install local dependencies"
	@echo "  build            Build container and start"
	@echo "  run              Start container"
	@echo "  stop             Stop container"
	@echo "  logs             View application logs"
	@echo "  destroy          Destroy all containers, volumes, and images"
	@echo "  clean            Delete all temp, build, and dist folders"
	@echo ""
	@echo "Code Quality"
	@echo "------------"
	@echo "  lint             Run ESLint on .ts and .svelte files"
	@echo "  fmt              Format all files with Prettier"
	@echo "  check            Run svelte-check for type errors"
	@echo "  pre-commit-run   Run all pre-commit hooks against all files"
	@echo "  semgrep          Run semgrep security scan"
	@echo "  socket           Run Socket.dev supply chain scan"
	@echo ""
	@echo "Typical workflow"
	@echo "----------------"
	@echo "  First time:  make setup"
	@echo "  Daily:       make run -> make logs"
	@echo "  Fresh start: make destroy -> make build"
	@echo "  Tidy up:     make clean"
	@echo ""
