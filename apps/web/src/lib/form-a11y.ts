/**
 * Form accessibility utilities for generating consistent IDs and ARIA attributes.
 */

/**
 * Generates a unique error ID for a form field.
 * Use with aria-describedby to associate error messages with inputs.
 *
 * @param fieldName - The name of the form field (e.g., 'email', 'password')
 * @param formId - Optional form identifier for multiple forms on the same page
 * @returns A unique error ID string
 *
 * @example
 * ```tsx
 * const emailErrorId = getErrorId('email');
 * // Returns: 'email-error'
 *
 * <input aria-describedby={errors.email ? emailErrorId : undefined} />
 * <span id={emailErrorId}>{errors.email}</span>
 * ```
 */
export function getErrorId(fieldName: string, formId?: string): string {
  return formId ? `${formId}-${fieldName}-error` : `${fieldName}-error`;
}

/**
 * Generates accessibility props for a form input with error state.
 * Returns aria-invalid and aria-describedby when field has an error.
 *
 * @param fieldName - The name of the form field
 * @param hasError - Whether the field currently has an error
 * @param formId - Optional form identifier
 * @returns Object with aria-invalid and aria-describedby props
 *
 * @example
 * ```tsx
 * <input
 *   {...getInputA11yProps('email', !!errors.email)}
 *   value={email}
 *   onChange={...}
 * />
 * ```
 */
export function getInputA11yProps(
  fieldName: string,
  hasError: boolean,
  formId?: string
): {
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
} {
  if (!hasError) return {};

  return {
    'aria-invalid': true,
    'aria-describedby': getErrorId(fieldName, formId),
  };
}

/**
 * Generates props for a form error message element.
 * Includes id for aria-describedby association and role for screen readers.
 *
 * @param fieldName - The name of the form field
 * @param formId - Optional form identifier
 * @returns Object with id and role props for the error element
 *
 * @example
 * ```tsx
 * {errors.email && (
 *   <span {...getErrorProps('email')} className="text-red-600">
 *     {errors.email}
 *   </span>
 * )}
 * ```
 */
export function getErrorProps(
  fieldName: string,
  formId?: string
): {
  id: string;
  role: 'alert';
} {
  return {
    id: getErrorId(fieldName, formId),
    role: 'alert',
  };
}

/**
 * Generates aria-required attribute for required form fields.
 * Use alongside the native `required` attribute for better semantics.
 *
 * @param isRequired - Whether the field is required
 * @returns Object with aria-required prop if required
 *
 * @example
 * ```tsx
 * <input
 *   required
 *   {...getRequiredProps(true)}
 * />
 * ```
 */
export function getRequiredProps(isRequired: boolean): {
  'aria-required'?: boolean;
} {
  return isRequired ? { 'aria-required': true } : {};
}
