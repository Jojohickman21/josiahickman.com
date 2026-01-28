/**
 * World Configuration
 * Defines the layout and content of the infinite canvas
 */

export interface WorldCoordinates {
    x: number;
    y: number;
}

export interface SectionContent {
    heading?: string;
    sub?: string;
    description?: string;
}

export interface ProjectItem {
    id: string;
    title: string;
    images: string[];
    copy: string;
    bodyText: string; // Long-form content for detail view
    year?: string;
    tags?: string[];
    color?: number; // Placeholder color for thumbnail
}

export interface WritingItem {
    id: string;
    title: string;
    excerpt: string;
    bodyText: string;
    date: string;
    readTime: string;
    featured?: boolean;
}

export interface Section {
    id: string;
    worldCoordinates: WorldCoordinates;
    type: 'hero' | 'carousel' | 'content' | 'nav' | 'now' | 'writings';
    content?: SectionContent;
    items?: ProjectItem[];
    writings?: {
        featured: WritingItem[];
        timeline: WritingItem[];
    };
}

export interface LayoutConfig {
    gridSize: number;
    friction: number;
    perspective: number;
    minZoom: number;
    maxZoom: number;
    zoomSpeed: number;
    panSpeed: number;
    tiltAmount: number;
}

export interface WorldConfig {
    layout: LayoutConfig;
    sections: Section[];
}

// Lorem ipsum generator for body text
const loremParagraph = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.`;

const generateBodyText = (paragraphs: number = 5): string => {
    return Array(paragraphs).fill(loremParagraph).join('\n\n');
};

export const worldConfig: WorldConfig = {
    layout: {
        gridSize: 2000,
        friction: 0.92,
        perspective: 1000,
        minZoom: 0.5,
        maxZoom: 2.0,
        zoomSpeed: 0.001,
        panSpeed: 1.2,
        tiltAmount: 15,
    },
    sections: [
        {
            id: 'home',
            worldCoordinates: { x: 0, y: 0 },
            type: 'hero',
            content: {
                heading: 'Design Engineer',
                sub: 'Building Digital Worlds',
                description: 'Crafting immersive experiences at the intersection of design and technology.',
            },
        },
        {
            id: 'nav',
            worldCoordinates: { x: 2000, y: 0 },
            type: 'nav',
            content: {
                heading: 'Navigate',
            },
        },
        {
            id: 'now',
            worldCoordinates: { x: 4000, y: 0 },
            type: 'now',
            content: {
                heading: 'Now',
                sub: 'What I\'m up to',
                description: 'Current focus, projects, and interests.',
            },
        },
        {
            id: 'writings',
            worldCoordinates: { x: 0, y: 2000 },
            type: 'writings',
            content: {
                heading: 'Writings',
                sub: 'Thoughts & Explorations',
                description: 'Essays on design systems, creative technology, and digital craft.',
            },
            writings: {
                featured: [
                    {
                        id: 'featured-1',
                        title: 'The Future of Spatial Interfaces',
                        excerpt: 'Exploring how infinite canvas experiences are reshaping digital navigation.',
                        bodyText: generateBodyText(8),
                        date: '2024-12-15',
                        readTime: '12 min',
                        featured: true,
                    },
                    {
                        id: 'featured-2',
                        title: 'Design Systems at Scale',
                        excerpt: 'Building component libraries that grow with your team.',
                        bodyText: generateBodyText(6),
                        date: '2024-11-20',
                        readTime: '8 min',
                        featured: true,
                    },
                    {
                        id: 'featured-3',
                        title: 'WebGL Performance Patterns',
                        excerpt: 'Techniques for smooth 60fps experiences in the browser.',
                        bodyText: generateBodyText(7),
                        date: '2024-10-05',
                        readTime: '10 min',
                        featured: true,
                    },
                ],
                timeline: [
                    {
                        id: 'timeline-1',
                        title: 'On Creative Constraints',
                        excerpt: 'Why limitations spark innovation.',
                        bodyText: generateBodyText(5),
                        date: '2024-09-18',
                        readTime: '5 min',
                    },
                    {
                        id: 'timeline-2',
                        title: 'Motion Design Principles',
                        excerpt: 'The physics of delightful animations.',
                        bodyText: generateBodyText(6),
                        date: '2024-08-22',
                        readTime: '7 min',
                    },
                    {
                        id: 'timeline-3',
                        title: 'Typography in Digital Spaces',
                        excerpt: 'Choosing fonts that breathe.',
                        bodyText: generateBodyText(4),
                        date: '2024-07-10',
                        readTime: '4 min',
                    },
                    {
                        id: 'timeline-4',
                        title: 'The Art of the Transition',
                        excerpt: 'Seamless state changes in modern UIs.',
                        bodyText: generateBodyText(5),
                        date: '2024-06-05',
                        readTime: '6 min',
                    },
                    {
                        id: 'timeline-5',
                        title: 'Building for Touch',
                        excerpt: 'Gestural interfaces beyond the tap.',
                        bodyText: generateBodyText(5),
                        date: '2024-05-12',
                        readTime: '5 min',
                    },
                    {
                        id: 'timeline-6',
                        title: 'Color Systems That Work',
                        excerpt: 'Dynamic palettes for dark mode and beyond.',
                        bodyText: generateBodyText(4),
                        date: '2024-04-20',
                        readTime: '4 min',
                    },
                ],
            },
        },
        {
            id: 'projects',
            worldCoordinates: { x: 2000, y: 2000 },
            type: 'carousel',
            content: {
                heading: 'Projects',
                sub: 'Selected Works',
            },
            items: [
                {
                    id: 'project-1',
                    title: 'Infinite Canvas',
                    images: [],
                    copy: 'An experimental interface exploring spatial navigation and immersive web experiences.',
                    bodyText: generateBodyText(6),
                    year: '2024',
                    tags: ['WebGL', 'PixiJS', 'GSAP'],
                    color: 0x3498db,
                },
                {
                    id: 'project-2',
                    title: 'Design System Pro',
                    images: [],
                    copy: 'A comprehensive design system for next-generation creative tools.',
                    bodyText: generateBodyText(7),
                    year: '2024',
                    tags: ['Design Systems', 'React', 'TypeScript'],
                    color: 0x9b59b6,
                },
                {
                    id: 'project-3',
                    title: 'Collaborative Canvas',
                    images: [],
                    copy: 'Real-time collaborative canvas for distributed design teams.',
                    bodyText: generateBodyText(5),
                    year: '2023',
                    tags: ['Canvas', 'WebRTC', 'Collaboration'],
                    color: 0x2ecc71,
                },
                {
                    id: 'project-4',
                    title: 'Motion Studio',
                    images: [],
                    copy: 'A tool for crafting micro-interactions and animation sequences.',
                    bodyText: generateBodyText(6),
                    year: '2023',
                    tags: ['Animation', 'Timeline', 'Keyframes'],
                    color: 0xe74c3c,
                },
                {
                    id: 'project-5',
                    title: 'Typography Toolkit',
                    images: [],
                    copy: 'Variable font explorer with real-time axis manipulation.',
                    bodyText: generateBodyText(5),
                    year: '2022',
                    tags: ['Typography', 'Variable Fonts', 'CSS'],
                    color: 0xf39c12,
                },
                {
                    id: 'project-6',
                    title: 'Color Engine',
                    images: [],
                    copy: 'Dynamic color palette generator with accessibility checks.',
                    bodyText: generateBodyText(4),
                    year: '2022',
                    tags: ['Color', 'A11y', 'Generative'],
                    color: 0x1abc9c,
                },
            ],
        },
    ],
};
