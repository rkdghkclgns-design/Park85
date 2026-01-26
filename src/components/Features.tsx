import { motion } from "motion/react";
import { Clock, Shield, Leaf, Truck } from "lucide-react";

const features = [
    {
        icon: Clock,
        title: "24시간 특급 서비스",
        description: "어떤 의뢰도 24시간 내 처리",
        color: "from-blue-500 to-blue-600",
    },
    {
        icon: Shield,
        title: "100% 만족 보장",
        description: "품질과 타협하지 않음",
        color: "from-purple-500 to-purple-600",
    },
    {
        icon: Leaf,
        title: "전문적인 고급 친환경 제품사용",
        description: "청결과 환경을 함께 생각함",
        color: "from-green-500 to-green-600",
    },
    {
        icon: Truck,
        title: "빠른 방문 확인",
        description: "원하시는 시간과 장소로 빠른 케어 서비스",
        color: "from-orange-500 to-orange-600",
    },
];

export function Features() {
    return (
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full opacity-5">
                <div className="absolute top-20 left-20 w-64 h-64 bg-blue-500 rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 right-20 w-80 h-80 bg-purple-500 rounded-full blur-3xl"></div>
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <span className="inline-block bg-blue-100 text-blue-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                        왜 저희를 선택해야 할까요?
                    </span>
                    <h2 className="text-4xl md:text-5xl text-gray-900 mb-4">
                        본연만의 <span className="text-blue-600">특별함</span>
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        건물 본연의 모습으로 돌아가게 해드립니다.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                            whileHover={{ y: -10, scale: 1.02 }}
                            className="group relative"
                        >
                            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 h-full">
                                {/* Icon Container with Gradient */}
                                <motion.div
                                    whileHover={{ rotate: 360, scale: 1.1 }}
                                    transition={{ duration: 0.6 }}
                                    className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.color} mb-6 shadow-lg`}
                                >
                                    <feature.icon className="w-8 h-8 text-white" />
                                </motion.div>

                                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-600 leading-relaxed">
                                    {feature.description}
                                </p>

                                {/* Hover Effect Line */}
                                <div className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 group-hover:w-full transition-all duration-500 rounded-b-2xl"></div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Additional Trust Section */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="mt-20 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-size-200 bg-pos-0 hover:bg-pos-100 transition-all duration-1000 rounded-3xl p-12 text-white relative overflow-hidden"
                >
                    {/* Animated Background Pattern */}
                    <div className="absolute inset-0 opacity-10">
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                                rotate: [0, 90, 0],
                            }}
                            transition={{
                                duration: 20,
                                repeat: Infinity,
                                ease: "linear",
                            }}
                            className="absolute top-0 left-0 w-full h-full"
                            style={{
                                backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
                                backgroundSize: "50px 50px",
                            }}
                        />
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 text-center relative z-10">
                        {[
                            { emoji: "🏆", title: "업계 1위", desc: "고객 만족도 부문" },
                            { emoji: "⚡", title: "당일 처리", desc: "빠른 크리닝" },
                            { emoji: "💎", title: "프리미엄 품질", desc: "최신식 크리닝 기술" },
                        ].map((item, idx) => (
                            <motion.div
                                key={item.title}
                                initial={{ opacity: 0, scale: 0.8 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.6 + idx * 0.1 }}
                                whileHover={{ scale: 1.1 }}
                            >
                                <div className="text-5xl mb-4">{item.emoji}</div>
                                <h4 className="text-2xl font-bold mb-2">{item.title}</h4>
                                <p className="text-blue-100">{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
