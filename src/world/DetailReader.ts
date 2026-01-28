import { gsap } from 'gsap';
import { ProjectItem, WritingItem } from '../config';
import { StateManager } from '../core/StateManager';

/**
 * DetailReader
 * Full-screen modal with hybrid rendering:
 * - Canvas layer: Hero background (color gradient)
 * - HTML overlay: Body text (DOM div for SEO, text selection, mobile crispness)
 */
export class DetailReader {
    private stateManager: StateManager;
    private container: HTMLDivElement | null = null;
    private isOpen: boolean = false;
    private scrollY: number = 0;
    private maxScroll: number = 0;

    // Animation state
    private isAnimating: boolean = false;

    constructor(stateManager: StateManager) {
        this.stateManager = stateManager;

        // Listen for detail scroll events
        this.stateManager.on('detailScroll', (deltaY: number) => {
            if (this.isOpen && !this.isAnimating) {
                this.handleScroll(deltaY);
            }
        });

        // Listen for exit detail events
        this.stateManager.on('exitDetail', () => {
            this.close();
        });
    }

    /**
     * Open the detail view with hero expansion animation
     */
    public open(
        item: ProjectItem | WritingItem,
        sourceRect: { x: number; y: number; width: number; height: number },
        heroColor: number = 0x1a1a1a
    ): void {
        if (this.isOpen || this.isAnimating) return;

        this.isOpen = true;
        this.isAnimating = true;
        this.scrollY = 0;

        console.log(`[DetailReader] Opening: ${item.title}`);

        // Create the HTML container
        this.container = this.createContainer(item, sourceRect, heroColor);
        document.body.appendChild(this.container);

        // Get elements for animation
        const _hero = this.container.querySelector('.detail-hero') as HTMLElement;
        const body = this.container.querySelector('.detail-body') as HTMLElement;
        const closeBtn = this.container.querySelector('.detail-close') as HTMLElement;

        // Start from source rect
        gsap.set(this.container, {
            clipPath: `inset(
                ${sourceRect.y}px 
                ${window.innerWidth - sourceRect.x - sourceRect.width}px 
                ${window.innerHeight - sourceRect.y - sourceRect.height}px 
                ${sourceRect.x}px
            )`,
        });
        gsap.set(body, { opacity: 0, y: 40 });
        gsap.set(closeBtn, { opacity: 0 });

        // Animate expansion
        const tl = gsap.timeline({
            onComplete: () => {
                this.isAnimating = false;
                this.calculateMaxScroll();
            },
        });

        tl.to(this.container, {
            clipPath: 'inset(0px 0px 0px 0px)',
            duration: 0.6,
            ease: 'power3.inOut',
        })
            .to(body, {
                opacity: 1,
                y: 0,
                duration: 0.4,
                ease: 'power2.out',
            }, '-=0.1')
            .to(closeBtn, {
                opacity: 1,
                duration: 0.3,
            }, '-=0.2');
    }

    /**
     * Close the detail view with collapse animation
     */
    public close(): void {
        if (!this.isOpen || this.isAnimating || !this.container) return;

        this.isAnimating = true;

        console.log('[DetailReader] Closing');

        const body = this.container.querySelector('.detail-body') as HTMLElement;
        const closeBtn = this.container.querySelector('.detail-close') as HTMLElement;

        // Animate collapse
        const tl = gsap.timeline({
            onComplete: () => {
                if (this.container) {
                    document.body.removeChild(this.container);
                    this.container = null;
                }
                this.isOpen = false;
                this.isAnimating = false;
            },
        });

        tl.to(closeBtn, {
            opacity: 0,
            duration: 0.2,
        })
            .to(body, {
                opacity: 0,
                y: 20,
                duration: 0.3,
                ease: 'power2.in',
            }, '-=0.1')
            .to(this.container, {
                opacity: 0,
                duration: 0.3,
                ease: 'power2.in',
            });
    }

    /**
     * Handle vertical scroll within detail view
     */
    private handleScroll(deltaY: number): void {
        this.scrollY += deltaY;

        // Clamp scroll position
        this.scrollY = Math.max(0, Math.min(this.maxScroll, this.scrollY));

        console.log(`[DetailReader] Scroll Y: ${Math.round(this.scrollY)}`);

        // Apply scroll to body content
        const body = this.container?.querySelector('.detail-body') as HTMLElement;
        if (body) {
            gsap.to(body, {
                y: -this.scrollY,
                duration: 0.1,
                ease: 'power1.out',
            });
        }

        // Show/hide fixed header based on scroll position
        const header = this.container?.querySelector('.detail-header') as HTMLElement;
        if (header) {
            // Show header when scrolled past the hero (approx 200px)
            if (this.scrollY > 200) {
                header.classList.add('visible');
            } else {
                header.classList.remove('visible');
            }
        }

        // Update Scroll Indicator
        const thumb = this.container?.querySelector('.detail-scroll-thumb') as HTMLElement;
        const trackHeight = window.innerHeight;
        const contentHeight = (this.container?.querySelector('.detail-body') as HTMLElement)?.scrollHeight || trackHeight;

        if (thumb && contentHeight > trackHeight) {
            const thumbHeight = Math.max(50, (trackHeight / contentHeight) * trackHeight);
            const progress = this.scrollY / this.maxScroll;
            const maxThumbTop = trackHeight - thumbHeight;
            const thumbTop = progress * maxThumbTop;

            gsap.to(thumb, {
                height: thumbHeight,
                y: thumbTop,
                duration: 0.1,
                overwrite: true
            });

            // Show thumb while scrolling, then fade out
            gsap.to(thumb, {
                opacity: 1,
                duration: 0.2,
                overwrite: true
            });
            gsap.to(thumb, {
                opacity: 0,
                duration: 0.5,
                delay: 1
            });
        }
    }

    /**
     * Calculate maximum scroll distance
     */
    private calculateMaxScroll(): void {
        const body = this.container?.querySelector('.detail-body') as HTMLElement;
        if (body) {
            const viewportHeight = window.innerHeight - 300; // Account for hero
            this.maxScroll = Math.max(0, body.scrollHeight - viewportHeight);
        }
    }

    /**
     * Create media embed HTML for videos/iframes
     */
    private createMediaEmbed(item: ProjectItem | WritingItem): string {
        const projectItem = item as ProjectItem & { videoUrl?: string; embedCode?: string };

        // Check for embed code first (raw HTML)
        if (projectItem.embedCode) {
            return `<div class="detail-media">${projectItem.embedCode}</div>`;
        }

        // Check for video URL
        if (projectItem.videoUrl) {
            const url = projectItem.videoUrl;

            // YouTube
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                const videoId = this.extractYouTubeId(url);
                if (videoId) {
                    return `<div class="detail-media">
                        <iframe src="https://www.youtube.com/embed/${videoId}" 
                                frameborder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowfullscreen></iframe>
                    </div>`;
                }
            }

            // Vimeo
            if (url.includes('vimeo.com')) {
                const videoId = url.split('/').pop();
                return `<div class="detail-media">
                    <iframe src="https://player.vimeo.com/video/${videoId}" 
                            frameborder="0" 
                            allow="autoplay; fullscreen; picture-in-picture" 
                            allowfullscreen></iframe>
                </div>`;
            }

            // Standard video file
            return `<div class="detail-media">
                <video controls>
                    <source src="${url}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            </div>`;
        }

        return '';
    }

    /**
     * Extract YouTube video ID from URL
     */
    private extractYouTubeId(url: string): string | null {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = url.match(regex);
        return match ? match[1] : null;
    }

    /**
     * Create the HTML container structure
     */
    private createContainer(
        item: ProjectItem | WritingItem,
        _sourceRect: { x: number; y: number; width: number; height: number },
        heroColor: number
    ): HTMLDivElement {
        const container = document.createElement('div');
        container.className = 'detail-reader';

        // Check if it's a project or writing
        const isProject = 'tags' in item;
        const colorHex = `#${heroColor.toString(16).padStart(6, '0')}`;

        // New structure with scroll-container for proper document flow
        container.innerHTML = `
            <div class="detail-navbar">
                <div class="detail-navbar-title">${item.title}</div>
                <button class="detail-close" aria-label="Close">
                    <svg width="24\" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="detail-scroll-container">
                <div class="detail-hero" style="background: linear-gradient(135deg, ${colorHex}, #0a0a0a);">
                    <div class="detail-hero-content">
                        <h1 class="detail-title">${item.title}</h1>
                        ${isProject
                ? `<div class="detail-meta">${(item as ProjectItem).year} • ${(item as ProjectItem).tags?.join(' • ')}</div>`
                : `<div class="detail-meta">${(item as WritingItem).date} • ${(item as WritingItem).readTime}</div>`
            }
                    </div>
                </div>
                <div class="detail-body">
                    <div class="detail-content">
                        ${this.createMediaEmbed(item)}
                        <p class="detail-copy">${isProject ? (item as ProjectItem).copy : (item as WritingItem).excerpt}</p>
                        <div class="detail-text">${item.bodyText.split('\n\n').map(p => `<p>${p}</p>`).join('')}</div>
                    </div>
                </div>
            </div>
        `;

        // Add close button handler
        const closeBtn = container.querySelector('.detail-close');
        closeBtn?.addEventListener('click', () => {
            this.stateManager.exitDetailMode();
        });

        // Show/hide navbar title on scroll
        const scrollContainer = container.querySelector('.detail-scroll-container') as HTMLElement;
        const navbar = container.querySelector('.detail-navbar') as HTMLElement;

        scrollContainer?.addEventListener('scroll', () => {
            if (scrollContainer.scrollTop > 200) {
                navbar.classList.add('visible');
            } else {
                navbar.classList.remove('visible');
            }
        });

        // Inject styles if not already present
        this.injectStyles();

        return container;
    }

    /**
     * Inject CSS styles for the detail reader
     */
    private injectStyles(): void {
        if (document.getElementById('detail-reader-styles')) return;

        const style = document.createElement('style');
        style.id = 'detail-reader-styles';
        style.textContent = `
            /* Main container - fixed fullscreen */
            .detail-reader {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                z-index: 1000;
                background: #0a0a0a;
                overflow: hidden;
            }

            /* Scrollable container - enables native scroll */
            .detail-scroll-container {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                overflow-y: auto;
                overflow-x: hidden;
                scroll-behavior: smooth;
            }

            /* Fixed navbar at top */
            .detail-navbar {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 80px;
                background: rgba(10, 10, 10, 0.95);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                z-index: 1003;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 24px;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s;
            }

            .detail-navbar.visible {
                opacity: 1;
                pointer-events: auto;
            }

            .detail-navbar-title {
                font-family: 'Inter', -apple-system, sans-serif;
                font-size: 16px;
                font-weight: 500;
                color: #f5f5f5;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                flex: 1;
                margin-right: 16px;
            }

            /* Close button - inside navbar */
            .detail-close {
                width: 40px;
                height: 40px;
                background: rgba(255, 255, 255, 0.1);
                border: none;
                border-radius: 50%;
                color: #f5f5f5;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s, transform 0.2s;
                flex-shrink: 0;
            }

            .detail-close:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: scale(1.05);
            }

            /* Hero section - normal flow, takes 60vh */
            .detail-hero {
                position: relative;
                width: 100%;
                min-height: 60vh;
                display: flex;
                flex-direction: column;
                justify-content: flex-end;
                padding: 80px 60px 60px 60px;
                box-sizing: border-box;
            }

            .detail-hero-content {
                max-width: 800px;
            }

            .detail-title {
                font-family: 'Playfair Display', Georgia, serif;
                font-size: clamp(32px, 5vw, 64px);
                font-weight: 600;
                color: #f5f5f5;
                margin: 0 0 16px 0;
                line-height: 1.1;
            }

            .detail-meta {
                font-family: 'Inter', -apple-system, sans-serif;
                font-size: 14px;
                font-weight: 400;
                color: rgba(255, 255, 255, 0.6);
                letter-spacing: 1px;
                text-transform: uppercase;
            }

            /* Body section - normal flow, below hero */
            .detail-body {
                position: relative;
                padding: 60px;
                background: #0a0a0a;
                min-height: 50vh;
                z-index: 10;
            }

            .detail-content {
                max-width: 680px;
                margin: 0 auto;
            }

            .detail-copy {
                font-family: 'Inter', -apple-system, sans-serif;
                font-size: 20px;
                font-weight: 400;
                color: #a0a0a0;
                line-height: 1.6;
                margin: 0 0 40px 0;
            }

            .detail-text {
                font-family: 'Inter', -apple-system, sans-serif;
                font-size: 17px;
                font-weight: 300;
                color: #d0d0d0;
                line-height: 1.8;
            }

            .detail-text p {
                margin: 0 0 24px 0;
            }

            /* Media Embed Container */
            .detail-media {
                margin: 0 0 40px 0;
                border-radius: 8px;
                overflow: hidden;
                background: #1a1a1a;
            }

            .detail-media iframe,
            .detail-media video {
                width: 100%;
                aspect-ratio: 16 / 9;
                display: block;
            }

            /* Mobile responsive */
            @media (max-width: 768px) {
                .detail-hero {
                    padding: 60px 32px 32px 32px;
                    min-height: 50vh;
                }

                .detail-body {
                    padding: 32px;
                }

                .detail-navbar {
                    padding: 0 16px;
                }
            }
        `;

        document.head.appendChild(style);
    }
}
