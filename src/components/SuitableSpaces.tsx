
import { motion } from "motion/react";
import { Building2, Stethoscope, GraduationCap, Coffee, Hotel, Utensils, GalleryVerticalEnd, Store, Baby, Home, School, Landmark, TreePine, Dumbbell } from "lucide-react";
import { useEffect, useState } from "react";

const spacesOriginal = [
    { name: "사무실", icon: Building2 },
    { name: "병원", icon: Stethoscope },
    { name: "학원", icon: GraduationCap },
    { name: "어린이집", icon: Baby },
    { name: "카페", icon: Coffee },
    { name: "호텔", icon: Hotel },
    { name: "주방", icon: Utensils },
    { name: "전시장", icon: GalleryVerticalEnd },
    { name: "펜션", icon: Home },
    { name: "학교", icon: School },
    { name: "관공서", icon: Landmark },
    { name: "실외 놀이터", icon: TreePine },
    { name: "피트니스", icon: Dumbbell },
    { name: "상업공간", icon: Store },
];

export function SuitableSpaces() {
    const [spaces, setSpaces] = useState(spacesOriginal);

    useEffect(() => {
        setSpaces(spacesOriginal);
    }, []);

    return (
        <section className="py-24 bg-white text-center overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                    본연의 서비스가 적합한 공간
                </h2>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    {spaces.map((space, index) => (
                        <motion.div
                            key={`${space.name}-${index}`}
                            className="group"
                            whileHover={{ y: -5, scale: 1.02 }}
                        >
                            <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-50 h-full relative overflow-hidden aspect-square">
                                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                                    <space.icon className="w-8 h-8 text-blue-500" strokeWidth={1.5} />
                                </div>
                                <span className="font-bold text-gray-900 text-lg">{space.name}</span>

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
