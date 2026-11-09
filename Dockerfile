# ==============================================================================
# Multi-Arch Dockerfile for ALR (Autonomous Learning Runtime)
# Supports: linux/amd64 (x86_64) and linux/arm64 (ARM64 / aarch64)
# (Raspberry Pi 4/5, AWS Graviton, Apple Silicon, Oracle Cloud Ampere A1)
# ==============================================================================

# Build Stage
FROM rust:1.80-slim-bookworm AS builder

WORKDIR /usr/src/alr

# Install essential compilation tools for native SQLite and Rust crates
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    pkg-config \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy full repository source
COPY Cargo.toml ./
COPY crates/ crates/

# Build ALR release binary
RUN cargo build --release -p alr-cli

# Runtime Stage
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy binary from builder stage
COPY --from=builder /usr/src/alr/target/release/alr /usr/local/bin/alr

# Copy static frontend assets and documentation
COPY static/ ./static/
COPY docs/ ./docs/

# Default environment configuration
ENV PORT=3000
ENV RUST_LOG=info

# Expose ports:
# 3000: Playground & JEV System 1 API (/v1/systemone)
# 3001: Sales Call Copilot
# 3800: Quantitative Trading Desk
# 4000: MCP Server (Model Context Protocol)
EXPOSE 3000 3001 3800 4000

# Healthcheck targeting the Playground / System 1 API
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# Default execution: run the Universal Playground and TypeSafe JEV System 1 API
CMD ["alr", "playground", "--port", "3000"]
