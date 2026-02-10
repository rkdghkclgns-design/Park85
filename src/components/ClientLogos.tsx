
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

            {/* Mobile/Tablet: Manual Swipe - 손으로 스와이프해서 볼 수 있게 변경 */}
            <div className="relative w-full overflow-x-auto snap-x snap-mandatory block lg:hidden pb-4 scrollbar-hide">
                <div className="flex gap-4 px-4 w-max">
                    {clients.map((client, index) => (
                        <div
                            key={`logo-mobile-${index}`}
                            className="flex-shrink-0 w-40 h-24 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center p-4 snap-center"
                        >
                            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mb-2 text-gray-400">
                                <Building2 size={20} />
                            </div>
                            <span className="font-bold text-gray-700 text-sm text-center">
                                {client.name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* PC: Static Centered Row - 데스크톱에서는 정지된 화면으로 5개 나열 */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 hidden lg:flex justify-center gap-6">
                {clients.map((client, index) => (
                    <motion.div
                        key={`pc-logo-${index}`}
                        className="w-48 h-32 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center p-6 hover:shadow-md transition-shadow"
                        whileHover={{ y: -5 }}
                    >
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3 text-gray-400">
                            <Building2 size={24} />
                        </div>
                        <span className="font-bold text-gray-700 text-base text-center">
                            {client.name}
                        </span>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
