import React from "react";
import Dock from "@/components/ui/floating-dock";
import {
    IconHome,
    IconTerminal2,
    IconWriting,
    IconUserCircle
} from "@tabler/icons-react";

interface DockWrapperProps {
    showTOC?: boolean;
}

export default function DockWrapper({ showTOC = false }: DockWrapperProps) {
    const links = [
        {
            title: "Home",
            icon: <IconHome className="w-full h-full text-neutral-700 dark:text-neutral-300" />,
            href: "/"
        },
        {
            title: "Projects",
            icon: <IconTerminal2 className="w-full h-full text-neutral-700 dark:text-neutral-300" />,
            href: "/projects"
        },
        {
            title: "Thoughts",
            icon: <IconWriting className="w-full h-full text-neutral-700 dark:text-neutral-300" />,
            href: "/thoughts"
        },
        {
            title: "Now",
            icon: <IconUserCircle className="w-full h-full text-neutral-700 dark:text-neutral-300" />,
            href: "/now"
        },
    ];

    function handleTOCClick() {
        const tocElement = document.getElementById('table-of-contents');
        if (tocElement) {
            tocElement.scrollIntoView({ behavior: 'smooth' });
        }
    }

    return (
        <Dock
            items={links}
            showTOC={showTOC}
            onTOCClick={handleTOCClick}
        />
    );
}

// Also export as named export for flexibility
export { DockWrapper };
