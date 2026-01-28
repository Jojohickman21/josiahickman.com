import { Application, Container, Graphics } from 'pixi.js';
import { Section } from '../config';

/**
 * Slide
 * Base class for all slide types in the world
 */
export abstract class Slide {
    public container: Container;
    public section: Section;
    protected app: Application;
    protected width: number = 1600;
    protected height: number = 900;
    protected background: Graphics;

    constructor(section: Section, app: Application) {
        this.section = section;
        this.app = app;
        this.container = new Container();
        this.background = new Graphics();

        this.createBackground();
    }

    protected createBackground(): void {
        // Visible dark background with good contrast
        this.background.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 8);
        this.background.fill({ color: 0x222222 }); // Visible grey

        // Visible border
        this.background.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 8);
        this.background.stroke({ width: 1, color: 0x444444 }); // Visible border

        this.container.addChild(this.background);

        // Make interactive for click detection
        this.container.eventMode = 'static';
        this.container.cursor = 'pointer';
    }

    /**
     * Get world-space bounds of this slide
     */
    public getBounds(): { x: number; y: number; width: number; height: number } {
        return {
            x: this.section.worldCoordinates.x - this.width / 2,
            y: this.section.worldCoordinates.y - this.height / 2,
            width: this.width,
            height: this.height,
        };
    }

    /**
     * Called when camera focuses on this slide
     */
    public onEnter(): void {
        // Override in subclasses for entry animations
    }

    /**
     * Called when camera exits this slide
     */
    public onExit(): void {
        // Override in subclasses for exit cleanup
    }

    /**
     * Update (called every frame when visible)
     */
    public update(delta: number): void {
        // Override in subclasses for animations
    }
}
