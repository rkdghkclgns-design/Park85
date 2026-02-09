import { motion } from "motion/react";
import { Button } from "./ui/button";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useCartStore, ServiceItem } from "../store/cartStore";
import { Check, ShoppingCart } from "lucide-react";

import { regularCleaningServices, disinfectionServices, deepCleaningServices, buildingManagementServices } from "../data/services";

export function ServiceSelection() {
    const { items, toggleItem, setIsOpen } = useCartStore();

    const isSelected = (id: string) => items.some(item => item.id === id);

    return (
        <section id="services-selection" className="py-24 px-4 sm:px-6 lg:px-8 bg-white text-center">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-16"
                >
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        필요한 서비스만 <span className="text-blue-600">쏙쏙</span> 골라보세요
                    </h2>
                    <p className="text-gray-500">클릭하여 장바구니에 담고 한번에 비교/견적하세요.</p>
                </motion.div>

                {/* 1. 정기 청소 */}
                <div className="mb-16">
                    <div className="mb-8 flex items-center justify-center gap-2">
                        <span className="font-bold text-xl text-gray-900 px-4 py-1 bg-gray-100 rounded-full">정기 청소</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {regularCleaningServices.map((service, index) => (
                            <ServiceCard key={service.id} service={service} index={index} toggleItem={toggleItem} isSelected={isSelected} />
                        ))}
                    </div>
                </div>

                {/* 2. 정기 소독 & 방역 */}
                <div className="mb-16">
                    <div className="mb-8 flex items-center justify-center gap-2">
                        <span className="font-bold text-xl text-gray-900 px-4 py-1 bg-gray-100 rounded-full">정기 소독 & 방역</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {disinfectionServices.map((service, index) => (
                            <ServiceCard key={service.id} service={service} index={index} toggleItem={toggleItem} isSelected={isSelected} />
                        ))}
                    </div>
                </div>

                {/* 3. 프리미엄 클리닝 */}
                <div className="mb-16">
                    <div className="mb-8 flex items-center justify-center gap-2">
                        <span className="font-bold text-xl text-gray-900 px-4 py-1 bg-gray-100 rounded-full">프리미엄 클리닝</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                        {deepCleaningServices.map((service, index) => (
                            <ServiceCard key={service.id} service={service} index={index} toggleItem={toggleItem} isSelected={isSelected} />
                        ))}
                    </div>
                </div>

                {/* 4. 건물 관리 */}
                <div className="mb-16">
                    <div className="mb-8 flex items-center justify-center gap-2">
                        <span className="font-bold text-xl text-gray-900 px-4 py-1 bg-gray-100 rounded-full">건물 관리</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 justify-center">
                        {buildingManagementServices.map((service, index) => (
                            <ServiceCard key={service.id} service={service} index={index} toggleItem={toggleItem} isSelected={isSelected} />
                        ))}
                    </div>
                </div>

                {/* Floating Cart Button */}
                <div className="text-center sticky bottom-8 z-40">
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Button
                            onClick={() => setIsOpen(true)}
                            className="bg-[#1e2b4f] hover:bg-[#151f3a] text-white px-8 py-6 rounded-full text-lg font-bold shadow-2xl inline-flex items-center gap-3 border-2 border-white/20 backdrop-blur-md"
                        >
                            <div className="relative">
                                <ShoppingCart className="w-6 h-6" />
                                {items.length > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#1e2b4f]">
                                        {items.length}
                                    </span>
                                )}
                            </div>
                            <span>
                                {items.length === 0 ? "원하는 서비스 골라담기" : `선택한 서비스 확인하기 (${items.length})`}
                            </span>
                        </Button>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

function ServiceCard({ service, index, toggleItem, isSelected }: { service: ServiceItem, index: number, toggleItem: (item: ServiceItem) => void, isSelected: (id: string) => boolean }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05 }}
            onClick={() => toggleItem(service)}
            className={`group flex flex-col items-center cursor-pointer relative p-3 rounded-2xl transition-all duration-300 ${isSelected(service.id) ? "bg-blue-50 ring-2 ring-blue-500 shadow-lg scale-105" : "hover:bg-gray-50"}`}
        >
            <div className="w-full aspect-square rounded-xl overflow-hidden mb-3 relative shadow-md">
                <ImageWithFallback
                    src={service.image}
                    alt={service.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className={`absolute inset-0 flex items-center justify-center transition-all ${isSelected(service.id) ? "bg-blue-600/40" : "bg-transparent group-hover:bg-black/10"}`}>
                    {isSelected(service.id) && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white rounded-full p-2 text-blue-600 shadow-md">
                            <Check className="w-6 h-6 stroke-[3px]" />
                        </motion.div>
                    )}
                </div>
            </div>
            <span className={`text-sm font-bold ${isSelected(service.id) ? "text-blue-700" : "text-gray-700"}`}>{service.name}</span>
        </motion.div>
    );
}
