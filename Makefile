# ============================================================================
# THIS IS FOR LOCAL DEVELOPMENT ONLY
# ============================================================================
# Requires .env file - podman-compose will automatically load it

COMPOSE_FILE=compose.dev.yaml
APP_CONTAINER=app_ui

# --- Release artefact metadata --------------------------------------------
#
# Production releases are cut by pushing a `v*` tag — .github/workflows/release.yml
# builds the static bundle, generates an SPDX-JSON SBOM with syft, computes
# SHA-256 checksums, and publishes a tarball + SLSA Level 3 provenance.
#
# `make prod-bundle` reproduces the bundle locally (without the SBOM /
# provenance steps); useful for smoke-testing the build before tagging.
# `make release-check` runs the same syft + checksum steps the CI workflow
# performs, so you can validate the full release pipeline before pushing a tag.
VERSION ?= $(shell node -p "require('./package.json').version" 2>/dev/null || echo 0.0.0)
# --------------------------------------------------------------------------

.PHONY: setup install build prod-bundle release-check run stop logs destroy clean \
        lint fmt check \
        pre-commit-install pre-commit-run semgrep socket \
        help

# `node_modules` is a real-file target so any rule that depends on it triggers
# `pnpm install` the first time (or after `make clean`) without forcing it on
# every invocation. Tracks the lockfile + package.json so dep changes refresh.
node_modules: package.json pnpm-lock.yaml
	@echo "Installing local dependencies..."
	@pnpm install
	@touch node_modules

# ============================================================================
# First-time setup
# ============================================================================

# Full first-time setup: copies .env, installs deps, installs hooks, builds container
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

# Install and warm up pre-commit hooks. The commit-msg hook is installed in
# addition to the default pre-commit hook so Conventional Commits enforcement
# kicks in on commit messages, not just staged files.
pre-commit-install:
	@echo "Installing pre-commit hooks..."
	@pre-commit install
	@pre-commit install --hook-type commit-msg
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

# Build dev container and start (first time or after container changes)
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

# Delete all temp, build, and release artefacts.
clean:
	@echo "Cleaning temp, build, and release artifacts..."
	@rm -rf node_modules/ dist/ .svelte-kit/
	@rm -rf go-tasks-ui-*/ go-tasks-ui-*.tar.gz
	@rm -f *.sbom.json checksums.txt
	@rm -rf .env
	@echo "Clean complete."

# ============================================================================
# Production bundle
# ============================================================================

# Build the static asset bundle and tar it together with the Caddyfile, so the
# tarball is drop-in deployable. This is what the GitHub Actions release
# workflow ships on a tagged release; running it locally is for smoke-testing.
prod-bundle:
	@echo "Building static bundle for v$(VERSION)..."
	@pnpm install --frozen-lockfile
	@pnpm exec svelte-check --tsconfig ./tsconfig.app.json
	@pnpm build
	@STAGE=go-tasks-ui-$(VERSION); \
	rm -rf "$$STAGE" "$$STAGE.tar.gz"; \
	mkdir -p "$$STAGE/dist"; \
	cp -R dist/. "$$STAGE/dist/"; \
	cp Caddyfile "$$STAGE/"; \
	tar -czf "$$STAGE.tar.gz" "$$STAGE"; \
	rm -rf "$$STAGE"; \
	echo ""; \
	echo "Bundle: $$STAGE.tar.gz"

# Validate the release pipeline end-to-end against a local snapshot. Mirrors
# the steps in .github/workflows/release.yml (build → tarball → SBOM →
# checksums) so you can catch issues before pushing a tag. Requires syft.
release-check:
	@command -v syft >/dev/null 2>&1 || { \
		echo "syft not found. Install: https://github.com/anchore/syft#installation"; \
		exit 1; \
	}
	@echo "==> Building release bundle..."
	@$(MAKE) prod-bundle VERSION=$(VERSION)
	@echo ""
	@echo "==> Generating SBOM..."
	@syft scan dir:. \
		--source-name "go-tasks-ui" \
		--source-version "$(VERSION)" \
		-o spdx-json=go-tasks-ui-$(VERSION).sbom.json
	@echo ""
	@echo "==> Computing checksums..."
	@sha256sum \
		go-tasks-ui-$(VERSION).tar.gz \
		go-tasks-ui-$(VERSION).sbom.json \
		> checksums.txt
	@cat checksums.txt
	@echo ""
	@echo "All release-check steps passed. Safe to push a release tag."

# ============================================================================
# Code quality
# ============================================================================

# Run ESLint on TypeScript and Svelte files
lint: node_modules
	@pnpm exec eslint . --ext .ts,.svelte

# Format all files with Prettier
fmt: node_modules
	@pnpm exec prettier --write .

# Run svelte-check for type errors
check: node_modules
	@pnpm exec svelte-check --tsconfig ./tsconfig.json

# Run all pre-commit hooks manually against all files. Depends on node_modules
# because the eslint/prettier hooks resolve plugins from the local install.
pre-commit-run: node_modules
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
	@echo "Development"
	@echo "-----------"
	@echo "  setup            First-time setup: copies .env, installs deps, installs hooks, builds container"
	@echo "  install          Install local dependencies"
	@echo "  build            Build dev container and start"
	@echo "  run              Start container"
	@echo "  stop             Stop container"
	@echo "  logs             View application logs"
	@echo "  destroy          Destroy all containers, volumes, and images"
	@echo "  clean            Delete all temp, build, and release artifacts"
	@echo ""
	@echo "Release"
	@echo "-------"
	@echo "  prod-bundle      Build the release tarball locally (static bundle + Caddyfile)"
	@echo "  release-check    Validate the release pipeline end-to-end (run before pushing a tag)"
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
