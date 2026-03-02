import { z } from 'zod';

export const createLinkSchema = z.object({
  destinationUrl: z
    .string()
    .min(1, 'Destination URL is required'),
  slug: z
    .string()
    .regex(/^[a-zA-Z0-9-]*$/, 'Only letters, numbers, and hyphens allowed')
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug must be at most 50 characters')
    .optional()
    .or(z.literal('')),
  title: z
    .string()
    .max(255, 'Title must be at most 255 characters')
    .optional()
    .or(z.literal('')),
  tags: z
    .array(z.string().max(100))
    .max(20, 'Maximum 20 tags allowed')
    .optional()
    .default([]),
  password: z
    .string()
    .min(4, 'Password must be at least 4 characters')
    .max(100, 'Password is too long')
    .optional()
    .or(z.literal('')),
  isPrivate: z.boolean().optional().default(false),
  isOneTime: z.boolean().optional().default(false),
  expiresAt: z
    .string()
    .optional()
    .or(z.literal('')),
  maxClicks: z
    .union([z.number().int().min(1, 'Must be at least 1'), z.literal(''), z.nan()])
    .optional()
    .transform((val) => (val === '' || (typeof val === 'number' && isNaN(val)) ? undefined : val)),
});

export const updateLinkSchema = z.object({
  destinationUrl: z
    .string()
    .optional()
    .or(z.literal('')),
  slug: z
    .string()
    .regex(/^[a-zA-Z0-9-]*$/, 'Only letters, numbers, and hyphens allowed')
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug must be at most 50 characters')
    .optional()
    .or(z.literal('')),
  title: z
    .string()
    .max(255, 'Title must be at most 255 characters')
    .optional()
    .or(z.literal('')),
  tags: z
    .array(z.string().max(100))
    .max(20, 'Maximum 20 tags allowed')
    .optional()
    .default([]),
  isActive: z.boolean().optional(),
  password: z
    .string()
    .min(4, 'Password must be at least 4 characters')
    .max(100, 'Password is too long')
    .optional()
    .or(z.literal('')),
  removePassword: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
  isOneTime: z.boolean().optional(),
  expiresAt: z
    .string()
    .optional()
    .or(z.literal(''))
    .nullable(),
  maxClicks: z
    .union([z.number().int().min(1, 'Must be at least 1'), z.literal(''), z.nan(), z.null()])
    .optional()
    .transform((val) => (val === '' || (typeof val === 'number' && isNaN(val)) ? undefined : val)),
});

export const quickCreateSchema = z.object({
  destinationUrl: z
    .string()
    .min(1, 'URL is required'),
});
