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
        <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden">
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
                        {steps.map((step, index) => (
                            <motion.div
                                key={step.title}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: index * 0.15 }}
                                className="relative flex flex-col items-center"
                            >
                                <motion.div
                                    whileHover={{ scale: 1.05, y: -10 }}
                                    className="bg-white rounded-3xl p-8 flex flex-col items-center h-full w-full relative z-10 shadow-lg hover:shadow-2xl transition-all border border-gray-100"
                                >
                                    {/* Step Number Badge */}
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        whileInView={{ scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.5, delay: index * 0.15 + 0.3, type: "spring" }}
                                        className={`absolute -top-6 left-1/2 -translate-x-1/2 w-16 h-16 bg-gradient-to-br ${step.color} text-white rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg rotate-12 hover:rotate-0 transition-transform`}
                                    >
                                        {step.step}
                                    </motion.div>

                                    {/* Icon */}
                                    <motion.div
                                        whileHover={{ rotate: 360 }}
                                        transition={{ duration: 0.6 }}
                                        className={`inline-flex p-6 bg-gradient-to-br ${step.color} rounded-3xl mb-6 mt-8 shadow-xl`}
                                    >
                                        <step.icon className="w-10 h-10 text-white" />
                                    </motion.div>

                                    {/* Content */}
                                    <h3 className="text-2xl font-bold text-gray-900 mb-4 whitespace-nowrap">
                                        {step.title}
                                    </h3>
                                    <p className="text-gray-600 leading-relaxed break-keep">
                                        {step.description}
                                    </p>
                                </motion.div>
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
                                첫 이용 고객 특별 할인
                            </h3>
                            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                                신규 가입 시 첫 클리닝 30% 할인 혜택을 드립니다
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <motion.button
                                    whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setIsOpen(true)}
                                    className="bg-white text-blue-600 px-10 py-4 rounded-full text-lg font-semibold hover:bg-gray-100 transition-all shadow-xl"
                                >
                                    무료 상담 신청
                                </motion.button>
                            </div>

                            {/* Trust Badges */}
                            <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm">
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span>무료 견적</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span>100% 책임 서비스</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span>친환경 장비 사용</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
