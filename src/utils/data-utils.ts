import { type CollectionEntry } from 'astro:content';
import { slugify } from './common-utils';

export function sortItemsByDateDesc(
    itemA: CollectionEntry<'blog' | 'projects' | 'certifications'>,
    itemB: CollectionEntry<'blog' | 'projects' | 'certifications'>
) {
    return new Date(itemB.data.publishDate).getTime() - new Date(itemA.data.publishDate).getTime();
}

export function getAllTags(posts: CollectionEntry<'blog' | 'projects' | 'writing' | 'certifications'>[]) {
    const tags: string[] = [...new Set(posts.flatMap((post) => post.data.tags || []).filter(Boolean))];
    return tags
        .map((tag) => {
            return {
                name: tag,
                id: slugify(tag)
            };
        })
        .filter((obj, pos, arr) => {
            return arr.map((mapObj) => mapObj.id).indexOf(obj.id) === pos;
        });
}

export function getPostsByTag<T extends CollectionEntry<'blog' | 'projects' | 'writing' | 'certifications'>>(posts: T[], tagId: string) {
    return posts.filter((post) => (post.data.tags || []).map((tag) => slugify(tag)).includes(tagId));
}
