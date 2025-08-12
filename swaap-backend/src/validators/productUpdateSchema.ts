// src/validators/productUpdateSchema.ts
import * as yup from 'yup';

export const productUpdateSchema = yup.object({
  title: yup.string().min(3),
  price: yup.number().min(0),
  category: yup.string(),
  images: yup.array().of(yup.string().url()),
  type: yup.string(),
  description: yup.string(),
  location: yup.string(),
  condition: yup.string().oneOf(['new', 'used']),
});
