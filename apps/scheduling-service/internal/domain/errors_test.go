package domain

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestDomainError_String_WithWrappedError(t *testing.T) {
	wrappedErr := errors.New("database connection failed")
	err := NewInternalError("failed to query", wrappedErr)

	result := err.Error()

	assert.Contains(t, result, "INTERNAL")
	assert.Contains(t, result, "failed to query")
	assert.Contains(t, result, "database connection failed")
}

func TestDomainError_String_WithoutWrappedError(t *testing.T) {
	err := NewValidationError("invalid input")

	result := err.Error()

	assert.Equal(t, "VALIDATION: invalid input", result)
	assert.NotContains(t, result, "(")
}

func TestErrorConstructors(t *testing.T) {
	testCases := []struct {
		name         string
		constructor  func() *DomainError
		expectedCode ErrorCode
	}{
		{
			name:         "ConflictError",
			constructor:  func() *DomainError { return NewConflictError("resource busy") },
			expectedCode: ErrCodeConflict,
		},
		{
			name:         "ValidationError",
			constructor:  func() *DomainError { return NewValidationError("invalid") },
			expectedCode: ErrCodeValidation,
		},
		{
			name:         "NotFoundError",
			constructor:  func() *DomainError { return NewNotFoundError("not found") },
			expectedCode: ErrCodeNotFound,
		},
		{
			name: "InternalError",
			constructor: func() *DomainError {
				return NewInternalError("internal", errors.New("wrapped"))
			},
			expectedCode: ErrCodeInternal,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			err := tc.constructor()

			assert.Equal(t, tc.expectedCode, err.Code)
			assert.NotEmpty(t, err.Message)
		})
	}
}

func TestErrorCode_Values(t *testing.T) {
	assert.Equal(t, ErrorCode("CONFLICT"), ErrCodeConflict)
	assert.Equal(t, ErrorCode("VALIDATION"), ErrCodeValidation)
	assert.Equal(t, ErrorCode("NOT_FOUND"), ErrCodeNotFound)
	assert.Equal(t, ErrorCode("INTERNAL"), ErrCodeInternal)
}

func TestDomainError_ImplementsError(t *testing.T) {
	var _ error = &DomainError{}

	err := NewValidationError("test")
	var genericErr error = err

	assert.NotNil(t, genericErr)
	assert.Equal(t, err.Error(), genericErr.Error())
}
