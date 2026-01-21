package logger

import (
	"encoding/json"
	"log"
	"os"
	"time"
)

type LogLevel string

const (
	InfoLevel  LogLevel = "info"
	WarnLevel  LogLevel = "warn"
	ErrorLevel LogLevel = "error"
	DebugLevel LogLevel = "debug"
)

type LogEntry struct {
	Timestamp string                 `json:"timestamp"`
	Level     LogLevel               `json:"level"`
	Message   string                 `json:"message"`
	Context   map[string]interface{} `json:"context,omitempty"`
}

type Logger struct {
	logger *log.Logger
}

// LogEvent provides a fluent interface for building log entries
type LogEvent struct {
	logger  *Logger
	level   LogLevel
	context map[string]interface{}
	err     error
}

func New() *Logger {
	return &Logger{
		logger: log.New(os.Stdout, "", 0),
	}
}

// Get returns the default logger instance
func Get() *Logger {
	return Default
}

func (l *Logger) log(level LogLevel, message string, context map[string]interface{}) {
	entry := LogEntry{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Level:     level,
		Message:   message,
		Context:   context,
	}

	jsonBytes, err := json.Marshal(entry)
	if err != nil {
		log.Printf("Failed to marshal log entry: %v", err)
		return
	}

	l.logger.Println(string(jsonBytes))
}

// Info starts an info level log event
func (l *Logger) Info() *LogEvent {
	return &LogEvent{
		logger:  l,
		level:   InfoLevel,
		context: make(map[string]interface{}),
	}
}

// Warn starts a warn level log event
func (l *Logger) Warn() *LogEvent {
	return &LogEvent{
		logger:  l,
		level:   WarnLevel,
		context: make(map[string]interface{}),
	}
}

// Error starts an error level log event
func (l *Logger) Error() *LogEvent {
	return &LogEvent{
		logger:  l,
		level:   ErrorLevel,
		context: make(map[string]interface{}),
	}
}

// Debug starts a debug level log event
func (l *Logger) Debug() *LogEvent {
	return &LogEvent{
		logger:  l,
		level:   DebugLevel,
		context: make(map[string]interface{}),
	}
}

// Err adds an error to the log event
func (e *LogEvent) Err(err error) *LogEvent {
	e.err = err
	if err != nil {
		e.context["error"] = err.Error()
	}
	return e
}

// Str adds a string field to the log event
func (e *LogEvent) Str(key, val string) *LogEvent {
	e.context[key] = val
	return e
}

// Int adds an int field to the log event
func (e *LogEvent) Int(key string, val int) *LogEvent {
	e.context[key] = val
	return e
}

// Int32 adds an int32 field to the log event
func (e *LogEvent) Int32(key string, val int32) *LogEvent {
	e.context[key] = val
	return e
}

// Dur adds a duration field to the log event (in milliseconds)
func (e *LogEvent) Dur(key string, val time.Duration) *LogEvent {
	e.context[key] = val.Milliseconds()
	return e
}

// Msg finalizes and writes the log event
func (e *LogEvent) Msg(message string) {
	e.logger.log(e.level, message, e.context)
}

// Msgf finalizes and writes the log event with a formatted message
func (e *LogEvent) Msgf(format string, args ...interface{}) {
	e.Msg(formatMessage(format, args...))
}

func formatMessage(format string, args ...interface{}) string {
	if len(args) == 0 {
		return format
	}
	return format // Simplified - use fmt.Sprintf in production
}

var Default = New()
