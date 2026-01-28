import { Application } from 'pixi.js';
import { gsap } from 'gsap';
import { worldConfig, Section } from './config';
import { Camera } from './core/Camera';
import { InputManager } from './core/InputManager';
import { StateManager, AppState } from './core/StateManager';
import { World } from './world/World';

/**
 * Calculate world bounds from sections
 */
function calculateWorldBounds(sections: Section[]): { minX: number; maxX: number; minY: number; maxY: number } {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const section of sections) {
        minX = Math.min(minX, section.worldCoordinates.x);
        maxX = Math.max(maxX, section.worldCoordinates.x);
        minY = Math.min(minY, section.worldCoordinates.y);
        maxY = Math.max(maxY, section.worldCoordinates.y);
    }

    return { minX, maxX, minY, maxY };
}

/**
 * Main Application Entry Point
 * Initializes PixiJS, camera system, and world rendering
 */
class PortfolioApp {
    private app!: Application;
    private camera!: Camera;
    private input!: InputManager;
    private stateManager!: StateManager;
    private world!: World;
    private container!: HTMLElement;

    constructor() {
        this.init();
    }

    private async init(): Promise<void> {
        // Get container
        this.container = document.getElementById('app')!;

        // Initialize PixiJS Application
        this.app = new Application();

        await this.app.init({
            background: 0x0a0a0a,
            resizeTo: window,
            antialias: true,
            resolution: Math.min(window.devicePixelRatio, 2),
            autoDensity: true,
        });

        // Add canvas to DOM
        this.container.appendChild(this.app.canvas);

        // Initialize systems
        this.stateManager = new StateManager();
        this.camera = new Camera(this.app, worldConfig.layout);
        this.input = new InputManager(this.app, this.camera, this.stateManager);
        this.world = new World(this.app, this.camera, this.stateManager, worldConfig);

        // Calculate dynamic minZoom to see entire world
        const worldBounds = calculateWorldBounds(worldConfig.sections);
        const dynamicMinZoom = this.camera.calculateMinZoom(worldBounds);
        this.camera.setMinZoom(dynamicMinZoom);

        // Add world to stage
        this.app.stage.addChild(this.world.container);

        // Setup resize handler
        this.setupResize();

        // Setup back button
        this.setupBackButton();

        // Start render loop
        this.app.ticker.add(this.update.bind(this));

        // Hide loader
        this.hideLoader();

        console.log('Portfolio initialized');
    }

    private setupResize(): void {
        window.addEventListener('resize', () => {
            this.camera.onResize(window.innerWidth, window.innerHeight);
            this.world.onResize(window.innerWidth, window.innerHeight);
        });
    }

    private setupBackButton(): void {
        const backButton = document.getElementById('back-button');
        if (backButton) {
            backButton.addEventListener('click', () => {
                this.stateManager.exitContentMode();
            });

            // Show/hide based on state
            this.stateManager.on('stateChange', (state: AppState) => {
                if (state === AppState.CONTENT) {
                    backButton.classList.add('visible');
                } else {
                    backButton.classList.remove('visible');
                }
            });
        }
    }

    private hideLoader(): void {
        const loader = document.getElementById('loader');
        if (loader) {
            gsap.to(loader, {
                opacity: 0,
                duration: 0.8,
                ease: 'power2.out',
                onComplete: () => {
                    loader.classList.add('hidden');
                },
            });
        }
    }

    private update(ticker: { deltaTime: number }): void {
        const delta = ticker.deltaTime / 60; // Normalize to seconds

        this.camera.update(delta);
        this.input.update(delta);
        this.world.update(delta);

        // Apply camera transform to world
        this.world.container.position.set(
            this.camera.position.x + window.innerWidth / 2,
            this.camera.position.y + window.innerHeight / 2
        );
        this.world.container.scale.set(this.camera.zoom);

        // Apply perspective tilt (projection-based skew)
        const skew = this.camera.getSkewFromRotation();
        this.world.container.skew.set(skew.x, skew.y);
    }
}

// Start application
new PortfolioApp();
