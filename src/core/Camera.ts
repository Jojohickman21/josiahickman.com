import { Application } from 'pixi.js';
import { gsap } from 'gsap';
import { LayoutConfig } from '../config';

/**
 * Camera
 * Handles viewport position, zoom, and perspective projection
 * Uses a 3D projection matrix approach for proper depth distortion
 */
export class Camera {
    public position: { x: number; y: number } = { x: 0, y: 0 };
    public targetPosition: { x: number; y: number } = { x: 0, y: 0 };
    public velocity: { x: number; y: number } = { x: 0, y: 0 };
    public zoom: number = 1;
    public targetZoom: number = 1;
    public tilt: { x: number; y: number } = { x: 0, y: 0 };
    public targetTilt: { x: number; y: number } = { x: 0, y: 0 };

    // Perspective projection values
    public perspective: number = 1000;
    public rotateX: number = 0;
    public rotateY: number = 0;
    public targetRotateX: number = 0;
    public targetRotateY: number = 0;

    private app: Application;
    private config: LayoutConfig;
    private isDragging: boolean = false;
    private isTransitioning: boolean = false;

    // Debounced resize
    private resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    private readonly RESIZE_DEBOUNCE_MS = 150;

    constructor(app: Application, config: LayoutConfig) {
        this.app = app;
        this.config = config;
        this.perspective = config.perspective;
    }

    /**
     * Apply momentum from drag release
     */
    public applyMomentum(vx: number, vy: number): void {
        if (this.isTransitioning) return;
        this.velocity.x = vx;
        this.velocity.y = vy;
    }

    /**
     * Pan the camera by delta amount
     */
    public pan(dx: number, dy: number): void {
        if (this.isTransitioning) return;
        this.position.x += dx;
        this.position.y += dy;
        this.targetPosition.x = this.position.x;
        this.targetPosition.y = this.position.y;
    }

    /**
     * Zoom by delta amount at a specific point (zooms toward cursor)
     * Uses smoother physics with reduced speed
     */
    public zoomBy(delta: number, centerX?: number, centerY?: number): void {
        if (this.isTransitioning) return;

        const oldZoom = this.targetZoom;

        // Smoother zoom: lower multiplier for gentler response
        const zoomPercent = 0.05; // Reduced from 0.1 for slower, smoother zoom
        const zoomDelta = delta * this.config.zoomSpeed * -50 * zoomPercent;

        this.targetZoom = Math.max(
            this.config.minZoom,
            Math.min(this.config.maxZoom, this.targetZoom + zoomDelta)
        );

        // Zoom toward cursor position (NOT toward 0,0)
        // Only apply if cursor position is provided
        if (centerX !== undefined && centerY !== undefined) {
            const zoomFactor = this.targetZoom / oldZoom;

            // Convert cursor screen position to world position
            const worldX = (centerX - window.innerWidth / 2 - this.position.x) / oldZoom;
            const worldY = (centerY - window.innerHeight / 2 - this.position.y) / oldZoom;

            // Adjust camera position to keep cursor point stationary
            this.targetPosition.x -= worldX * (zoomFactor - 1) * oldZoom;
            this.targetPosition.y -= worldY * (zoomFactor - 1) * oldZoom;
        }
        // If no cursor position provided, zoom is centered (no position adjustment)
    }

    /**
     * Set 3D rotation for perspective effect (projection-based)
     * Values are in degrees, converted to radians for the projection matrix
     */
    public setRotation(x: number, y: number): void {
        if (this.isTransitioning) return;
        // Clamp rotation to prevent extreme distortion
        const maxAngle = this.config.tiltAmount;
        this.targetRotateX = Math.max(-maxAngle, Math.min(maxAngle, x * maxAngle * 0.5));
        this.targetRotateY = Math.max(-maxAngle, Math.min(maxAngle, y * maxAngle * 0.5));
    }

    /**
     * Reset rotation to zero
     */
    public resetRotation(): void {
        this.targetRotateX = 0;
        this.targetRotateY = 0;
    }

    /**
     * Legacy tilt (for backwards compatibility)
     */
    public setTilt(x: number, y: number): void {
        this.setRotation(x, y);
    }

    public resetTilt(): void {
        this.resetRotation();
    }

    /**
     * Set dragging state
     */
    public setDragging(dragging: boolean): void {
        this.isDragging = dragging;
        if (dragging) {
            this.velocity.x = 0;
            this.velocity.y = 0;
        }
    }

    /**
     * Get the CSS transform matrix for 3D perspective projection
     * This creates a proper perspective transform rather than simple skew
     */
    public getCSSPerspectiveTransform(): string {
        const rotX = this.rotateX * (Math.PI / 180);
        const rotY = this.rotateY * (Math.PI / 180);

        return `perspective(${this.perspective}px) rotateX(${rotX}rad) rotateY(${rotY}rad)`;
    }

    /**
     * Get skew values derived from rotation (for PixiJS container)
     * This approximates 3D rotation as 2D skew for the PixiJS stage
     */
    public getSkewFromRotation(): { x: number; y: number } {
        // Convert rotation angles to skew values
        // Using sine for more natural perspective-like distortion
        const skewFactor = 0.0015;
        return {
            x: Math.sin(this.rotateY * Math.PI / 180) * skewFactor,
            y: Math.sin(this.rotateX * Math.PI / 180) * skewFactor,
        };
    }

    /**
     * Animate camera to specific world coordinates (for locking onto slides)
     * Uses Power3.inOut for premium cinematic feel
     * CRITICAL: Properly centers on the slide center point
     */
    public animateTo(
        worldX: number,
        worldY: number,
        zoom: number = 1.5,
        duration: number = 1.2
    ): Promise<void> {
        return new Promise((resolve) => {
            this.isTransitioning = true;

            // 1. Kill all current movement/momentum
            this.velocity.x = 0;
            this.velocity.y = 0;
            this.isDragging = false;

            // Calculate target position to center the world point on screen
            // Camera position is inverted: to show worldX,worldY at center,
            // we need position = -worldX * zoom, adjusted for viewport center
            const targetX = -worldX * zoom;
            const targetY = -worldY * zoom;

            // Animate position properties separately to avoid GSAP nested object issues
            gsap.to(this.position, {
                duration,
                ease: 'power3.inOut',
                x: targetX,
                y: targetY,
                onUpdate: () => {
                    // Keep target in sync during animation
                    this.targetPosition.x = this.position.x;
                    this.targetPosition.y = this.position.y;
                },
            });

            gsap.to(this, {
                duration,
                ease: 'power3.inOut',
                zoom,
                targetZoom: zoom,
                onComplete: () => {
                    // Final sync to kill any drift
                    this.velocity.x = 0;
                    this.velocity.y = 0;
                    this.targetPosition.x = this.position.x;
                    this.targetPosition.y = this.position.y;
                    this.isTransitioning = false;
                    resolve();
                },
            });
        });
    }

    /**
     * Zoom out to navigation/world view (surface transition)
     * CRITICAL: Zooms from CURRENT center position, not mouse
     * Prevents the "sling-shot" effect by killing velocity and syncing position
     */
    public animateToNavigation(duration: number = 1.2): Promise<void> {
        return new Promise((resolve) => {
            this.isTransitioning = true;

            // 1. Kill all current movement/momentum IMMEDIATELY
            this.velocity.x = 0;
            this.velocity.y = 0;
            this.isDragging = false;

            // 2. Store original zoom to calculate position adjustment
            const originalZoom = this.zoom;
            const targetZoom = 0.5;

            // 3. Get current world center position
            // We want to keep the same world point centered during zoom-out
            const currentWorldCenterX = -this.position.x / originalZoom;
            const currentWorldCenterY = -this.position.y / originalZoom;

            // 4. Calculate target position to keep same world center
            const targetX = -currentWorldCenterX * targetZoom;
            const targetY = -currentWorldCenterY * targetZoom;

            console.log(`Exit transition: zooming from ${originalZoom.toFixed(2)} to ${targetZoom}`);
            console.log(`  World center: (${currentWorldCenterX.toFixed(0)}, ${currentWorldCenterY.toFixed(0)})`);

            // 5. Animate position and zoom together (keeps center stable)
            gsap.to(this.position, {
                duration,
                ease: 'power3.inOut',
                x: targetX,
                y: targetY,
                onUpdate: () => {
                    this.targetPosition.x = this.position.x;
                    this.targetPosition.y = this.position.y;
                },
            });

            gsap.to(this, {
                duration,
                ease: 'power3.inOut',
                zoom: targetZoom,
                targetZoom: targetZoom,
                onComplete: () => {
                    // 6. Final velocity kill to prevent any drift
                    this.velocity.x = 0;
                    this.velocity.y = 0;
                    this.targetPosition.x = this.position.x;
                    this.targetPosition.y = this.position.y;

                    this.isTransitioning = false;
                    console.log('Exit transition complete');
                    resolve();
                },
            });
        });
    }

    /**
     * Screen to world coordinates
     */
    public screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
        return {
            x: (screenX - window.innerWidth / 2 - this.position.x) / this.zoom,
            y: (screenY - window.innerHeight / 2 - this.position.y) / this.zoom,
        };
    }

    /**
     * World to screen coordinates
     */
    public worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
        return {
            x: worldX * this.zoom + this.position.x + window.innerWidth / 2,
            y: worldY * this.zoom + this.position.y + window.innerHeight / 2,
        };
    }

    /**
     * Handle window resize (debounced)
     */
    public onResize(width: number, height: number): void {
        // Clear existing timeout
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }

        // Debounce the resize handling
        this.resizeTimeout = setTimeout(() => {
            // Recalculate any viewport-dependent values
            this.targetPosition.x = this.position.x;
            this.targetPosition.y = this.position.y;

            console.log(`Camera resize: ${width}x${height}`);
        }, this.RESIZE_DEBOUNCE_MS);
    }

    /**
     * Calculate dynamic minZoom to fit entire world with margin
     * Call this after world is initialized with section positions
     */
    public calculateMinZoom(worldBounds: { minX: number; maxX: number; minY: number; maxY: number }): number {
        const margin = 0.1; // 10% margin on edges
        const worldWidth = worldBounds.maxX - worldBounds.minX;
        const worldHeight = worldBounds.maxY - worldBounds.minY;

        // Add slide dimensions (approx 1600 width, 900 height)
        const totalWidth = worldWidth + 1600;
        const totalHeight = worldHeight + 900;

        // Calculate zoom needed to fit with margin
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const scaleX = viewportWidth / (totalWidth * (1 + margin * 2));
        const scaleY = viewportHeight / (totalHeight * (1 + margin * 2));

        // Use the smaller scale to ensure entire world fits
        const fitScale = Math.min(scaleX, scaleY);

        // Clamp to reasonable minimum
        return Math.max(0.1, Math.min(0.5, fitScale));
    }

    /**
     * Update zoom constraints with new minZoom
     */
    public setMinZoom(minZoom: number): void {
        this.config.minZoom = minZoom;
        // If current zoom is below new minimum, adjust
        if (this.targetZoom < minZoom) {
            this.targetZoom = minZoom;
        }
        console.log(`Camera minZoom set to: ${minZoom.toFixed(3)}`);
    }

    /**
     * Update camera (called every frame)
     */
    public update(delta: number): void {
        const friction = this.config.friction;
        const positionSmoothing = 0.15;
        const zoomSmoothing = 0.08; // Lower = smoother, less snappy zoom

        // Apply friction to velocity if not dragging
        if (!this.isDragging && !this.isTransitioning) {
            this.velocity.x *= friction;
            this.velocity.y *= friction;

            // Apply velocity to position
            this.position.x += this.velocity.x * delta * 60;
            this.position.y += this.velocity.y * delta * 60;

            // Update target to match
            this.targetPosition.x = this.position.x;
            this.targetPosition.y = this.position.y;

            // Stop when velocity is negligible
            if (Math.abs(this.velocity.x) < 0.01) this.velocity.x = 0;
            if (Math.abs(this.velocity.y) < 0.01) this.velocity.y = 0;
        }

        // Smooth zoom interpolation (gentler for premium feel)
        this.zoom += (this.targetZoom - this.zoom) * zoomSmoothing;

        // Smooth rotation interpolation (for perspective effect)
        this.rotateX += (this.targetRotateX - this.rotateX) * positionSmoothing;
        this.rotateY += (this.targetRotateY - this.rotateY) * positionSmoothing;

        // Legacy tilt for backwards compatibility
        this.tilt.x = this.rotateX;
        this.tilt.y = this.rotateY;
    }

    /**
     * Check if currently in a transition
     */
    public get transitioning(): boolean {
        return this.isTransitioning;
    }
}
