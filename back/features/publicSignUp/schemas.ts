export const bodySchema = {
  type: 'object',
  properties: {
    email: { type: 'string' },
    pass: { type: 'string' },
  },
  required: ['email', 'pass'],
};
export const responseSchema = { type: 'object', properties: { ok: { type: 'boolean' } } };
