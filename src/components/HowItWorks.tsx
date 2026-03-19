import { motion } from "motion/react";
import { Calendar, Package, Sparkles, Home, ArrowRight } from "lucide-react";
import { useCartStore } from "../store/cartStore";

const steps = [
    {
        icon: Calendar,
        title: "예약하기",
        description: "간편하게 원하는 시간을 선택하세요.",
        step: "01",
        color: "from-blue-500 to-blue-600",
    },
    {
        icon: Package,
        title: "빠른 방문",
        description: "전문 기사님이 약속된 시간에 빠르게 방문드립니다.",
        step: "02",
        color: "from-purple-500 to-purple-600",
    },
    {
        icon: Sparkles,
        title: "전문적인 클리어링",
        description: "최신식 친환경 장비로 맞춤 서비스해드립니다.",
        step: "03",
        color: "from-green-500 to-green-600",
    },
    {
        icon: Home,
        title: "클리어링 완료",
        description: "24~48시간 내 깨끗한 모습으로 돌려드립니다.",
        step: "04",
        color: "from-orange-500 to-orange-600",
    },
];

export function HowItWorks() {
    const setIsOpen = useCartStore((state) => state.setIsOpen);
    return (
        <section id="section-how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-20"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-100 rounded-full blur-3xl opacity-20"></div>

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-20"
                >
                    <span className="inline-block bg-blue-100 text-blue-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                        이용 방법
                    </span>
                    <h2 className="text-4xl md:text-5xl text-gray-900 mb-4">
                        <span className="text-blue-600">4단계</span>로 끝나는 간편한 건물관리
                    </h2>
                    {/* Description removed as per request */}
                </motion.div>

                {/* Steps */}
                <div className="relative">
                    {/* Connecting Line - Desktop */}
                    <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2">
                        <motion.div
                            initial={{ scaleX: 0 }}
                            whileInView={{ scaleX: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.5, delay: 0.3 }}
                            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 origin-left"
                        />
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative text-center">
                        {[
                            { step: "STEP 01", title: "서비스 신청", desc: "온라인/전화 간편 상담 신청", icon: Calendar, color: "from-blue-500 to-blue-600" },
                            { step: "STEP 02", title: "일정 확정", desc: "전문 매니저의 해피콜 및 일정 조율", icon: Package, color: "from-purple-500 to-purple-600" },
                            { step: "STEP 03", title: "서비스 진행", desc: "전문가 방문 및 맞춤형 케어 진행", icon: Sparkles, color: "from-green-500 to-green-600" },
                            { step: "STEP 04", title: "결제 및 사후관리", desc: "서비스 완료 확인 및 만족도 조사", icon: Home, color: "from-orange-500 to-orange-600" },
                        ].map((item, index) => (
                            <motion.div
                                key={item.step}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: index * 0.15 }}
                                whileHover={{ y: -10, scale: 1.02 }}
                                className="relative group flex flex-col items-center"
                            >
                                <div className="bg-white rounded-2xl p-8 w-full h-full shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 flex flex-col items-center text-center">
                                    <span className="text-blue-600 font-bold mb-4 tracking-widest">{item.step}</span>

                                    <motion.div
                                        whileHover={{ rotate: 360, scale: 1.1 }}
                                        transition={{ duration: 0.6 }}
                                        className={`p-4 rounded-2xl bg-gradient-to-br ${item.color} mb-6 shadow-lg`}
                                    >
                                        <item.icon className="w-8 h-8 text-white" />
                                    </motion.div>

                                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{item.title}</h3>
                                    <p className="text-gray-500 text-sm break-keep">{item.desc}</p>
                                </div>

                                {/* Hover Effect Line */}
                                <div className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 group-hover:w-full transition-all duration-500 rounded-b-2xl"></div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* CTA Section */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.7 }}
                    className="mt-20"
                >
                    <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-size-200 bg-pos-0 hover:bg-pos-100 transition-all duration-1000 rounded-3xl p-12 md:p-16 text-white text-center relative overflow-hidden">
                        {/* Animated Background */}
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                                rotate: [0, 180, 360],
                            }}
                            transition={{
                                duration: 20,
                                repeat: Infinity,
                                ease: "linear",
                            }}
                            className="absolute inset-0 opacity-10"
                        >
                            <div className="absolute top-0 left-0 w-full h-full" style={{
                                backgroundImage: "radial-gradient(circle, white 2px, transparent 2px)",
                                backgroundSize: "50px 50px",
                            }} />
                        </motion.div>

                        <div className="relative z-10">
                            <motion.div
                                initial={{ scale: 0 }}
                                whileInView={{ scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, type: "spring" }}
                                className="inline-block bg-white/20 backdrop-blur-sm rounded-full px-6 py-2 mb-6"
                            >
                                <span className="text-sm font-semibold">🎉 지금 바로 시작하세요!</span>
                            </motion.div>

                            <h3 className="text-3xl md:text-4xl font-bold mb-4">
                                더 이상 건물관리 걱정하지 마세요
                            </h3>
                            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                                지금 바로 무료 상담을 신청하세요!
                            </p>


                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
