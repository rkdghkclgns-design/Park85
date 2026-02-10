
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";

const clients = [
    { name: "씨에스 코페레이션", logo: "" },
    { name: "동아지질", logo: "" },
    { name: "옛골 흑염소", logo: "" },
    { name: "나산 건축", logo: "" },
    { name: "플레이 캔버스", logo: "" },
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

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-wrap justify-center gap-4">
                    {randomizedClients.map((client, index) => (
                        <motion.div
                            key={`${client.name}-${index}`}
                            className="group w-[calc(50%-0.5rem)] md:w-[calc(33.33%-0.7rem)] lg:w-[calc(20%-0.8rem)]"
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
