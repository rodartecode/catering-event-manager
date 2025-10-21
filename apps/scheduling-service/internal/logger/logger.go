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

func New() *Logger {
	return &Logger{
		logger: log.New(os.Stdout, "", 0),
	}
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

func (l *Logger) Info(message string, context map[string]interface{}) {
	l.log(InfoLevel, message, context)
}

func (l *Logger) Warn(message string, context map[string]interface{}) {
	l.log(WarnLevel, message, context)
}

func (l *Logger) Error(message string, err error, context map[string]interface{}) {
	if context == nil {
		context = make(map[string]interface{})
	}
	if err != nil {
		context["error"] = err.Error()
	}
	l.log(ErrorLevel, message, context)
}

var Default = New()
