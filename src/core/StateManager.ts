import { gsap } from 'gsap';

/**
 * Application States (legacy - kept for compatibility)
 */
export enum AppState {
    NAVIGATION = 'navigation',
    CONTENT = 'content',
}

/**
 * Depth levels for the 3-level state machine
 */
export enum DepthLevel {
    WORLD = 'WORLD',       // Infinite map navigation
    SECTION = 'SECTION',   // Horizontal carousel view
    DETAIL = 'DETAIL',     // Full-screen vertical reader
}

/**
 * Event callback types
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventCallback = (...args: any[]) => void;

/**
 * Axis lock types for scroll direction
 */
type AxisLock = 'none' | 'horizontal' | 'vertical';

/**
 * StateManager
 * Handles the 3-level depth system: WORLD → SECTION → DETAIL
 */
export class StateManager {
    // Legacy state (for compatibility)
    public state: AppState = AppState.NAVIGATION;

    // 3-level depth system
    public depth: DepthLevel = DepthLevel.WORLD;
    public currentSlideId: string | null = null;
    public currentDetailId: string | null = null;

    // Internal scroll position within content
    public contentScrollX: number = 0;
    public contentScrollY: number = 0;
    public currentItemIndex: number = 0;

    // Axis locking for scroll direction (prevents diagonal jitter)
    private lockedAxis: AxisLock = 'none';
    private lockTimeout: number | null = null;
    private readonly AXIS_LOCK_TIMEOUT = 300; // ms before axis unlocks

    // Event emitter
    private listeners: Map<string, EventCallback[]> = new Map();

    constructor() {
        // Start in world view
        this.state = AppState.NAVIGATION;
        this.depth = DepthLevel.WORLD;
    }

    /**
     * Subscribe to events
     */
    public on(event: string, callback: EventCallback): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);
    }

    /**
     * Emit an event
     */
    public emit(event: string, ...args: unknown[]): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach((cb) => cb(...args));
        }
    }

    /**
     * Enter SECTION level (carousel view)
     */
    public enterContentMode(slideId: string): void {
        if (this.depth === DepthLevel.SECTION) return;

        this.state = AppState.CONTENT;
        this.depth = DepthLevel.SECTION;
        this.currentSlideId = slideId;
        this.contentScrollX = 0;
        this.contentScrollY = 0;
        this.currentItemIndex = 0;
        this.lockedAxis = 'none';

        console.log(`[State] Depth changed: WORLD → SECTION (${slideId})`);

        // Update UI hint
        this.updateCursorHint('Scroll to browse • Click to open • ESC to exit');

        this.emit('stateChange', this.state, slideId);
        this.emit('depthChange', this.depth, slideId);
    }

    /**
     * Enter DETAIL level (full-screen reader)
     */
    public enterDetailMode(itemId: string): void {
        if (this.depth !== DepthLevel.SECTION) return;

        this.depth = DepthLevel.DETAIL;
        this.currentDetailId = itemId;
        this.contentScrollY = 0;

        console.log(`[State] Depth changed: SECTION → DETAIL (${itemId})`);

        // Update UI hint
        this.updateCursorHint('Scroll to read • Click ✕ to close');

        this.emit('depthChange', this.depth, itemId);
        this.emit('enterDetail', itemId);
    }

    /**
     * Exit DETAIL level back to SECTION
     */
    public exitDetailMode(): void {
        if (this.depth !== DepthLevel.DETAIL) return;

        this.depth = DepthLevel.SECTION;
        const previousDetailId = this.currentDetailId;
        this.currentDetailId = null;
        this.contentScrollY = 0;

        console.log(`[State] Depth changed: DETAIL → SECTION`);

        // Update UI hint
        this.updateCursorHint('Scroll to browse • Click to open • ESC to exit');

        this.emit('depthChange', this.depth, null);
        this.emit('exitDetail', previousDetailId);
    }

    /**
     * Exit SECTION level back to WORLD
     */
    public exitContentMode(): void {
        // If in DETAIL, first go back to SECTION
        if (this.depth === DepthLevel.DETAIL) {
            this.exitDetailMode();
            return;
        }

        if (this.depth !== DepthLevel.SECTION) return;

        this.state = AppState.NAVIGATION;
        this.depth = DepthLevel.WORLD;
        this.currentSlideId = null;
        this.lockedAxis = 'none';
        if (this.lockTimeout) {
            clearTimeout(this.lockTimeout);
            this.lockTimeout = null;
        }

        console.log(`[State] Depth changed: SECTION → WORLD`);

        // Update UI hint
        this.updateCursorHint('Drag to explore • Scroll to zoom • Double-click to enter');

        this.emit('stateChange', this.state, null);
        this.emit('depthChange', this.depth, null);
        this.emit('exitContent');
    }

    /**
     * Handle scroll input based on current depth level
     * - SECTION: Map deltaY to horizontal carousel scroll
     * - DETAIL: Map deltaY to vertical content scroll
     */
    public handleContentScroll(deltaX: number, deltaY: number): void {
        if (this.depth === DepthLevel.WORLD) return;

        if (this.depth === DepthLevel.DETAIL) {
            // In DETAIL mode, scroll vertically only
            this.contentScrollY += deltaY;
            this.emit('contentScroll', 0, deltaY, 'vertical');
            this.emit('detailScroll', deltaY);
            return;
        }

        // In SECTION mode, use axis locking
        // Determine dominant axis if not locked
        if (this.lockedAxis === 'none') {
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);

            // Only lock if there's meaningful movement
            if (absX > 2 || absY > 2) {
                this.lockedAxis = absX > absY ? 'horizontal' : 'vertical';
                console.log(`[StateManager] Axis locked: ${this.lockedAxis}`);
            }
        }

        // Reset lock timeout on each scroll event
        if (this.lockTimeout) {
            clearTimeout(this.lockTimeout);
        }
        this.lockTimeout = window.setTimeout(() => {
            console.log('[StateManager] Axis unlocked');
            this.lockedAxis = 'none';
            this.lockTimeout = null;
        }, this.AXIS_LOCK_TIMEOUT);

        // Route to appropriate handler based on locked axis
        // In SECTION mode, map vertical scroll to horizontal carousel movement
        if (this.lockedAxis === 'horizontal') {
            this.contentScrollX += deltaX;
            this.emit('contentScroll', deltaX, 0, 'horizontal');
        } else if (this.lockedAxis === 'vertical') {
            // Map deltaY to horizontal carousel scroll
            this.contentScrollX += deltaY;
            this.emit('contentScroll', deltaY, 0, 'horizontal');
        }
    }

    /**
     * Update the cursor hint text
     */
    private updateCursorHint(text: string): void {
        const hint = document.getElementById('cursor-hint');
        if (hint) {
            gsap.to(hint, {
                opacity: 0,
                duration: 0.2,
                onComplete: () => {
                    hint.textContent = text;
                    gsap.to(hint, { opacity: 0.4, duration: 0.2 });
                },
            });
        }
    }
}

