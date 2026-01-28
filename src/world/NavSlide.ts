import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { gsap } from 'gsap';
import { Section } from '../config';
import { Slide } from './Slide';

/**
 * NavSlide
 * Navigation anchor slide with links to other sections
 */
export class NavSlide extends Slide {
    private links: Container[] = [];

    constructor(section: Section, app: Application) {
        super(section, app);

        this.width = 1200;
        this.height = 800;

        // Recreate background
        this.background.clear();
        this.background.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 12);
        this.background.fill({ color: 0x0a0a0a });
        this.background.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 12);
        this.background.stroke({ width: 1, color: 0x1a1a1a });

        this.createNavLinks();
        this.playIntro();
    }

    private createNavLinks(): void {
        const links = ['Home', 'Projects', 'Writings', 'Now'];
        const startY = -((links.length - 1) * 80) / 2;

        links.forEach((label, index) => {
            const linkContainer = new Container();
            linkContainer.position.set(0, startY + index * 80);

            // Create text
            const style = new TextStyle({
                fontFamily: 'Playfair Display, Georgia, serif',
                fontSize: 48,
                fontWeight: '500',
                fill: '#888888',
            });

            const text = new Text({ text: label, style });
            text.anchor.set(0.5, 0.5);

            // Hover line
            const line = new Graphics();
            line.rect(-text.width / 2, 30, text.width, 2);
            line.fill({ color: 0xf5f5f5 });
            line.scale.x = 0;

            linkContainer.addChild(text);
            linkContainer.addChild(line);
            linkContainer.eventMode = 'static';
            linkContainer.cursor = 'pointer';

            // Hover effects
            linkContainer.on('pointerenter', () => {
                gsap.to(text.style, { fill: '#f5f5f5', duration: 0.3 });
                gsap.to(line.scale, { x: 1, duration: 0.3, ease: 'power2.out' });
            });

            linkContainer.on('pointerleave', () => {
                gsap.to(text.style, { fill: '#888888', duration: 0.3 });
                gsap.to(line.scale, { x: 0, duration: 0.3, ease: 'power2.in' });
            });

            this.links.push(linkContainer);
            this.container.addChild(linkContainer);
        });
    }

    private playIntro(): void {
        this.links.forEach((link, index) => {
            link.alpha = 0;
            link.position.x = -30;

            gsap.to(link, {
                alpha: 1,
                duration: 0.5,
                delay: index * 0.1,
                ease: 'power2.out',
            });

            gsap.to(link.position, {
                x: 0,
                duration: 0.6,
                delay: index * 0.1,
                ease: 'power3.out',
            });
        });
    }

    public onEnter(): void {
        this.playIntro();
    }
}
