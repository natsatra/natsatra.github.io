import avatar from '../assets/images/round.jpg';
import linkedinIcon from '../assets/images/linkedin.png';
import type { SiteConfig } from '../types';

const siteConfig: SiteConfig = {
    website: 'https://natsatra.github.io/portfolio',
    avatar: {
        src: avatar,
        alt: 'Mathangi'
    },
    title: 'Mathangi | Technical Writer Portfolio',
    headerTitle: 'Mathangi S.',
    subtitle: 'Technical writer | User advocate | Developer docs | UX writing',
    description: 'Astro.js and Tailwind CSS theme for blog and portfolio by justgoodui.com',
    image: {
        src: '/dante-preview.jpg',
        alt: 'Dante - Astro.js and Tailwind CSS theme'
    },
    headerNavLinks: [
        {
            text: 'Home',
            href: '/'
        },
        {
            text: 'About',
            href: '/about'
        },
        {
            text: 'Writing',
            href: '/writing'
        },
        {
            text: 'Projects',
            href: '/projects'
        },
        {
            text: 'Videos',
            href: '/videos'
        },
        /*{
            text: 'Certifications',
            href: '/certifications'
        },
        {
            text: 'Blog',
            href: '/blog'
        },*/
       
    ],
    
    socialLinks: [
        {
            text: 'Linkedin',
            href: 'https://www.linkedin.com/in/mathangikcs',
            icon: linkedinIcon
        },
        {
            text: 'GitHub',
            href: 'https://github.com/natsatra',
            icon: '/github.png'
        }
    ],
    hero: {
        title: 'Hi there & welcome to my portfolio!',
        text: "I'm **Mathangi**, a senior technical writer. I treat every feature I document as a user would: testing behavior, surfacing edge cases, and documenting failure states as thoroughly as happy paths. Eight years across enterprise security products and SaaS taught me the difference between documentation that exists and documentation that works.\n\nI'm also a python enthusiast who loves to dabble in coding projects! Check out my [GitHub](https://github.com/natsatra).",
        actions: [
            {
                text: 'Get in touch',
                href: '/about#get-in-touch'
            }
        ]
    },
    postsPerPage: 8,
    projectsPerPage: 8,
    writingPerPage: 8,
    certificationsPerPage: 8
};

export default siteConfig;
