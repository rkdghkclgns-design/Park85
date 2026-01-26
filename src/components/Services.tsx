import { motion } from "motion/react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const services = [
    {
        title: "상업공간, 사무실 청소",
        description: "사무실 등 상업공간 전반의 정기/일회성/특수 청소 서비스 제공",
        image: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2070&auto=format&fit=crop", // Modern office
    },
    {
        title: "건물관리",
        description: "임대료 관리, 번거로운 민원처리까지 건물에 필요한 모든 관리포인트 해결",
        image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop", // Building exterior
    },
    {
        title: "스낵 및 비품관리",
        description: "사무실 간식, 비품, 큐레이션 서비스. 다양한 기업의 복지 예산에 맞춰 세팅",
        image: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=2074&auto=format&fit=crop", // Market/Snacks
    },
    {
        title: "호텔관리",
        description: "객실관리, 미화, 리브랑 등 호텔에 필요한 인비지블 서비스 제공",
        image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop", // Hotel luxury
    },
];

export function Services() {
    return (
        <section id="services" className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
            <div className="max-w-7xl mx-auto">
                <div className="grid md:grid-cols-2 gap-8">
                    {services.map((service, index) => (
                        <motion.div
                            key={service.title}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="bg-white group cursor-pointer"
                        >
                            <div className="relative rounded-2xl overflow-hidden mb-6 h-64 shadow-sm hover:shadow-md transition-shadow">
                                <ImageWithFallback
                                    src={service.image}
                                    alt={service.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                {service.title}
                            </h3>
                            <p className="text-gray-600">
                                {service.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
