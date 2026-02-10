
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

            <div className="relative w-full overflow-hidden">
                <div className="flex animate-marquee gap-8">
                    {/* First set of logos */}
                    {clients.map((client, index) => (
                        <div
                            key={`logo-1-${index}`}
                            className="flex-shrink-0 w-40 h-24 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center p-4"
                        >
                            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mb-2 text-gray-400">
                                <Building2 size={20} />
                            </div>
                            <span className="font-bold text-gray-700 text-sm text-center">
                                {client.name}
                            </span>
                        </div>
                    ))}
                    {/* Duplicate set for seamless scrolling */}
                    {clients.map((client, index) => (
                        <div
                            key={`logo-2-${index}`}
                            className="flex-shrink-0 w-40 h-24 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center p-4"
                        >
                            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mb-2 text-gray-400">
                                <Building2 size={20} />
                            </div>
                            <span className="font-bold text-gray-700 text-sm text-center">
                                {client.name}
                            </span>
                        </div>
                    ))}
                    {/* Triplicate set for wider screens just in case */}
                    {clients.map((client, index) => (
                        <div
                            key={`logo-3-${index}`}
                            className="flex-shrink-0 w-40 h-24 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center p-4"
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
        </section>
    );
}
