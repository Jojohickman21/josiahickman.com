import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { gsap } from 'gsap';
import { Section } from '../config';
import { Slide } from './Slide';
import { StateManager } from '../core/StateManager';

/**
 * Scatter configuration for floating images
 */
interface ScatterItem {
    x: number;      // 0-1 relative position
    y: number;      // 0-1 relative position
    scale: number;
    layer: 'back' | 'front';
    color: number;  // Placeholder color
}

const scatterConfig: ScatterItem[] = [
    { x: 0.15, y: 0.25, scale: 0.9, layer: 'back', color: 0x2a2a3d },
    { x: 0.85, y: 0.35, scale: 1.1, layer: 'front', color: 0x3d2a2a },
    { x: 0.25, y: 0.70, scale: 0.7, layer: 'back', color: 0x2a3d2a },
    { x: 0.75, y: 0.65, scale: 0.85, layer: 'front', color: 0x3d3d2a },
    { x: 0.50, y: 0.45, scale: 0.5, layer: 'front', color: 0x2a3d3d },
    { x: 0.10, y: 0.55, scale: 0.6, layer: 'back', color: 0x3d2a3d },
];

/**
 * HeroSlide - "Hero Collage" Redesign
 * Premium parallax scene with floating images, filmstrip, and mouse tracking
 */
export class HeroSlide extends Slide {
    private stateManager?: StateManager;

    // Parallax Layers
    private layerBack: Container;
    private layerMiddle: Container;
    private layerFront: Container;

    // Content
    private centralText: Text;
    private floatingImages: Graphics[] = [];
    private filmstripContainer: Container;
    private filmstripItems: Graphics[] = [];
    private unfoldButton: Container;

    // Mouse tracking
    private mouseX: number = 0;
    private mouseY: number = 0;
    private targetMouseX: number = 0;
    private targetMouseY: number = 0;

    // Animation
    private filmstripOffset: number = 0;

    constructor(section: Section, app: Application, stateManager?: StateManager) {
        super(section, app);
        this.stateManager = stateManager;

        this.width = 1800;
        this.height = 1000;

        // Recreate background
        this.background.clear();
        this.background.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 12);
        this.background.fill({ color: 0x0a0a0a });
        this.background.stroke({ width: 1, color: 0x1a1a1a });

        // Create parallax layers
        this.layerBack = new Container();
        this.layerMiddle = new Container();
        this.layerFront = new Container();

        this.container.addChild(this.layerBack);
        this.container.addChild(this.layerMiddle);
        this.container.addChild(this.layerFront);

        // Create content in layers
        this.createFloatingImages();
        this.centralText = this.createCentralTypography();
        this.filmstripContainer = this.createFilmstrip();
        this.unfoldButton = this.createUnfoldButton();

        // Add to layers
        this.layerMiddle.addChild(this.centralText);
        this.layerMiddle.addChild(this.unfoldButton);
        this.container.addChild(this.filmstripContainer);

        // Setup mouse tracking
        this.setupMouseTracking();

        // Play intro animation
        this.playIntroAnimation();
    }

    /**
     * Create the massive central typography
     */
    private createCentralTypography(): Text {
        const style = new TextStyle({
            fontFamily: 'Playfair Display, Georgia, serif',
            fontSize: 180,
            fontWeight: '900',
            fill: '#f5f5f5',
            letterSpacing: -4,
        });

        const text = new Text({
            text: this.section.content?.heading || 'CREATIVE',
            style,
        });

        text.anchor.set(0.5, 0.5);
        text.position.set(0, -50);

        // Blend mode for images bleeding through (PixiJS v8 uses string)
        text.blendMode = 'add';

        return text;
    }

    /**
     * Create floating images scattered around the text
     */
    private createFloatingImages(): void {
        scatterConfig.forEach((config) => {
            const image = new Graphics();

            // Create placeholder rectangle (would be replaced with actual images)
            const imgWidth = 200 * config.scale;
            const imgHeight = 280 * config.scale;

            image.roundRect(-imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight, 8);
            image.fill({ color: config.color });

            // Position relative to slide bounds
            const x = (config.x - 0.5) * this.width;
            const y = (config.y - 0.5) * this.height;
            image.position.set(x, y);

            // Slight transparency for layering effect
            image.alpha = 0.85;

            // Add to appropriate layer
            if (config.layer === 'back') {
                this.layerBack.addChild(image);
            } else {
                this.layerFront.addChild(image);
            }

            this.floatingImages.push(image);
        });
    }

    /**
     * Create the footer filmstrip with scrolling thumbnails
     */
    private createFilmstrip(): Container {
        const filmstrip = new Container();
        filmstrip.position.set(0, this.height / 2 - 80);

        const itemCount = 20;
        const itemWidth = 60;
        const itemHeight = 80;
        const gap = 10;
        const totalWidth = itemCount * (itemWidth + gap);

        // Create items (doubled for infinite scroll)
        for (let i = 0; i < itemCount * 2; i++) {
            const item = new Graphics();
            item.roundRect(0, 0, itemWidth, itemHeight, 4);
            item.fill({ color: 0x1a1a1a + (i % 5) * 0x080808 });
            item.stroke({ width: 1, color: 0x2a2a2a });

            item.position.set(i * (itemWidth + gap) - totalWidth, -itemHeight / 2);
            item.alpha = 0.6;

            filmstrip.addChild(item);
            this.filmstripItems.push(item);
        }

        return filmstrip;
    }

    /**
     * Create the "Scroll to Unfold" button
     */
    private createUnfoldButton(): Container {
        const button = new Container();
        button.position.set(0, this.height / 2 - 160);

        // Text
        const textStyle = new TextStyle({
            fontFamily: 'Inter, -apple-system, sans-serif',
            fontSize: 12,
            fontWeight: '500',
            fill: '#666666',
            letterSpacing: 3,
        });

        const text = new Text({
            text: 'SCROLL TO UNFOLD',
            style: textStyle,
        });
        text.anchor.set(0.5, 0.5);
        text.position.set(0, -20);
        button.addChild(text);

        // Animated arrow
        const arrow = new Graphics();
        arrow.moveTo(0, 0);
        arrow.lineTo(-8, -8);
        arrow.moveTo(0, 0);
        arrow.lineTo(8, -8);
        arrow.stroke({ width: 1.5, color: 0x666666 });
        arrow.position.set(0, 10);
        button.addChild(arrow);

        // Animate arrow
        gsap.to(arrow.position, {
            y: 18,
            duration: 1,
            ease: 'power1.inOut',
            yoyo: true,
            repeat: -1,
        });

        // Make interactive
        button.eventMode = 'static';
        button.cursor = 'pointer';
        button.hitArea = { contains: (x: number, y: number) => Math.abs(x) < 100 && Math.abs(y) < 40 };

        button.on('pointertap', () => {
            this.handleUnfold();
        });

        // Hover effect
        button.on('pointerover', () => {
            gsap.to(text.style, { fill: '#ffffff', duration: 0.2 });
        });

        button.on('pointerout', () => {
            gsap.to(text.style, { fill: '#666666', duration: 0.2 });
        });

        return button;
    }

    /**
     * Setup mouse tracking for parallax effect
     */
    private setupMouseTracking(): void {
        // Track mouse relative to center
        this.app.canvas.addEventListener('mousemove', (e) => {
            const rect = this.app.canvas.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            this.targetMouseX = (e.clientX - rect.left - centerX) / centerX;
            this.targetMouseY = (e.clientY - rect.top - centerY) / centerY;
        });
    }

    /**
     * Handle unfold button click - zoom out to world view
     */
    private handleUnfold(): void {
        if (this.stateManager) {
            this.stateManager.emit('unfoldWorld');
        }
        console.log('[HeroSlide] Unfold triggered');
    }

    /**
     * Play intro animation
     */
    private playIntroAnimation(): void {
        // Reset states
        this.centralText.alpha = 0;
        this.centralText.scale.set(0.9);

        this.floatingImages.forEach((img) => {
            img.alpha = 0;
        });

        this.unfoldButton.alpha = 0;
        this.filmstripContainer.alpha = 0;

        // Central text
        gsap.to(this.centralText, {
            alpha: 1,
            duration: 1.2,
            ease: 'power2.out',
            delay: 0.2,
        });

        gsap.to(this.centralText.scale, {
            x: 1,
            y: 1,
            duration: 1.5,
            ease: 'power3.out',
            delay: 0.2,
        });

        // Floating images staggered
        this.floatingImages.forEach((img, i) => {
            gsap.to(img, {
                alpha: 0.85,
                duration: 0.8,
                ease: 'power2.out',
                delay: 0.4 + i * 0.1,
            });
        });

        // Unfold button
        gsap.to(this.unfoldButton, {
            alpha: 1,
            duration: 0.6,
            ease: 'power2.out',
            delay: 1,
        });

        // Filmstrip
        gsap.to(this.filmstripContainer, {
            alpha: 1,
            duration: 0.8,
            ease: 'power2.out',
            delay: 1.2,
        });
    }

    public onEnter(): void {
        this.playIntroAnimation();
    }

    public update(delta: number): void {
        // Smooth mouse tracking
        this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
        this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

        // Apply parallax to layers
        const backFactor = 20;
        const frontFactor = 60;

        this.layerBack.position.set(
            -this.mouseX * backFactor,
            -this.mouseY * backFactor
        );

        this.layerFront.position.set(
            -this.mouseX * frontFactor,
            -this.mouseY * frontFactor
        );

        // Filmstrip infinite scroll
        this.filmstripOffset += 0.3;
        const itemWidth = 70; // item + gap
        const resetPoint = 20 * itemWidth; // total items * width

        this.filmstripItems.forEach((item, i) => {
            let x = (i * itemWidth) - this.filmstripOffset;

            // Wrap around
            while (x < -this.width / 2 - itemWidth) {
                x += resetPoint;
            }
            while (x > this.width / 2 + resetPoint - itemWidth) {
                x -= resetPoint;
            }

            item.position.x = x;
        });

        // Subtle floating for central text
        const time = performance.now() / 1000;
        this.centralText.position.y = -50 + Math.sin(time * 0.5) * 3;
    }
}
