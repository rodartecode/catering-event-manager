package domain

import "fmt"

type ErrorCode string

const (
	ErrCodeConflict   ErrorCode = "CONFLICT"
	ErrCodeValidation ErrorCode = "VALIDATION"
	ErrCodeNotFound   ErrorCode = "NOT_FOUND"
	ErrCodeInternal   ErrorCode = "INTERNAL"
)

type DomainError struct {
	Code    ErrorCode
	Message string
	Err     error
}

func (e *DomainError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %s (%v)", e.Code, e.Message, e.Err)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

func NewConflictError(message string) *DomainError {
	return &DomainError{
		Code:    ErrCodeConflict,
		Message: message,
	}
}

func NewValidationError(message string) *DomainError {
	return &DomainError{
		Code:    ErrCodeValidation,
		Message: message,
	}
}

func NewNotFoundError(message string) *DomainError {
	return &DomainError{
		Code:    ErrCodeNotFound,
		Message: message,
	}
}

func NewInternalError(message string, err error) *DomainError {
	return &DomainError{
		Code:    ErrCodeInternal,
		Message: message,
		Err:     err,
	}
}
