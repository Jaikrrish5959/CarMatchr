const { z } = require('zod');
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['buyer', 'broker']),
}).refine(data => true, { message: 'Broker account requires a contact number.', path: ['phone'] });

const result = registerSchema.safeParse({ email: 'invalid_email', password: '123', role: 'buyer' });
console.log(result.error);
