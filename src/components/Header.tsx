import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown, Phone } from "lucide-react";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { useCartStore } from "../store/cartStore";
import { serviceCategories } from "../data/services";

export function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [openMobileAccordion, setOpenMobileAccordion] = useState<string | null>(null);
    const { setIsOpen } = useCartStore();
    const navigate = useNavigate();
    const location = useLocation();
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMenuOpen(false);
        setOpenMobileAccordion(null);
    }, [location.pathname]);

    const handleLogoClick = () => {
        navigate("/");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleSubServiceClick = (categoryId: string, serviceId: string) => {
        setOpenDropdown(null);
        setIsMenuOpen(false);
        navigate(`/service/${categoryId}/${serviceId}`);
    };

    return (
        <header
            className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white/95 backdrop-blur-lg shadow-md"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    {/* Logo */}
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="flex-shrink-0 cursor-pointer"
                        onClick={handleLogoClick}
                    >
                        <img src="./assets/logo.png" alt="본연" className="h-12 w-auto object-contain" />
                    </motion.div>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center space-x-1" ref={dropdownRef}>
                        {serviceCategories.map((category) => (
                            <div
                                key={category.id}
                                className="relative"
                                onMouseEnter={() => setOpenDropdown(category.id)}
                                onMouseLeave={() => setOpenDropdown(null)}
                            >
                                <button
                                    onClick={() => setOpenDropdown(prev => prev === category.id ? null : category.id)}
                                    className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                        openDropdown === category.id
                                            ? "text-blue-600 bg-blue-50"
                                            : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                                    }`}
                                >
                                    {category.name}
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                        openDropdown === category.id ? "rotate-180" : ""
                                    }`} />
                                </button>

                                {/* Desktop Dropdown */}
                                <AnimatePresence>
                                    {openDropdown === category.id && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -4 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute top-full left-0 pt-1 w-52 z-50"
                                        >
                                            <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                                                {category.subServices.map((sub, idx) => (
                                                    <button
                                                        key={sub.id}
                                                        onClick={() => handleSubServiceClick(category.id, sub.id)}
                                                        className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors ${
                                                            idx < category.subServices.length - 1 ? "border-b border-gray-50" : ""
                                                        }`}
                                                    >
                                                        <div className="font-medium text-sm text-gray-900 hover:text-blue-600">
                                                            {sub.name}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}

                        <div className="flex items-center gap-2 ml-4">
                            {/* Phone Button */}
                            <a
                                href="tel:01027401734"
                                className="flex items-center gap-1.5 px-4 py-2 border border-[#1e2b4f] text-[#1e2b4f] rounded-lg font-medium text-sm hover:bg-[#1e2b4f] hover:text-white transition-colors"
                            >
                                <Phone className="w-4 h-4" />
                                전화문의
                            </a>

                            {/* Consultation Button */}
                            <Button
                                onClick={() => setIsOpen(true)}
                                className="bg-[#1e2b4f] hover:bg-[#151f3a] text-white px-5 py-2 rounded-lg font-medium text-sm transition-colors"
                            >
                                간편 상담
                            </Button>
                        </div>
                    </nav>

                    {/* Mobile Buttons */}
                    <div className="flex items-center gap-2 lg:hidden">
                        <a
                            href="tel:01027401734"
                            className="p-2 rounded-lg border border-[#1e2b4f] text-[#1e2b4f] hover:bg-[#1e2b4f] hover:text-white transition-colors"
                        >
                            <Phone className="h-5 w-5" />
                        </a>
                        <Button
                            onClick={() => setIsOpen(true)}
                            className="bg-[#1e2b4f] hover:bg-[#151f3a] text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                        >
                            간편 상담
                        </Button>
                        <button
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            {isMenuOpen ? (
                                <X className="h-6 w-6 text-gray-900" />
                            ) : (
                                <Menu className="h-6 w-6 text-gray-900" />
                            )}
                        </button>
                    </div>
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
                        className="lg:hidden border-t border-gray-200 bg-white shadow-lg max-h-[70vh] overflow-y-auto"
                    >
                        <nav className="px-4 py-4 space-y-1">
                            {serviceCategories.map((category) => (
                                <div key={category.id}>
                                    {/* Category Accordion Header */}
                                    <button
                                        onClick={() => setOpenMobileAccordion(
                                            prev => prev === category.id ? null : category.id
                                        )}
                                        className={`w-full flex items-center justify-between py-3 px-4 rounded-lg transition-all ${
                                            openMobileAccordion === category.id
                                                ? "bg-blue-50 text-blue-600"
                                                : "text-gray-700 hover:bg-gray-50"
                                        }`}
                                    >
                                        <span className="font-medium">{category.name}</span>
                                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${
                                            openMobileAccordion === category.id ? "rotate-180" : ""
                                        }`} />
                                    </button>

                                    {/* Sub-services Accordion */}
                                    <AnimatePresence>
                                        {openMobileAccordion === category.id && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="pl-6 pr-4 py-1 space-y-0.5">
                                                    {category.subServices.map((sub) => (
                                                        <button
                                                            key={sub.id}
                                                            onClick={() => handleSubServiceClick(category.id, sub.id)}
                                                            className="w-full text-left py-2.5 px-4 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm"
                                                        >
                                                            {sub.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
