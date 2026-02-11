import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./ui/button";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ArrowRight, Play } from "lucide-react";
import { useCartStore } from "../store/cartStore";

export function Hero() {
    const { setIsOpen } = useCartStore();
    const [currentImage, setCurrentImage] = useState(0);
    const images = [
        "./assets/cleaning_slide_1.jpg",
        "./assets/cleaning_slide_2.jpg",
        "./assets/cleaning_slide_4.jpg",
        "./assets/cleaning_slide_5.jpg"
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentImage((prev) => (prev + 1) % images.length);
        }, 3000); // Change image every 3 seconds
        return () => clearInterval(timer);
    }, []);

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600">
            {/* Background Video - Visible on all devices */}
            <div className="absolute inset-0">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                >
                    <source src="./assets/cleaning_video.mp4" type="video/mp4" />
                </video>
                {/* Dark Overlay for readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-blue-900/60 via-purple-900/60 to-blue-900/80"></div>
            </div>

            {/* Floating Shapes */}
            <motion.div
                animate={{
                    y: [0, -20, 0],
                    rotate: [0, 5, 0],
                }}
                transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="absolute top-1/4 left-10 w-20 h-20 border-4 border-white/30 rounded-2xl hidden lg:block"
            />
            <motion.div
                animate={{
                    y: [0, 20, 0],
                    rotate: [0, -5, 0],
                }}
                transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="absolute bottom-1/4 right-20 w-32 h-32 border-4 border-white/20 rounded-full hidden lg:block"
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 relative z-10 flex flex-col items-center text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="flex flex-col items-center"
                >
                    <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="inline-block bg-white/20 backdrop-blur-sm text-white px-6 py-2 rounded-full text-sm mb-6"
                    >
                        ✨ 프리미엄 크리닝 케어 서비스
                    </motion.span>

                    <h1 className="text-5xl md:text-6xl lg:text-7xl text-white mb-6 leading-tight">
                        <span className="text-yellow-300">본연</span>의 모습을
                        <br />
                        되찾아드립니다
                    </h1>

                    <p className="text-xl text-white/90 mb-10 leading-relaxed max-w-xl">
                        전문적인 기술과 장비로
                        <br className="hidden md:block" />
                        최고의 서비스를 제공합니다.
                    </p>

                    {/* 무료 상담 받기 버튼 - 비활성화
                            <div className="flex flex-col sm:flex-row gap-4 mb-12">
                                <motion.div
                                    whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <Button
                                        onClick={() => setIsOpen(true)}
                                        className="bg-white text-blue-600 hover:bg-gray-100 px-10 py-7 text-lg rounded-full shadow-2xl group"
                                    >
                                        무료 상담 받기
                                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </motion.div>
                            </div>
                            */}

                    {/* Floating Cards - Now centered below text */}
                    <div className="flex flex-wrap justify-center gap-4 mt-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.8 }}
                            className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-4 flex items-center gap-3"
                        >
                            <div className="bg-green-100 rounded-full p-2">
                                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-gray-900">철저한 인증</div>
                                <div className="text-xs text-gray-600">100% 그린 케어</div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 1 }}
                            className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-4 flex items-center gap-3"
                        >
                            <div className="bg-blue-100 rounded-full p-2">
                                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-gray-900">정기관리</div>
                                <div className="text-xs text-gray-600">원하는 시간에</div>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </div>

            {/* Scroll Indicator */}
            <motion.div
                animate={{
                    y: [0, 10, 0],
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/80"
            >
                <div className="flex flex-col items-center gap-2">
                    <span className="text-sm">스크롤</span>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                </div>
            </motion.div>
        </section>
    );
}
