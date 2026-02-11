
import { motion } from "motion/react";

const clients = [
    { name: "씨에스 코페레이션", logo: "./assets/clients/cs_corporation.png" },
    { name: "동아지질", logo: "./assets/clients/dongajijil.png" },
    { name: "나산 건축", logo: "./assets/clients/nasan.png" },
    { name: "옛골 흑염소", logo: "./assets/clients/yetgol.png" },
    { name: "플레이 캔버스", logo: "./assets/clients/playcanvas.png" },
];

export function ClientLogos() {
    return (
        <section className="py-16 bg-gray-50 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                    함께하는 고객
                </h2>
            </div>

            {/* Mobile/Tablet: Manual Swipe */}
            <div className="relative w-full overflow-x-auto snap-x snap-mandatory block lg:hidden pb-4 scrollbar-hide">
                <div className="flex gap-4 px-4 w-max">
                    {clients.map((client, index) => (
                        <div
                            key={`logo-mobile-${index}`}
                            className="flex-shrink-0 w-40 h-28 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center p-3 snap-center"
                        >
                            <img
                                src={client.logo}
                                alt={client.name}
                                className="max-w-full max-h-full object-contain"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* PC: Static Centered Row */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 hidden lg:flex justify-center gap-6">
                {clients.map((client, index) => (
                    <motion.div
                        key={`pc-logo-${index}`}
                        className="w-52 h-36 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center p-5 hover:shadow-md transition-shadow"
                        whileHover={{ y: -5 }}
                    >
                        <img
                            src={client.logo}
                            alt={client.name}
                            className="max-w-full max-h-full object-contain"
                        />
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
