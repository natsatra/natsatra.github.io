export type ImageInput = {
    src: ImageMetadata | string;
    alt?: string;
    caption?: string;
};

export type Link = {
    text: string;
    href: string;
};

export type SocialLink = Link & {
    icon?: ImageMetadata | string;
};

export type Hero = {
    title?: string;
    text?: string;
    image?: ImageInput;
    actions?: Link[];
};

export type SiteConfig = {
    website: string;
    avatar?: ImageInput;
    title: string;
    headerTitle?: string;
    subtitle?: string;
    description: string;
    image?: ImageInput;
    headerNavLinks?: Link[];
    footerNavLinks?: Link[];
    socialLinks?: SocialLink[];
    hero?: Hero;
    postsPerPage?: number;
    projectsPerPage?: number;
    writingPerPage?: number;
    certificationsPerPage?: number;
};
