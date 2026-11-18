// A deliberately tiny validator. It collects every problem with a request
// body at once so the user can fix the whole form in one go.

export function check(body = {}) {
  const errors = {};
  const api = {
    field(name, rules) {
      const raw = body[name];
      const value = typeof raw === 'string' ? raw.trim() : raw;

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors[name] = `${rules.label || name} is required`;
        return api;
      }
      if (value === undefined || value === '') return api;

      if (rules.type === 'string' && typeof value !== 'string') {
        errors[name] = `${rules.label || name} must be text`;
      } else if (rules.min && value.length < rules.min) {
        errors[name] = `${rules.label || name} must be at least ${rules.min} characters`;
      } else if (rules.max && value.length > rules.max) {
        errors[name] = `${rules.label || name} must be at most ${rules.max} characters`;
      } else if (rules.pattern && !rules.pattern.test(value)) {
        errors[name] = rules.patternMessage || `${rules.label || name} is invalid`;
      }
      return api;
    },
    errors: () => errors,
    ok: () => Object.keys(errors).length === 0,
  };
  return api;
}

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
