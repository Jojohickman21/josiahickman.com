import { Application, Container, Graphics, Filter } from 'pixi.js';
import { Camera } from '../core/Camera';
import { StateManager } from '../core/StateManager';
import { WorldConfig, ProjectItem } from '../config';
import { Slide } from './Slide';
import { HeroSlide } from './HeroSlide';
import { CarouselSlide } from './CarouselSlide';
import { ContentSlide } from './ContentSlide';
import { NavSlide } from './NavSlide';
import { NowSlide } from './NowSlide';
import { DetailReader } from './DetailReader';

/**
 * World
 * Main world container that holds all slides and effects
 */
export class World {
    public container: Container;

    private app: Application;
    private camera: Camera;
    private stateManager: StateManager;
    private config: WorldConfig;
    private slides: Map<string, Slide> = new Map();
    private grid: Graphics;
    private background: Container;
    private grainFilter: Filter | null = null;
    private time: number = 0;
    private detailReader: DetailReader;

    constructor(
        app: Application,
        camera: Camera,
        stateManager: StateManager,
        config: WorldConfig
    ) {
        this.app = app;
        this.camera = camera;
        this.stateManager = stateManager;
        this.config = config;

        this.container = new Container();
        this.background = new Container();
        this.grid = new Graphics();
        this.detailReader = new DetailReader(stateManager);

        this.init();
    }

    private init(): void {
        // Create background
        this.createBackground();

        // Create debug grid
        this.createGrid();

        // Create slides from config
        this.createSlides();

        // Listen for state changes
        this.setupListeners();

        // Apply grain shader
        this.applyGrainShader();
    }

    private createBackground(): void {
        // Create large dark background
        const bg = new Graphics();
        bg.rect(-10000, -10000, 20000, 20000);
        bg.fill({ color: 0x0a0a0a });

        this.background.addChild(bg);
        this.container.addChild(this.background);
    }

    private createGrid(): void {
        const gridSize = this.config.layout.gridSize;
        const cellSize = gridSize / 4;
        const extent = 5; // Grid extends 5 cells in each direction

        this.grid.clear();

        // Draw grid lines
        for (let i = -extent; i <= extent; i++) {
            const offset = i * cellSize;

            // Vertical lines
            this.grid.moveTo(offset, -extent * cellSize);
            this.grid.lineTo(offset, extent * cellSize);
            this.grid.stroke({ width: 1, color: 0x1a1a1a, alpha: 0.5 });

            // Horizontal lines
            this.grid.moveTo(-extent * cellSize, offset);
            this.grid.lineTo(extent * cellSize, offset);
            this.grid.stroke({ width: 1, color: 0x1a1a1a, alpha: 0.5 });
        }

        // Draw dots at intersections
        for (let i = -extent; i <= extent; i++) {
            for (let j = -extent; j <= extent; j++) {
                this.grid.circle(i * cellSize, j * cellSize, 3);
                this.grid.fill({ color: 0x2a2a2a, alpha: 0.8 });
            }
        }

        this.container.addChild(this.grid);
    }

    private createSlides(): void {
        const slideContainer = new Container();
        slideContainer.label = 'slideContainer';

        console.log('Creating slides from config:', this.config.sections.length, 'sections');

        for (const section of this.config.sections) {
            let slide: Slide;

            switch (section.type) {
                case 'hero':
                    slide = new HeroSlide(section, this.app, this.stateManager);
                    break;
                case 'carousel':
                    slide = new CarouselSlide(section, this.app, this.stateManager);
                    break;
                case 'nav':
                    slide = new NavSlide(section, this.app);
                    break;
                case 'now':
                    slide = new NowSlide(section, this.app);
                    break;
                case 'content':
                case 'writings':
                default:
                    slide = new ContentSlide(section, this.app, this.stateManager);
                    break;
            }

            slide.container.position.set(
                section.worldCoordinates.x,
                section.worldCoordinates.y
            );

            // Debug: force visibility
            slide.container.visible = true;
            slide.container.alpha = 1;

            console.log(`Created slide: ${section.id} at (${section.worldCoordinates.x}, ${section.worldCoordinates.y})`,
                'children:', slide.container.children.length,
                'visible:', slide.container.visible);

            this.slides.set(section.id, slide);
            slideContainer.addChild(slide.container);
        }

        console.log('SlideContainer children:', slideContainer.children.length);
        console.log('World container children before:', this.container.children.length);

        this.container.addChild(slideContainer);

        console.log('World container children after:', this.container.children.length);
    }

    private setupListeners(): void {
        // Handle double-click to enter content mode
        this.stateManager.on('doubleClick', (worldPos: { x: number; y: number }) => {
            const hitSlide = this.getSlideAtPosition(worldPos.x, worldPos.y);
            if (hitSlide) {
                this.enterSlide(hitSlide);
            }
        });

        // Handle exiting content mode
        this.stateManager.on('exitContent', () => {
            // Call onExit on current slide (for carousel snapping)
            const currentSlide = this.slides.get(this.stateManager.currentSlideId || '');
            if (currentSlide && typeof (currentSlide as CarouselSlide).onExit === 'function') {
                (currentSlide as CarouselSlide).onExit();
            }

            // Animate camera back to navigation view
            this.camera.animateToNavigation();
        });

        // Handle card click to open detail view
        this.stateManager.on('cardClick', (
            item: ProjectItem,
            sourceRect: { x: number; y: number; width: number; height: number },
            heroColor: number
        ) => {
            this.detailReader.open(item, sourceRect, heroColor);
        });

        // Content scroll is now handled directly by CarouselSlide via stateManager.on('contentScroll')

        // Handle unfold from hero slide
        this.stateManager.on('unfoldWorld', () => {
            console.log('[World] Unfold triggered - zooming to navigation view');
            this.camera.animateToNavigation();
        });
    }

    private applyGrainShader(): void {
        // Grain shader disabled
        return;
    }

    /**
     * Find which slide is at a given world position
     */
    private getSlideAtPosition(x: number, y: number): Slide | null {
        for (const slide of this.slides.values()) {
            const bounds = slide.getBounds();
            if (
                x >= bounds.x &&
                x <= bounds.x + bounds.width &&
                y >= bounds.y &&
                y <= bounds.y + bounds.height
            ) {
                return slide;
            }
        }
        return null;
    }

    /**
     * Enter a specific slide (transition to content mode)
     * Calculates best-fit zoom so slide fills screen with 10% margin
     */
    private async enterSlide(slide: Slide): Promise<void> {
        // 1. Get slide dimensions
        const bounds = slide.getBounds();
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;

        // 2. Calculate "Best Fit" ratio (with 10% margin)
        const scaleX = screenW / bounds.width;
        const scaleY = screenH / bounds.height;
        const bestFitScale = Math.min(scaleX, scaleY) * 0.9;

        // 3. Calculate center
        const centerX = bounds.x + (bounds.width / 2);
        const centerY = bounds.y + (bounds.height / 2);

        console.log(`Entering slide: ${slide.section.id}`);
        console.log(`  Bounds: ${bounds.width}x${bounds.height}`);
        console.log(`  Screen: ${screenW}x${screenH}`);
        console.log(`  Best fit scale: ${bestFitScale.toFixed(3)}`);
        console.log(`  Center: (${centerX}, ${centerY})`);

        // 4. Animate camera to slide center with best-fit zoom
        await this.camera.animateTo(
            centerX,
            centerY,
            bestFitScale,
            1.0  // Duration in seconds
        );

        // 5. Enter content mode ONLY after animation finishes
        this.stateManager.enterContentMode(slide.section.id);

        // 6. Trigger slide enter animation
        slide.onEnter();
    }

    /**
     * Frustum culling - hide slides that are off-screen
     */
    private updateCulling(): void {
        const margin = 2000; // Large margin to ensure visibility during debug

        // Camera position is the offset from center, so world origin (0,0) appears at -camera.position
        // Calculate the visible world bounds
        const halfWidth = window.innerWidth / 2 / this.camera.zoom;
        const halfHeight = window.innerHeight / 2 / this.camera.zoom;

        // World position that's at the center of screen
        const centerWorldX = -this.camera.position.x / this.camera.zoom;
        const centerWorldY = -this.camera.position.y / this.camera.zoom;

        const viewBounds = {
            left: centerWorldX - halfWidth - margin,
            right: centerWorldX + halfWidth + margin,
            top: centerWorldY - halfHeight - margin,
            bottom: centerWorldY + halfHeight + margin,
        };

        for (const slide of this.slides.values()) {
            const bounds = slide.getBounds();
            const visible = !(
                bounds.x + bounds.width < viewBounds.left ||
                bounds.x > viewBounds.right ||
                bounds.y + bounds.height < viewBounds.top ||
                bounds.y > viewBounds.bottom
            );

            slide.container.visible = visible;
        }
    }

    /**
     * Handle window resize
     */
    public onResize(width: number, height: number): void {
        // Re-center grid on resize if needed
        console.log(`World resize: ${width}x${height}`);
    }

    /**
     * Update world (called every frame)
     */
    public update(delta: number): void {
        this.time += delta;

        // Update grain shader time
        if (this.grainFilter) {
            const uniforms = this.grainFilter.resources.grainUniforms as { uTime: { value: number } };
            uniforms.uTime.value = this.time;
        }

        // Update culling
        this.updateCulling();

        // Update all visible slides
        for (const slide of this.slides.values()) {
            if (slide.container.visible) {
                slide.update(delta);
            }
        }
    }
}
