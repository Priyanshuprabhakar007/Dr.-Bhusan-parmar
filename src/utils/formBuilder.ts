export interface FormFieldRule {
  label: string;
  placeholder: string;
  required: boolean;
  enabled: boolean;
}

export function getFieldConfig(
  fields: Record<string, any> | undefined,
  fieldKey: string,
  defaults: { label: string; placeholder: string; required: boolean }
): FormFieldRule {
  const custom = fields?.[fieldKey];
  return {
    label: custom?.label && custom.label.trim() ? custom.label.trim() : defaults.label,
    placeholder: custom?.placeholder !== undefined ? custom.placeholder : defaults.placeholder,
    required: custom?.required !== undefined ? Boolean(custom.required) : defaults.required,
    enabled: custom?.enabled !== undefined ? Boolean(custom.enabled) : true
  };
}

export function validateFormFields(
  values: Record<string, string>,
  fieldsConfig: Record<string, FormFieldRule>
): { valid: boolean; error?: string } {
  for (const [key, rule] of Object.entries(fieldsConfig)) {
    if (rule.enabled !== false && rule.required) {
      const val = values[key]?.trim();
      if (!val) {
        return {
          valid: false,
          error: 'Please complete all required fields.'
        };
      }
    }
  }
  if (values.email && values.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(values.email.trim())) {
      return {
        valid: false,
        error: 'Please provide a valid email address.'
      };
    }
  }
  return { valid: true };
}
