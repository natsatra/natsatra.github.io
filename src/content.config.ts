import { glob } from 'astro/loaders';
import { defineCollection, z, type ImageFunction } from 'astro:content';

const imageSchema = (image: ImageFunction) =>
    z.object({
        src: image(),
        alt: z.string().optional()
    });

const seoSchema = (image: ImageFunction) =>
    z.object({
        title: z.string().min(5).max(120).optional(),
        description: z.string().min(15).max(160).optional(),
        image: imageSchema(image).optional(),
        pageType: z.enum(['website', 'article']).default('website')
    });

const blog = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
    schema: ({ image }) =>
        z.object({
            title: z.string(),
            excerpt: z.string().optional(),
            publishDate: z.coerce.date(),
            updatedDate: z.coerce.date().optional(),
            isFeatured: z.boolean().default(false),
            tags: z.array(z.string()).default([]),
            seo: seoSchema(image).optional()
        })
});

const pages = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/pages' }),
    schema: ({ image }) =>
        z.object({
            title: z.string(),
            seo: seoSchema(image).optional()
        })
});

const projects = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
    schema: ({ image }) =>
        z.object({
            title: z.string(),
            description: z.string().optional(),
            publishDate: z.coerce.date(),
            isFeatured: z.boolean().default(false),
            type: z.enum(['project', 'video']).default('project'),
            repoUrl: z.string().url().optional(),
            videoUrl: z.string().url().optional(),
            tags: z.array(z.string()).default([]),
            seo: seoSchema(image).optional()
        })
});
const videos = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/videos' }),
    schema: ({ image }) =>
        z.object({
            title: z.string(),
            description: z.string().optional(),
            isFeatured: z.boolean().default(false),
            tags: z.array(z.string()).default([]),
            seo: seoSchema(image).optional()
        })
});

const writing = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/writing' }),
    schema: ({ image }) =>
        z.object({
            title: z.string(),
            category: z.string(),
            excerpt: z.string().optional(),
            isFeatured: z.boolean().default(false),
            tags: z.array(z.string()).default([]),
            seo: seoSchema(image).optional()
        })
});

const certifications = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/certifications' }),
    schema: ({ image }) =>
        z.object({
            title: z.string(),
            issuer: z.string().optional(),
            description: z.string().optional(),
            publishDate: z.coerce.date(),
            isFeatured: z.boolean().default(false),
            credentialUrl: z.string().url().optional(),
            tags: z.array(z.string()).default([]),
            seo: seoSchema(image).optional()
        })
});

export const collections = { blog, pages, projects, videos, writing, certifications };
