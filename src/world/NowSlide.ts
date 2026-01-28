import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { gsap } from 'gsap';
import { Section } from '../config';
import { Slide } from './Slide';

/**
 * NowSlide
 * "Now" page showing current focus and activities
 */
export class NowSlide extends Slide {
    private titleText: Text;
    private subText: Text;
    private descriptionText: Text;
    private statusItems: Container;

    constructor(section: Section, app: Application) {
        super(section, app);

        this.width = 1400;
        this.height = 900;

        // Recreate background with gradient-like effect
        this.background.clear();
        this.background.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 12);
        this.background.fill({ color: 0x0d0d0d });
        this.background.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 12);
        this.background.stroke({ width: 1, color: 0x1f1f1f });

        // Create content
        this.titleText = this.createTitle();
        this.subText = this.createSubtitle();
        this.descriptionText = this.createDescription();
        this.statusItems = this.createStatusItems();

        this.container.addChild(this.titleText);
        this.container.addChild(this.subText);
        this.container.addChild(this.descriptionText);
        this.container.addChild(this.statusItems);

        this.playIntro();
    }

    private createTitle(): Text {
        const style = new TextStyle({
            fontFamily: 'Playfair Display, Georgia, serif',
            fontSize: 72,
            fontWeight: '600',
            fill: '#f5f5f5',
            letterSpacing: 2,
        });

        const text = new Text({
            text: this.section.content?.heading || 'Now',
            style,
        });

        text.anchor.set(0.5, 0.5);
        text.position.set(0, -this.height / 2 + 100);

        return text;
    }

    private createSubtitle(): Text {
        const style = new TextStyle({
            fontFamily: 'Inter, -apple-system, sans-serif',
            fontSize: 18,
            fontWeight: '400',
            fill: '#666666',
            letterSpacing: 4,
        });

        const text = new Text({
            text: (this.section.content?.sub || '').toUpperCase(),
            style,
        });

        text.anchor.set(0.5, 0.5);
        text.position.set(0, -this.height / 2 + 160);

        return text;
    }

    private createDescription(): Text {
        const style = new TextStyle({
            fontFamily: 'Inter, -apple-system, sans-serif',
            fontSize: 16,
            fontWeight: '300',
            fill: '#888888',
            wordWrap: true,
            wordWrapWidth: 600,
            align: 'center',
        });

        const text = new Text({
            text: this.section.content?.description || '',
            style,
        });

        text.anchor.set(0.5, 0.5);
        text.position.set(0, -this.height / 2 + 210);

        return text;
    }

    private createStatusItems(): Container {
        const container = new Container();
        container.position.set(-this.width / 2 + 100, -50);

        const items = [
            { emoji: '🔧', title: 'Building', desc: 'Infinite canvas portfolio with PixiJS' },
            { emoji: '📚', title: 'Learning', desc: 'WebGL shaders and creative coding' },
            { emoji: '🎯', title: 'Focus', desc: 'Design engineering & spatial interfaces' },
            { emoji: '🌍', title: 'Location', desc: 'Building from anywhere' },
        ];

        items.forEach((item, index) => {
            const itemContainer = new Container();
            itemContainer.position.y = index * 100;

            // Emoji
            const emojiStyle = new TextStyle({
                fontSize: 32,
            });
            const emoji = new Text({ text: item.emoji, style: emojiStyle });
            emoji.position.set(0, 0);
            itemContainer.addChild(emoji);

            // Title
            const titleStyle = new TextStyle({
                fontFamily: 'Inter, -apple-system, sans-serif',
                fontSize: 20,
                fontWeight: '600',
                fill: '#e5e5e5',
            });
            const title = new Text({ text: item.title, style: titleStyle });
            title.position.set(50, 0);
            itemContainer.addChild(title);

            // Description
            const descStyle = new TextStyle({
                fontFamily: 'Inter, -apple-system, sans-serif',
                fontSize: 16,
                fontWeight: '300',
                fill: '#888888',
            });
            const desc = new Text({ text: item.desc, style: descStyle });
            desc.position.set(50, 28);
            itemContainer.addChild(desc);

            container.addChild(itemContainer);
        });

        return container;
    }

    private playIntro(): void {
        this.titleText.alpha = 0;
        this.subText.alpha = 0;
        this.descriptionText.alpha = 0;
        this.statusItems.alpha = 0;

        gsap.to(this.titleText, { alpha: 1, duration: 0.8, ease: 'power2.out', delay: 0.2 });
        gsap.to(this.subText, { alpha: 1, duration: 0.6, ease: 'power2.out', delay: 0.4 });
        gsap.to(this.descriptionText, { alpha: 1, duration: 0.6, ease: 'power2.out', delay: 0.5 });
        gsap.to(this.statusItems, { alpha: 1, duration: 0.8, ease: 'power2.out', delay: 0.6 });
    }

    public onEnter(): void {
        this.playIntro();
    }
}
