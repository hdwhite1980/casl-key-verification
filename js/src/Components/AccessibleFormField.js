// src/components/common/AccessibleFormField.js
import { renderTooltip } from './Alerts.js';

/**
 * Renders an accessible form field with proper labeling and error handling
 * @param {Object} props - Form field properties
 * @returns {string} HTML for the form field
 */
export function renderAccessibleFormField({
  id,
  name,
  label,
  type = 'text',
  value = '',
  required = false,
  error = '',
  autocomplete = '',
  placeholder = '',
  tooltip = '',
  onChange = "handleInputChange",
  min,
  max,
  options = [],
  description = ''
}) {
  const fieldId = id || `field-${name}`;
  const errorId = error ? `${fieldId}-error` : '';
  const descriptionId = description ? `${fieldId}-description` : '';
  const hasError = !!error;
  
  // Build describedby value from errorId and descriptionId
  let describedby = '';
  if (errorId && descriptionId) {
    describedby = `${errorId} ${descriptionId}`;
  } else if (errorId) {
    describedby = errorId;
  } else if (descriptionId) {
    describedby = descriptionId;
  }
  
  // Common attributes for all field types
  const commonAttributes = `
    id="${fieldId}"
    name="${name}" 
    ${required ? 'required' : ''}
    aria-required="${required ? 'true' : 'false'}"
    aria-invalid="${hasError ? 'true' : 'false'}"
    ${describedby ? `aria-describedby="${describedby.trim()}"` : ''}
    data-event-change="${onChange}"
  `;
  
  // Field-specific rendering based on type
  let fieldHtml = '';
  
  if (type === 'select' && options.length > 0) {
    // Select dropdown
    fieldHtml = `
      <select ${commonAttributes}>
        ${options.map(option => `
          <option value="${option.value}" ${value === option.value ? 'selected' : ''}>
            ${option.label}
          </option>
        `).join('')}
      </select>
    `;
  } else if (type === 'textarea') {
    // Textarea
    fieldHtml = `
      <textarea 
        ${commonAttributes}
        ${placeholder ? `placeholder="${placeholder}"` : ''}
        rows="3"
      >${value}</textarea>
    `;
  } else if (type === 'checkbox') {
    // Checkbox (special case with label after input)
    return `
      <div class="checkbox-container">
        <input 
          type="checkbox" 
          ${commonAttributes}
          ${value ? 'checked' : ''}
        />
        <label for="${fieldId}" class="checkbox-label">
          ${label}${required ? '*' : ''}${tooltip}
        </label>
        ${description ? `<div id="${descriptionId}" class="field-description">${description}</div>` : ''}
        ${error ? `<p id="${errorId}" class="error" role="alert">${error}</p>` : ''}
      </div>
    `;
  } else if (type === 'radio' && options.length > 0) {
    // Radio button group
    const radioGroupHtml = options.map((option, index) => {
      const radioId = `${fieldId}-${index}`;
      return `
        <div class="radio-option">
          <input 
            type="radio" 
            id="${radioId}" 
            name="${name}" 
            value="${option.value}" 
            ${value === option.value ? 'checked' : ''}
            ${required ? 'required' : ''}
            data-event-change="${onChange}"
          />
          <label for="${radioId}">${option.label}</label>
        </div>
      `;
    }).join('');
    
    return `
      <div class="form-field radio-group">
        <div class="field-label">${label}${required ? '*' : ''}${tooltip}</div>
        ${radioGroupHtml}
        ${description ? `<div id="${descriptionId}" class="field-description">${description}</div>` : ''}
        ${error ? `<p id="${errorId}" class="error" role="alert">${error}</p>` : ''}
      </div>
    `;
  } else {
    // Standard input field
    fieldHtml = `
      <input 
        type="${type}" 
        ${commonAttributes}
        value="${value}"
        ${placeholder ? `placeholder="${placeholder}"` : ''}
        ${autocomplete ? `autocomplete="${autocomplete}"` : ''}
        ${min !== undefined ? `min="${min}"` : ''}
        ${max !== undefined ? `max="${max}"` : ''}
      />
    `;
  }
  
  // Standard form field container (except for checkboxes and radio groups)
  return `
    <div class="form-field ${hasError ? 'has-error' : ''}">
      <label for="${fieldId}">${label}${required ? '*' : ''}${tooltip}</label>
      ${fieldHtml}
      ${description ? `<div id="${descriptionId}" class="field-description">${description}</div>` : ''}
      ${error ? `<p id="${errorId}" class="error" role="alert">${error}</p>` : ''}
    </div>
  `;
}
