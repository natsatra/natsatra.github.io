import avatar from '../assets/images/round.jpg';
import linkedinIcon from '../assets/images/linkedin.png';
import type { SiteConfig } from '../types';

const siteConfig: SiteConfig = {
    website: 'https://natsatra.github.io',
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
            text: 'Writing',
            href: '/writing'
        },
        {
            text: 'Projects',
            href: '/projects'
        },
        {
            text: 'Tech stack',
            href: '/tech-stack'
        },
        /*{
            text: 'Videos',
            href: '/videos'
        },*/
        {
            text: 'About',
            href: '/about'
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
        title: 'I make complex software make sense.',
        text: "I'm **Mathangi**, a senior technical writer in enterprise security and enterprise SaaS — domains where the concepts are dense and the cost of confusion is high. I treat every feature the way a user would: testing behavior, surfacing edge cases, and covering failure states as thoroughly as happy paths. It's the difference between documentation that exists and documentation that works.\n\nI'm looking for my next full-time technical writing role. If you're growing a docs team, please reach out to me at [mathangikcs@gmail.com](mailto:mathangikcs@gmail.com) or on <a href=\"https://linkedin.com/in/mathangikcs\" target=\"_blank\" rel=\"noopener noreferrer\">LinkedIn</a>!",
        /*actions: [
            {
                text: 'About me',
                href: '/about'
            }
        ]*/
    },
    postsPerPage: 8,
    projectsPerPage: 8,
    writingPerPage: 8,
    certificationsPerPage: 8
};

export default siteConfig;
