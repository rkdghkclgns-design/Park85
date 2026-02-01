import { motion } from "motion/react";
import { Building2, Building, Stethoscope, GraduationCap, Coffee, Hotel, Utensils, GalleryVerticalEnd, Store, Baby, Home, School, Landmark, TreePine, Dumbbell } from "lucide-react";

const spaces = [
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
    return (
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white text-center">
            <div className="max-w-7xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold mb-16 text-gray-900">
                    본연의 서비스가 적합한 공간
                </h2>

                <div className="flex flex-wrap justify-center gap-8 md:gap-12">
                    {spaces.map((space, index) => (
                        <motion.div
                            key={space.name}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="flex flex-col items-center gap-4 group"
                        >
                            <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-100 transition-colors shadow-sm">
                                <space.icon className="w-10 h-10 text-blue-300 group-hover:text-blue-500 transition-colors" strokeWidth={1.5} />
                            </div>
                            <span className="font-bold text-gray-900 text-lg">{space.name}</span>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
