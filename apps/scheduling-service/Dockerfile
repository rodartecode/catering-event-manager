# Stage 1: Builder
FROM golang:1.24-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git ca-certificates

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build static binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /scheduler ./cmd/scheduler/main.go

# Stage 2: Runner
FROM alpine:latest AS runner

# Install runtime dependencies
RUN apk add --no-cache ca-certificates tzdata

# Create non-root user
RUN addgroup -S scheduler && adduser -S scheduler -G scheduler

WORKDIR /app

# Copy binary from builder
COPY --from=builder /scheduler /app/scheduler

# Change ownership
RUN chown -R scheduler:scheduler /app

USER scheduler

EXPOSE 8080

ENV PORT=8080

CMD ["/app/scheduler"]
