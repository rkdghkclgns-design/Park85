import { useState, useEffect } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { useCartStore } from "../store/cartStore";

export function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const { setIsOpen } = useCartStore();

    useEffect(() => {
        const handleScroll = () => {
            const heroHeight = window.innerHeight; // 동영상 화면 높이 (뷰포트 기준)
            const scrollY = window.scrollY;

            // 동영상의 1/4 정도 가려지면 (25% 스크롤) 헤더 표시
            // 동영상이 3/4 이상 보이면 (25% 미만 스크롤) 헤더 숨김
            setIsVisible(scrollY > heroHeight * 0.25);
            setIsScrolled(scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.header
                    initial={{ y: -100 }}
                    animate={{ y: 0 }}
                    exit={{ y: -100 }}
                    transition={{ duration: 0.3 }}
                    className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg shadow-md"
                >
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-20">
                            {/* Logo */}
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                className="flex-shrink-0 cursor-pointer"
                            >
                                <img src="./assets/logo.png" alt="본연" className="h-16 w-auto object-contain" />
                            </motion.div>

                            {/* Desktop Navigation */}
                            <nav className="hidden lg:flex items-center space-x-8">
                                {["서비스", "이용방법", "고객후기"].map((item, idx) => (
                                    <motion.a
                                        key={item}
                                        href={`#${["services", "how-it-works", "testimonials"][idx]}`}
                                        className={`text-base transition-colors relative group ${isScrolled ? "text-gray-700 hover:text-blue-600" : "text-white/90 hover:text-white"
                                            }`}
                                        whileHover={{ y: -2 }}
                                    >
                                        {item}
                                        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
                                    </motion.a>
                                ))}
                                <Button
                                    onClick={() => setIsOpen(true)}
                                    className="bg-[#1e2b4f] hover:bg-[#151f3a] text-white px-6 py-2 rounded-lg font-medium transition-colors"
                                >
                                    간편 상담
                                </Button>
                            </nav>



                            {/* Mobile Menu Button */}
                            <button
                                className="lg:hidden p-2 rounded-lg hover:bg-gray-100/10 transition-colors"
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                            >
                                {isMenuOpen ? (
                                    <X className={`h-6 w-6 ${isScrolled ? "text-gray-900" : "text-white"}`} />
                                ) : (
                                    <Menu className={`h-6 w-6 ${isScrolled ? "text-gray-900" : "text-white"}`} />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Menu */}
                    <AnimatePresence>
                        {isMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                                className="lg:hidden border-t border-gray-200 bg-white shadow-lg"
                            >
                                <nav className="px-4 py-6 space-y-4">
                                    {["서비스", "이용방법", "고객후기"].map((item, idx) => (
                                        <a
                                            key={item}
                                            href={`#${["services", "how-it-works", "testimonials"][idx]}`}
                                            className="block py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-4 rounded-lg transition-all"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            {item}
                                        </a>
                                    ))}

                                </nav>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.header>
            )}
        </AnimatePresence>
    );
}
