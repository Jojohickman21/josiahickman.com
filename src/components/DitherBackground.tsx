"use client";
import { DitherShader } from "@/components/ui/dither-shader";

export default function DitherBackground({
    className = "fixed inset-0 pointer-events-none -z-10",
    src = "/background.png",
    gridSize = 4,
    colorMode = "grayscale"
}: {
    className?: string;
    src?: string;
    gridSize?: number;
    colorMode?: "original" | "grayscale" | "duotone" | "custom";
}) {
    return (
        <div className={className}>
            <DitherShader
                src={src}
                gridSize={gridSize}
                ditherMode="bayer"
                colorMode={colorMode}
                className="h-full w-full object-cover"
            />
        </div>
    );
}
