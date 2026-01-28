import { Application, Container, Graphics, Text, TextStyle, FederatedPointerEvent, Rectangle } from 'pixi.js';
import { gsap } from 'gsap';
import { Section, ProjectItem } from '../config';
import { StateManager, DepthLevel } from '../core/StateManager';
import { Slide } from './Slide';

/**
 * CarouselSlide
 * Horizontal scrolling carousel for projects with:
 * - Momentum-based scrolling
 * - Snap-to-card physics
 * - Parallax effect on images
 */
export class CarouselSlide extends Slide {
    private stateManager: StateManager;
    private itemsContainer: Container;
    private items: Container[] = [];
    private itemImages: Graphics[] = []; // Store image placeholders for parallax
    private currentIndex: number = 0;
    private titleText: Text;
    private indicator: Container;

    // Scroll physics
    private _targetScrollX: number = 0; // Reserved for future smooth scrolling
    private currentScrollX: number = 0;
    private scrollVelocity: number = 0;
    private isSnapping: boolean = false;
    private readonly SCROLL_FRICTION = 0.92;
    private readonly SCROLL_SENSITIVITY = 1.5;
    private readonly PARALLAX_FACTOR = 0.3; // Images move at 70% of card speed

    // Layout constants
    private readonly ITEM_WIDTH = 500;
    private readonly _ITEM_HEIGHT = 600; // Reserved for vertical card bounds
    private readonly ITEM_GAP = 60;

    // Drag state for event trapping
    private isDragging: boolean = false;
    private dragStartX: number = 0;
    private lastDragX: number = 0;
    private containerStartX: number = 0;

    // Debug mode (set to true to see hit area)
    private readonly DEBUG_HIT_AREA = false;

    constructor(section: Section, app: Application, stateManager: StateManager) {
        super(section, app);
        this.stateManager = stateManager;

        this.width = 1800;
        this.height = 1000;

        // Recreate background
        this.background.clear();
        this.background.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 12);
        this.background.fill({ color: 0x0d0d0d });
        this.background.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 12);
        this.background.stroke({ width: 1, color: 0x1f1f1f });

        // Create header
        this.titleText = this.createHeader();
        this.container.addChild(this.titleText);

        // Create items container (interactive for click propagation)
        this.itemsContainer = new Container();
        this.itemsContainer.position.set(0, 0); // Center relative to slide
        this.itemsContainer.eventMode = 'passive'; // Allow events to propagate to children
        this.container.addChild(this.itemsContainer);

        // CREATE MASK (Fix 1: Content Bleeding)
        const mask = new Graphics();
        mask.rect(-this.width / 2, -this.height / 2, this.width, this.height);
        mask.fill({ color: 0xffffff });
        this.container.addChild(mask);
        this.itemsContainer.mask = mask;

        // Create carousel items
        this.createItems();

        // Create scroll indicator
        this.indicator = this.createIndicator();
        this.container.addChild(this.indicator);

        // Listen for content scroll events (now with axis info)
        this.stateManager.on('contentScroll', (deltaX: number, _deltaY: number, axis: string) => {
            if (this.stateManager.currentSlideId === this.section.id) {
                if (axis === 'horizontal') {
                    this.handleHorizontalScroll(deltaX);
                }
                // Vertical scrolling within cards can be added later
            }
        });

        // Setup drag event handlers for horizontal scroll trapping
        this.setupDragScrolling();
    }

    /**
     * Setup drag-based horizontal scrolling with event trapping
     */
    private setupDragScrolling(): void {
        // Make the container catch pointer events
        this.container.eventMode = 'static';
        this.container.cursor = 'grab';

        // CRITICAL: Use massive hit area to ensure we catch ALL events
        // This prevents clicks on empty space from falling through to viewport
        this.container.hitArea = new Rectangle(
            -5000,
            -5000,
            10000,
            10000
        );

        // Visual debugger - shows hit area as red rectangle
        if (this.DEBUG_HIT_AREA) {
            const debugRect = new Graphics();
            debugRect.rect(-this.width / 2, -this.height / 2, this.width, this.height);
            debugRect.fill({ color: 0xff0000, alpha: 0.3 });
            this.container.addChild(debugRect);
            console.log('[CarouselSlide] Debug hit area visible');
        }

        // Pointer down - start drag
        this.container.on('pointerdown', (e: FederatedPointerEvent) => {
            // Only trap events when in SECTION mode
            if (this.stateManager.currentSlideId !== this.section.id) return;

            e.stopPropagation(); // Prevent viewport from receiving the event
            this.isDragging = true;
            this.dragStartX = e.global.x;
            this.lastDragX = e.global.x;
            this.containerStartX = this.currentScrollX; // Store current scroll position
            this.container.cursor = 'grabbing';

            // Pause global viewport dragging
            this.stateManager.emit('carouselDragStart');

            // Kill any existing snap animation
            this.isSnapping = false;
            this.scrollVelocity = 0;
        });

        // Global pointer move - handle drag
        this.container.on('globalpointermove', (e: FederatedPointerEvent) => {
            if (!this.isDragging) return;

            const deltaX = e.global.x - this.lastDragX;
            this.lastDragX = e.global.x;

            // Apply drag movement (inverted for natural scroll feel)
            this.scrollVelocity = -deltaX * this.SCROLL_SENSITIVITY;
            this.currentScrollX -= deltaX;

            // Clamp to bounds
            const maxScroll = (this.items.length - 1) * (this.ITEM_WIDTH + this.ITEM_GAP);
            this.currentScrollX = Math.max(0, Math.min(maxScroll, this.currentScrollX));

            this.updateCardPositions();
        });

        // Pointer up - end drag and apply momentum
        this.container.on('pointerup', () => {
            if (!this.isDragging) return;
            this.endDrag();
        });

        this.container.on('pointerupoutside', () => {
            if (!this.isDragging) return;
            this.endDrag();
        });
    }

    /**
     * End drag and trigger snap
     */
    private endDrag(): void {
        this.isDragging = false;
        this.container.cursor = 'grab';

        // Resume global viewport dragging
        this.stateManager.emit('carouselDragEnd');

        // If velocity is low, snap immediately
        if (Math.abs(this.scrollVelocity) < 2) {
            this.snapToNearestCard();
        }
        // Otherwise let momentum carry and snap when it slows
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
            text: this.section.content?.heading || 'Projects',
            style,
        });

        text.anchor.set(0.5, 0.5);
        text.position.set(0, -this.height / 2 + 80);

        return text;
    }

    private createItems(): void {
        const itemWidth = 500;
        const itemHeight = 600;
        const gap = 60;

        (this.section.items || []).forEach((item, index) => {
            const itemContainer = new Container();
            // Simple linear layout starting from 0, centering handled by container movement
            const x = index * (itemWidth + gap);
            itemContainer.position.set(x, 0);

            // Item background
            const bg = new Graphics();
            bg.roundRect(-itemWidth / 2, -itemHeight / 2, itemWidth, itemHeight, 8);
            bg.fill({ color: 0x1a1a1a });
            bg.stroke({ width: 1, color: 0x2a2a2a });
            itemContainer.addChild(bg);

            // Project image placeholder (stored for parallax)
            const imagePlaceholder = new Graphics();
            imagePlaceholder.roundRect(-itemWidth / 2 + 20, -itemHeight / 2 + 20, itemWidth - 40, 280, 6);
            imagePlaceholder.fill({ color: 0x252525 });
            itemContainer.addChild(imagePlaceholder);
            this.itemImages.push(imagePlaceholder);

            // Project title
            const titleStyle = new TextStyle({
                fontFamily: 'Inter, -apple-system, sans-serif',
                fontSize: 24,
                fontWeight: '600',
                fill: '#f5f5f5',
            });
            const title = new Text({ text: item.title, style: titleStyle });
            title.anchor.set(0, 0.5);
            title.position.set(-itemWidth / 2 + 20, 60);
            itemContainer.addChild(title);

            // Year
            if (item.year) {
                const yearStyle = new TextStyle({
                    fontFamily: 'Inter, -apple-system, sans-serif',
                    fontSize: 14,
                    fontWeight: '400',
                    fill: '#666666',
                    letterSpacing: 2,
                });
                const year = new Text({ text: item.year, style: yearStyle });
                year.anchor.set(0, 0.5);
                year.position.set(-itemWidth / 2 + 20, 95);
                itemContainer.addChild(year);
            }

            // Description
            const copyStyle = new TextStyle({
                fontFamily: 'Inter, -apple-system, sans-serif',
                fontSize: 15,
                fontWeight: '300',
                fill: '#888888',
                wordWrap: true,
                wordWrapWidth: itemWidth - 50,
                lineHeight: 24,
            });
            const copy = new Text({ text: item.copy, style: copyStyle });
            copy.anchor.set(0, 0);
            copy.position.set(-itemWidth / 2 + 20, 120);
            itemContainer.addChild(copy);

            // Tags
            if (item.tags) {
                const tagsContainer = new Container();
                tagsContainer.position.set(-itemWidth / 2 + 20, itemHeight / 2 - 50);

                item.tags.forEach((tag, tagIndex) => {
                    const tagBg = new Graphics();
                    tagBg.roundRect(0, 0, 80, 26, 4);
                    tagBg.fill({ color: 0x252525 });

                    const tagStyle = new TextStyle({
                        fontFamily: 'Inter, -apple-system, sans-serif',
                        fontSize: 11,
                        fontWeight: '500',
                        fill: '#888888',
                    });
                    const tagText = new Text({ text: tag, style: tagStyle });
                    tagText.position.set(40, 13);
                    tagText.anchor.set(0.5, 0.5);

                    const tagWrap = new Container();
                    tagWrap.addChild(tagBg);
                    tagWrap.addChild(tagText);
                    tagWrap.position.x = tagIndex * 90;
                    tagsContainer.addChild(tagWrap);
                });

                itemContainer.addChild(tagsContainer);
            }

            // Make item interactive for click
            itemContainer.eventMode = 'static';
            itemContainer.cursor = 'pointer';
            (itemContainer as Container & { itemData: ProjectItem }).itemData = item;

            // Click handler to open detail view
            itemContainer.on('pointertap', (e: FederatedPointerEvent) => {
                console.log(`[Carousel] Tap detected on card: ${item.title}, depth: ${this.stateManager.depth}`);

                // Only trigger if we're in SECTION mode
                if (this.stateManager.depth !== DepthLevel.SECTION) {
                    console.log('[Carousel] Not in SECTION mode, ignoring click');
                    return;
                }

                // Center this card then open detail
                this.handleCardClick(item, itemContainer, e);
            });

            this.items.push(itemContainer);
            this.itemsContainer.addChild(itemContainer);
        });
    }

    /**
     * Handle click on a project card - open detail view
     */
    private handleCardClick(item: ProjectItem, container: Container, _e: FederatedPointerEvent): void {
        console.log(`[Carousel] Card clicked: ${item.title}`);

        // Get global bounds of the clicked card for hero expansion
        const bounds = container.getBounds();
        const sourceRect = {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
        };

        // Enter detail mode
        this.stateManager.enterDetailMode(item.id);

        // Emit card click event for DetailReader to handle
        this.stateManager.emit('cardClick', item, sourceRect, item.color || 0x1a1a1a);
    }

    private createIndicator(): Container {
        const indicator = new Container();
        indicator.position.set(0, this.height / 2 - 60);

        const total = this.section.items?.length || 0;
        const dotSize = 8;
        const gap = 16;
        const startX = -((total - 1) * gap) / 2;

        for (let i = 0; i < total; i++) {
            const dot = new Graphics();
            dot.circle(0, 0, dotSize / 2);
            dot.fill({ color: i === 0 ? 0xffffff : 0x444444 });
            dot.position.set(startX + i * gap, 0);
            dot.name = `dot-${i}`;

            // Make dots interactive and clickable
            dot.eventMode = 'static';
            dot.cursor = 'pointer';
            dot.on('pointertap', () => {
                this.scrollToIndex(i);
            });

            indicator.addChild(dot);
        }

        return indicator;
    }

    /**
     * Scroll to a specific card index
     */
    private scrollToIndex(index: number): void {
        const total = this.items.length;
        if (total === 0) return;

        index = Math.max(0, Math.min(total - 1, index));

        if (this.isSnapping) return;
        this.isSnapping = true;

        const cardSpacing = this.ITEM_WIDTH + this.ITEM_GAP;
        const targetX = index * cardSpacing;

        gsap.to(this, {
            currentScrollX: targetX,
            duration: 0.5,
            ease: 'power2.out',
            onUpdate: () => {
                this.updateCardPositions();
            },
            onComplete: () => {
                this.isSnapping = false;
                this.currentIndex = index;
                this.updateIndicator(index);
            },
        });
    }

    private _goToItem(index: number): void {
        const total = this.section.items?.length || 0;
        index = Math.max(0, Math.min(total - 1, index));

        if (index === this.currentIndex) return;

        this.currentIndex = index;

        // Animate items
        const itemWidth = 500;
        const gap = 60;

        this.items.forEach((item, i) => {
            const targetX = (i - index) * (itemWidth + gap);
            const isActive = i === index;

            gsap.to(item.position, {
                x: targetX,
                duration: 0.6,
                ease: 'power2.out',
            });

            gsap.to(item, {
                alpha: isActive ? 1 : 0.4,
                duration: 0.4,
            });

            gsap.to(item.scale, {
                x: isActive ? 1 : 0.9,
                y: isActive ? 1 : 0.9,
                duration: 0.4,
            });
        });

        // Update indicator
        this.indicator.children.forEach((dot, i) => {
            if (dot instanceof Graphics) {
                gsap.to(dot, {
                    pixi: { fillColor: i === index ? 0xffffff : 0x444444 },
                    duration: 0.3,
                });
            }
        });
    }

    /**
     * Handle horizontal scroll input with momentum
     */
    private handleHorizontalScroll(deltaX: number): void {
        if (this.isSnapping) return;

        // Add velocity based on scroll delta
        this.scrollVelocity += deltaX * this.SCROLL_SENSITIVITY;

        // Clamp velocity
        this.scrollVelocity = Math.max(-50, Math.min(50, this.scrollVelocity));

        console.log(`[Carousel] Scroll delta: ${deltaX.toFixed(1)}, velocity: ${this.scrollVelocity.toFixed(1)}`);
    }

    /**
     * Snap to the nearest card (called when scrolling stops)
     */
    private snapToNearestCard(): void {
        if (this.items.length === 0) return;

        this.isSnapping = true;

        // Calculate which card is closest to center
        const cardSpacing = this.ITEM_WIDTH + this.ITEM_GAP;
        const nearestIndex = Math.round(this.currentScrollX / cardSpacing);
        const clampedIndex = Math.max(0, Math.min(this.items.length - 1, nearestIndex));

        console.log(`[Carousel] Snapping to index: ${clampedIndex}`);

        // Animate to that card
        const targetX = clampedIndex * cardSpacing;

        gsap.to(this, {
            currentScrollX: targetX,
            duration: 0.5,
            ease: 'power2.out',
            onUpdate: () => {
                this.updateCardPositions();
            },
            onComplete: () => {
                this.isSnapping = false;
                this.currentIndex = clampedIndex;
                this.updateIndicator(clampedIndex);
            },
        });
    }

    /**
     * Update card positions based on currentScrollX
     */
    /**
     * Update card positions based on currentScrollX
     * Now moves the itemsContainer instead of items
     */
    private updateCardPositions(): void {
        const cardSpacing = this.ITEM_WIDTH + this.ITEM_GAP;

        // To center the current scroll position, we move itemsContainer left
        this.itemsContainer.position.x = -this.currentScrollX;

        // Update active states (scale/alpha)
        this.items.forEach((item, i) => {
            const itemX = i * cardSpacing;
            // Dist from center of screen (0 is center because itemsContainer is at -currentScrollX)
            const absoluteX = itemX - this.currentScrollX;

            const distFromCenter = Math.abs(absoluteX);
            const isActive = distFromCenter < cardSpacing / 2;

            item.alpha = isActive ? 1 : 0.4;
            item.scale.set(isActive ? 1 : 0.9);
        });

        // Update pagination dots based on scroll position
        const newIndex = Math.round(this.currentScrollX / cardSpacing);
        if (newIndex !== this.currentIndex && newIndex >= 0 && newIndex < this.items.length) {
            this.currentIndex = newIndex;
            this.updateIndicator(newIndex);
        }
    }

    /**
     * Update the dot indicator
     */
    private updateIndicator(index: number): void {
        this.indicator.children.forEach((dot, i) => {
            if (dot instanceof Graphics) {
                gsap.to(dot, {
                    pixi: { fillColor: i === index ? 0xffffff : 0x444444 },
                    duration: 0.3,
                });
            }
        });
    }

    public onEnter(): void {
        // Reset scroll state
        this.currentScrollX = 0;
        this._targetScrollX = 0;
        this.scrollVelocity = 0;
        this.currentIndex = 0;
        this.isSnapping = false;

        // Reset positions
        this.updateCardPositions();

        // Animate container in
        this.itemsContainer.alpha = 0;
        this.itemsContainer.position.y = 50;

        gsap.to(this.itemsContainer, {
            alpha: 1,
            y: 0,
            duration: 0.6,
            ease: 'power2.out'
        });

        // Staggered card animation
        this.items.forEach((item, i) => {
            item.alpha = 0;
            item.position.y = 30; // Local offset

            gsap.to(item, {
                alpha: i === 0 ? 1 : 0.4,
                duration: 0.5,
                delay: i * 0.1,
            });

            gsap.to(item.position, {
                y: 0,
                duration: 0.6,
                delay: i * 0.1,
                ease: 'power2.out',
            });

            gsap.to(item.scale, {
                x: i === 0 ? 1 : 0.9,
                y: i === 0 ? 1 : 0.9,
                duration: 0.4,
                delay: i * 0.1,
            });
        });

        console.log('[Carousel] Entered focus mode');
    }



    /**
     * Called when exiting focus mode
     */
    public onExit(): void {
        // Snap to nearest card before exiting
        if (!this.isSnapping && Math.abs(this.scrollVelocity) > 0.1) {
            this.snapToNearestCard();
        }
        console.log('[Carousel] Exiting focus mode');
    }

    /**
     * Per-frame update for smooth scrolling and physics
     */
    public update(_delta: number): void {
        if (this.isSnapping) return;

        // Apply velocity to scroll position
        if (Math.abs(this.scrollVelocity) > 0.5) {
            this.currentScrollX += this.scrollVelocity;

            // Clamp to bounds
            const maxScroll = (this.items.length - 1) * (this.ITEM_WIDTH + this.ITEM_GAP);
            this.currentScrollX = Math.max(0, Math.min(maxScroll, this.currentScrollX));

            // Apply friction
            this.scrollVelocity *= this.SCROLL_FRICTION;

            // Update positions
            this.updateCardPositions();
        } else if (Math.abs(this.scrollVelocity) > 0.1) {
            // Velocity is low, snap to nearest
            this.scrollVelocity = 0;
            this.snapToNearestCard();
        }
    }
}

