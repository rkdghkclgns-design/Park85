import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { serviceCategories } from "../data/services";

export function Services() {
    const navigate = useNavigate();
    const [openCategory, setOpenCategory] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpenCategory(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleToggle = (categoryId: string) => {
        setOpenCategory(prev => prev === categoryId ? null : categoryId);
    };

    const handleSubServiceClick = (categoryId: string, serviceId: string) => {
        setOpenCategory(null);
        navigate(`/service/${categoryId}/${serviceId}`);
    };

    return (
        <section id="section-services" className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
            <div className="max-w-7xl mx-auto" ref={dropdownRef}>
                <div className="grid md:grid-cols-2 gap-8">
                    {serviceCategories.map((category, index) => (
                        <motion.div
                            key={category.id}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="bg-white group relative"
                        >
                            {/* Card Image + Overlay Dropdown */}
                            <div className="relative rounded-2xl overflow-hidden mb-6 h-64 shadow-sm hover:shadow-md transition-shadow">
                                <ImageWithFallback
                                    src={category.image}
                                    alt={category.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />

                                {/* Dropdown Overlay on Image */}
                                <AnimatePresence>
                                    {openCategory === category.id && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col justify-center px-6"
                                        >
                                            {category.subServices.map((sub, subIdx) => (
                                                <button
                                                    key={sub.id}
                                                    onClick={() => handleSubServiceClick(category.id, sub.id)}
                                                    className={`w-full text-left px-4 py-3 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-between group/item ${
                                                        subIdx < category.subServices.length - 1 ? "border-b border-gray-200" : ""
                                                    }`}
                                                >
                                                    <div>
                                                        <div className="font-bold text-gray-900 group-hover/item:text-blue-600 transition-colors">
                                                            {sub.name}
                                                        </div>
                                                        <div className="text-sm text-gray-500 mt-0.5">
                                                            {sub.description}
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover/item:text-blue-600 transition-colors flex-shrink-0" />
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Title + Dropdown Button */}
                            <div
                                className="flex items-center justify-between"
                                onMouseEnter={() => setOpenCategory(category.id)}
                            >
                                <h3 className="text-2xl font-bold text-gray-900">
                                    {category.name}
                                </h3>
                                <button
                                    onClick={() => handleToggle(category.id)}
                                    className="flex items-center gap-1 px-4 py-2 bg-[#1e2b4f] text-white rounded-lg text-sm font-medium hover:bg-[#151f3a] transition-colors"
                                >
                                    <span>서비스 보기</span>
                                    <ChevronDown
                                        className={`w-4 h-4 transition-transform duration-200 ${
                                            openCategory === category.id ? "rotate-180" : ""
                                        }`}
                                    />
                                </button>
                            </div>
                            <p className="text-gray-600 mt-2">
                                {category.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
