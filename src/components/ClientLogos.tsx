
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";

const clients = [
    { name: "삼성전자", logo: "" },
    { name: "LG디스플레이", logo: "" },
    { name: "카카오", logo: "" },
    { name: "네이버", logo: "" },
    { name: "SK하이닉스", logo: "" },
    { name: "현대자동차", logo: "" },
    { name: "CJ ENM", logo: "" },
    { name: "우아한형제들", logo: "" },
    { name: "쿠팡", logo: "" },
    { name: "비바리퍼블리카", logo: "" },
    { name: "GS리테일", logo: "" },
    { name: "롯데쇼핑", logo: "" },
];

export function ClientLogos() {
    const [randomizedClients, setRandomizedClients] = useState(clients);

    useEffect(() => {
        setRandomizedClients([...clients].sort(() => Math.random() - 0.5));
    }, []);

    return (
        <section className="py-16 bg-gray-50 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                    함께하는 고객
                </h2>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative flex overflow-x-hidden">
                <div className="flex animate-marquee whitespace-nowrap py-4">
                    {[...randomizedClients, ...randomizedClients].map((client, index) => (
                        <motion.div
                            key={`${client.name}-${index}`}
                            className="flex-none w-[50vw] sm:w-[33.33vw] md:w-[25vw] lg:w-[14.2857vw] xl:w-[182.85px] px-4 group"
                            whileHover={{ y: -5, scale: 1.02 }}
                        >
                            <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 w-full h-40 relative overflow-hidden">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                    {/* Placeholder for actual logo */}
                                    <Building2 size={24} />
                                </div>
                                <span className="font-bold text-gray-700 text-sm whitespace-normal text-center line-clamp-2 group-hover:text-gray-900 transition-colors">
                                    {client.name}
                                </span>

                                {/* Hover Effect Line */}
                                <div className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 group-hover:w-full transition-all duration-500"></div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
