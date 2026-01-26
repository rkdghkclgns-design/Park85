import { useState } from "react";
import { motion } from "motion/react";

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    fallbackSrc?: string;
}

export function ImageWithFallback({ src, alt, className, fallbackSrc = "https://placehold.co/600x400?text=No+Image", ...props }: ImageWithFallbackProps) {
    const [imgSrc, setImgSrc] = useState(src);
    const [isLoading, setIsLoading] = useState(true);

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {isLoading && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse" />
            )}
            <motion.img
                src={imgSrc}
                alt={alt || "이미지"}
                loading="lazy"
                decoding="async"
                className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? "opacity-0" : "opacity-100"}`}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                    setImgSrc(fallbackSrc);
                    setIsLoading(false);
                }}
                {...props}
            />
        </div>
    );
}
