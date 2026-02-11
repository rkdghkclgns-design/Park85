import { motion } from "motion/react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const services = [
    {
        title: "정기 청소",
        description: "사무실, 병원 등 상업공간 전반의 정기 청소 서비스 제공",
        image: "./assets/services/regular_cleaning.png",
    },
    {
        title: "정기 소독&방역",
        description: "어린이집, 학원 등 상업공간 전반의 정기 소독 및 방역 서비스 제공",
        image: "./assets/services/service_disinfection.png",
    },
    {
        title: "프리미엄 클리닝",
        description: "준공 청소, 펜션&글램핑 청소, 냉난방 공조기, 대형 유리, 카페트, 의자 등 일회성 프리미엄 클리닝",
        image: "./assets/services/hvac_cleaning.png",
    },
    {
        title: "건물 관리",
        description: "건물 외벽, 외부 창문, 간판, 어닝 청소 및 LED 간판&조명 수리 서비스 제공",
        image: "./assets/services/building_exterior.png",
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
