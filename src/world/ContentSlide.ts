import { Application, Container, Graphics, Text, TextStyle, FederatedPointerEvent } from 'pixi.js';
import { gsap } from 'gsap';
import { Section, WritingItem } from '../config';
import { StateManager, DepthLevel } from '../core/StateManager';
import { Slide } from './Slide';

/**
 * ContentSlide (Writings)
 * Displays "Featured" articles (static top row) and "Archive" (scrollable bottom timeline)
 */
export class ContentSlide extends Slide {
    private stateManager: StateManager;
    private titleText: Text;
    private containerGroup: Container;
    private featuredContainer: Container;
    private timelineViewport: Container;
    private timelineContainer: Container;

    // Scroll state for timeline
    private scrollX: number = 0;
    private targetScrollX: number = 0;
    private maxScroll: number = 0;

    // Layout constants
    private readonly ITEM_WIDTH = 300;
    private readonly ITEM_GAP = 40;

    constructor(section: Section, app: Application, stateManager: StateManager) {
        super(section, app);
        this.stateManager = stateManager;

        this.width = 1800; // Match Projects slide width
        this.height = 1000;

        // Background
        this.background.clear();
        this.background.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 12);
        this.background.fill({ color: 0x0a0a0a });
        this.background.stroke({ width: 1, color: 0x1f1f1f });

        // General Slide Mask
        const slideMask = new Graphics();
        slideMask.rect(-this.width / 2, -this.height / 2, this.width, this.height);
        slideMask.fill({ color: 0xffffff });
        this.container.addChild(slideMask);
        this.container.mask = slideMask;

        // Main container group
        this.containerGroup = new Container();
        this.container.addChild(this.containerGroup);

        this.titleText = this.createHeader();
        this.container.addChild(this.titleText);

        this.featuredContainer = new Container();
        // Position Featured section in top 40% with proper margin
        this.featuredContainer.position.set(0, -180);

        // Timeline Viewport (Bottom Section - 40%)
        this.timelineViewport = new Container();
        // Position viewport below featured with gap
        const viewportX = -this.width / 2;
        const viewportY = 150; // Below featured with margin gap
        this.timelineViewport.position.set(viewportX, viewportY);

        const timelineMask = new Graphics();
        // Mask full width, constrained height
        timelineMask.rect(0, -30, this.width, 350);
        timelineMask.fill({ color: 0xffffff });
        this.timelineViewport.addChild(timelineMask);
        this.timelineViewport.mask = timelineMask;

        this.timelineContainer = new Container();
        this.timelineViewport.addChild(this.timelineContainer);

        // Interactive container for click propagation
        this.containerGroup.addChild(this.featuredContainer);
        this.containerGroup.addChild(this.timelineViewport);
        this.containerGroup.eventMode = 'passive';

        this.createFeaturedSection();
        this.createTimelineSection();

        // Listen for scroll events
        this.stateManager.on('contentScroll', (deltaX: number, _deltaY: number, axis: string) => {
            if (this.stateManager.currentSlideId === this.section.id) {
                if (axis === 'horizontal') {
                    this.handleScroll(deltaX);
                }
            }
        });
    }

    private createHeader(): Text {
        const style = new TextStyle({
            fontFamily: 'Playfair Display, Georgia, serif',
            fontSize: 48,
            fontWeight: '600',
            fill: '#f5f5f5',
            letterSpacing: 1,
        });

        const text = new Text({
            text: this.section.content?.heading || 'Writings',
            style,
        });

        text.anchor.set(0.5, 0.5);
        text.position.set(0, -this.height / 2 + 60); // Centered header at top

        return text;
    }

    private createFeaturedSection(): void {
        const featured = this.section.writings?.featured || [];
        if (featured.length === 0) return;

        // Section Label
        const label = this.createSectionLabel('FEATURED');
        label.anchor.set(0.5, 0.5);
        label.position.set(0, -100); // Above the cards
        this.featuredContainer.addChild(label);

        const cardWidth = 350; // Smaller cards to fit 1800 width
        const gap = 30;
        const totalW = (featured.length * cardWidth) + ((featured.length - 1) * gap);
        const startX = -totalW / 2 + cardWidth / 2;

        featured.forEach((item, index) => {
            const card = this.createCard(item, cardWidth, 180, true);
            const x = startX + index * (cardWidth + gap);
            card.position.set(x, 0); // Row layout
            this.featuredContainer.addChild(card);
        });
    }

    private createTimelineSection(): void {
        const timeline = this.section.writings?.timeline || [];
        if (timeline.length === 0) return;

        // Section Label above Archive
        const label = this.createSectionLabel('ARCHIVE');
        label.anchor.set(0.5, 0.5);
        label.position.set(0, 110); // Position above the timeline viewport (y=150)
        this.containerGroup.addChild(label);

        // Timeline visualization line inside viewport
        const line = new Graphics();
        line.moveTo(0, 100);
        line.lineTo((timeline.length * (this.ITEM_WIDTH + this.ITEM_GAP)) + 800, 100); // Long line
        line.stroke({ width: 1, color: 0x333333 });
        this.timelineContainer.addChild(line);

        // Calculate max scroll
        const totalWidth = timeline.length * (this.ITEM_WIDTH + this.ITEM_GAP) + 800; // Extra padding
        const viewportWidth = this.width;
        this.maxScroll = Math.max(0, totalWidth - viewportWidth);

        // Timeline items
        const startX = this.width / 2; // Start in middle

        timeline.forEach((item, index) => {
            const card = this.createCard(item, this.ITEM_WIDTH, 200, false);
            const x = startX + index * (this.ITEM_WIDTH + this.ITEM_GAP);
            card.position.set(x, 130);

            // Timeline dot
            const dot = new Graphics();
            dot.circle(0, 0, 4);
            dot.fill({ color: 0x666666 });
            dot.position.set(x + 15, 100);
            this.timelineContainer.addChild(dot);

            this.timelineContainer.addChild(card);
        });

        // Initial timeline container position
        this.timelineContainer.position.set(0, 0);
    }

    private createCard(item: WritingItem, width: number, height: number, isFeatured: boolean): Container {
        const container = new Container();

        // Background (invisible hit area)
        const bg = new Graphics();
        bg.rect(0, 0, width, height);
        bg.fill({ color: 0x000000, alpha: 0.01 });
        container.addChild(bg);

        // Content
        const titleStyle = new TextStyle({
            fontFamily: 'Playfair Display, Georgia, serif',
            fontSize: isFeatured ? 28 : 24,
            fontWeight: '500',
            fill: '#f5f5f5',
            wordWrap: true,
            wordWrapWidth: width - 20,
        });
        const title = new Text({ text: item.title, style: titleStyle });
        container.addChild(title);

        // Meta
        const metaStyle = new TextStyle({
            fontFamily: 'Inter, -apple-system, sans-serif',
            fontSize: 13,
            fontWeight: '400',
            fill: '#666666',
        });
        const meta = new Text({ text: `${item.date} • ${item.readTime}`, style: metaStyle });
        meta.position.set(0, title.height + 12);
        container.addChild(meta);

        // Excerpt
        const excerptStyle = new TextStyle({
            fontFamily: 'Inter, -apple-system, sans-serif',
            fontSize: 14,
            fontWeight: '300',
            fill: '#999999',
            wordWrap: true,
            wordWrapWidth: width - 20,
            lineHeight: 20,
        });
        const excerpt = new Text({ text: item.excerpt, style: excerptStyle });
        excerpt.position.set(0, meta.y + 24);
        container.addChild(excerpt);

        // Interaction
        container.eventMode = 'static';
        container.cursor = 'pointer';

        // Hover effect
        container.on('pointerover', () => {
            if (this.stateManager.depth !== DepthLevel.SECTION) return;
            gsap.to(title.style, { fill: '#ffffff', duration: 0.2 });
        });
        container.on('pointerout', () => {
            gsap.to(title.style, { fill: '#f5f5f5', duration: 0.2 });
        });

        // Click handler
        container.on('pointertap', () => {
            console.log(`[ContentSlide] Clicked: ${item.title}`);
            if (this.stateManager.depth !== DepthLevel.SECTION) return;

            // Get global bounds for transition
            const bounds = container.getBounds();
            const sourceRect = {
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height,
            };

            this.stateManager.enterDetailMode(item.id);
            this.stateManager.emit('cardClick', item, sourceRect, 0x0a0a0a);
        });

        return container;
    }

    private createSectionLabel(text: string): Text {
        const style = new TextStyle({
            fontFamily: 'Inter, -apple-system, sans-serif',
            fontSize: 12,
            fontWeight: '500',
            fill: '#444444',
            letterSpacing: 2,
        });
        return new Text({ text, style });
    }

    private handleScroll(deltaX: number): void {
        this.targetScrollX += deltaX * 1.5;
        this.targetScrollX = Math.max(0, Math.min(this.maxScroll, this.targetScrollX));
    }

    public update(delta: number): void {
        // Smooth scroll for timeline
        if (Math.abs(this.targetScrollX - this.scrollX) > 0.1) {
            this.scrollX += (this.targetScrollX - this.scrollX) * 0.1;
            // Move relative to viewport (starts at 0)
            this.timelineContainer.position.x = -this.scrollX;
        }
    }

    public onEnter(): void {
        // Reset scroll
        this.scrollX = 0;
        this.targetScrollX = 0;
        this.timelineContainer.position.x = 0;

        // Animate in
        this.containerGroup.alpha = 0;
        gsap.to(this.containerGroup, { alpha: 1, duration: 0.5 });
    }
}
