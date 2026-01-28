import { Application } from 'pixi.js';
import { Camera } from './Camera';
import { StateManager, AppState } from './StateManager';

/**
 * InputManager
 * Handles all user input: mouse, touch, keyboard, scroll
 */
export class InputManager {
    private app: Application;
    private camera: Camera;
    private stateManager: StateManager;

    // Drag state
    private isDragging: boolean = false;
    private dragStart: { x: number; y: number } = { x: 0, y: 0 };
    private lastDragPos: { x: number; y: number } = { x: 0, y: 0 };
    private dragVelocity: { x: number; y: number } = { x: 0, y: 0 };
    private velocityHistory: Array<{ x: number; y: number; t: number }> = [];

    // Click detection
    private clickStart: { x: number; y: number; t: number } | null = null;
    private lastClickTime: number = 0;
    private readonly CLICK_THRESHOLD = 5; // 5px threshold: < 5px = click, >= 5px = drag
    private readonly DOUBLE_CLICK_THRESHOLD = 300;

    // Keyboard state
    private keys: Set<string> = new Set();

    // Mouse position for parallax
    public mousePosition: { x: number; y: number } = { x: 0, y: 0 };

    // Drag pause for carousel event trapping
    private dragPaused: boolean = false;

    constructor(app: Application, camera: Camera, stateManager: StateManager) {
        this.app = app;
        this.camera = camera;
        this.stateManager = stateManager;

        this.setupMouseEvents();
        this.setupKeyboardEvents();
        this.setupWheelEvents();
        this.setupTouchEvents();
    }

    private setupMouseEvents(): void {
        const canvas = this.app.canvas;

        canvas.addEventListener('mousedown', this.onPointerDown.bind(this));
        canvas.addEventListener('mousemove', this.onPointerMove.bind(this));
        canvas.addEventListener('mouseup', this.onPointerUp.bind(this));
        canvas.addEventListener('mouseleave', this.onPointerUp.bind(this));
    }

    private setupTouchEvents(): void {
        const canvas = this.app.canvas;

        canvas.addEventListener('touchstart', (e: TouchEvent) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.onPointerDown({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
        });

        canvas.addEventListener('touchmove', (e: TouchEvent) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.onPointerMove({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
        });

        canvas.addEventListener('touchend', () => {
            this.onPointerUp({} as MouseEvent);
        });
    }

    private setupKeyboardEvents(): void {
        window.addEventListener('keydown', (e: KeyboardEvent) => {
            this.keys.add(e.key);

            // Handle arrow key panning with tilt
            if (this.stateManager.state === AppState.NAVIGATION) {
                const tiltX = (this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('ArrowLeft') ? 1 : 0);
                const tiltY = (this.keys.has('ArrowDown') ? 1 : 0) - (this.keys.has('ArrowUp') ? 1 : 0);
                this.camera.setTilt(tiltX, tiltY);
            }

            // Escape to exit content mode
            if (e.key === 'Escape' && this.stateManager.state === AppState.CONTENT) {
                this.stateManager.exitContentMode();
            }
        });

        window.addEventListener('keyup', (e: KeyboardEvent) => {
            this.keys.delete(e.key);

            // Reset tilt when no arrow keys pressed
            if (!this.keys.has('ArrowRight') && !this.keys.has('ArrowLeft') &&
                !this.keys.has('ArrowUp') && !this.keys.has('ArrowDown')) {
                this.camera.resetTilt();
            }
        });
    }

    private setupWheelEvents(): void {
        this.app.canvas.addEventListener('wheel', (e: WheelEvent) => {
            e.preventDefault();

            if (this.stateManager.state === AppState.NAVIGATION) {
                // Zoom in navigation mode
                this.camera.zoomBy(e.deltaY, e.clientX, e.clientY);
            } else {
                // Scroll within content in content mode
                this.stateManager.handleContentScroll(e.deltaX, e.deltaY);
            }
        }, { passive: false });
    }

    private onPointerDown(e: MouseEvent): void {
        if (this.stateManager.state !== AppState.NAVIGATION) return;
        if (this.dragPaused) return; // Carousel is handling drag

        this.isDragging = true;
        this.camera.setDragging(true);

        this.dragStart = { x: e.clientX, y: e.clientY };
        this.lastDragPos = { x: e.clientX, y: e.clientY };
        this.velocityHistory = [];

        // Track for click detection
        this.clickStart = { x: e.clientX, y: e.clientY, t: performance.now() };
    }

    private onPointerMove(e: MouseEvent): void {
        // Update mouse position for parallax
        this.mousePosition.x = (e.clientX / window.innerWidth - 0.5) * 2;
        this.mousePosition.y = (e.clientY / window.innerHeight - 0.5) * 2;

        if (!this.isDragging || this.stateManager.state !== AppState.NAVIGATION || this.dragPaused) return;

        const dx = e.clientX - this.lastDragPos.x;
        const dy = e.clientY - this.lastDragPos.y;

        // Pan camera
        this.camera.pan(dx, dy);

        // Track velocity
        const now = performance.now();
        this.velocityHistory.push({ x: dx, y: dy, t: now });

        // Keep only recent history (last 100ms)
        this.velocityHistory = this.velocityHistory.filter((v) => now - v.t < 100);

        this.lastDragPos = { x: e.clientX, y: e.clientY };
    }

    private onPointerUp(e: MouseEvent): void {
        if (!this.isDragging) return;

        this.isDragging = false;
        this.camera.setDragging(false);

        // Check for click vs drag
        if (this.clickStart && e.clientX !== undefined) {
            const dx = Math.abs(e.clientX - this.clickStart.x);
            const dy = Math.abs(e.clientY - this.clickStart.y);
            const dt = performance.now() - this.clickStart.t;

            if (dx < this.CLICK_THRESHOLD && dy < this.CLICK_THRESHOLD && dt < 300) {
                // This was a click
                const now = performance.now();
                if (now - this.lastClickTime < this.DOUBLE_CLICK_THRESHOLD) {
                    // Double click
                    this.onDoubleClick(e.clientX, e.clientY);
                }
                this.lastClickTime = now;
                this.clickStart = null;
                return;
            }
        }

        this.clickStart = null;

        // Calculate average velocity from history
        if (this.velocityHistory.length > 0) {
            const avgVelocity = this.velocityHistory.reduce(
                (acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y }),
                { x: 0, y: 0 }
            );
            avgVelocity.x /= this.velocityHistory.length;
            avgVelocity.y /= this.velocityHistory.length;

            // Apply momentum
            this.camera.applyMomentum(avgVelocity.x * 0.3, avgVelocity.y * 0.3);
        }

        this.velocityHistory = [];
    }

    private onDoubleClick(x: number, y: number): void {
        // Convert screen coordinates to world coordinates
        const worldPos = this.camera.screenToWorld(x, y);

        // Emit double click event for World to handle
        this.stateManager.emit('doubleClick', worldPos);
    }

    /**
     * Update keyboard panning
     */
    public update(delta: number): void {
        if (this.stateManager.state !== AppState.NAVIGATION) return;

        // Arrow key panning
        const panSpeed = 400 * delta;

        if (this.keys.has('ArrowLeft')) {
            this.camera.pan(panSpeed, 0);
        }
        if (this.keys.has('ArrowRight')) {
            this.camera.pan(-panSpeed, 0);
        }
        if (this.keys.has('ArrowUp')) {
            this.camera.pan(0, panSpeed);
        }
        if (this.keys.has('ArrowDown')) {
            this.camera.pan(0, -panSpeed);
        }
    }

    /**
     * Pause global drag handling (called by carousel when it starts dragging)
     */
    public pauseDrag(): void {
        this.dragPaused = true;
        if (this.isDragging) {
            this.isDragging = false;
            this.camera.setDragging(false);
        }
    }

    /**
     * Resume global drag handling (called by carousel when it stops dragging)
     */
    public resumeDrag(): void {
        this.dragPaused = false;
    }
}
