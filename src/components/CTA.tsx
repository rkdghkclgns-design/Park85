import { motion } from "motion/react";
import { ArrowRight, Phone, MessageCircle, Mail } from "lucide-react";
import { Button } from "./ui/button";
import { useCartStore } from "../store/cartStore";

export function CTA() {
    const setIsOpen = useCartStore((state) => state.setIsOpen);
    return (
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 via-purple-600 to-blue-700 relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 opacity-20">
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
                        backgroundImage: "radial-gradient(circle, white 2px, transparent 2px)",
                        backgroundSize: "50px 50px",
                    }}
                />
            </div>

            {/* Floating Shapes */}
            <motion.div
                animate={{
                    y: [0, -30, 0],
                    rotate: [0, 10, 0],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="absolute top-20 left-10 w-32 h-32 bg-white/10 rounded-3xl backdrop-blur-sm"
            />
            <motion.div
                animate={{
                    y: [0, 30, 0],
                    rotate: [0, -10, 0],
                }}
                transition={{
                    duration: 7,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="absolute bottom-20 right-10 w-40 h-40 bg-white/10 rounded-full backdrop-blur-sm"
            />

            <div className="max-w-6xl mx-auto relative z-10">
                <div className="text-center mb-12">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <span className="inline-block bg-white/20 backdrop-blur-sm text-white px-6 py-2 rounded-full text-sm font-semibold mb-6">
                            🎉 지금 시작하세요
                        </span>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-4xl md:text-6xl font-bold text-white mb-6"
                    >
                        더 이상 건물관리 걱정하지 마세요
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="text-xl md:text-2xl text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed"
                    >
                        첫 이용 고객님께 <span className="text-yellow-300 font-bold">30% 특별 할인</span> 혜택을 드립니다.
                        <br />
                        지금 바로 무료 상담을 신청하세요!
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
                    >
                        <motion.div
                            whileHover={{ scale: 1.05, boxShadow: "0 25px 50px rgba(0,0,0,0.3)" }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Button
                                onClick={() => setIsOpen(true)}
                                className="bg-white text-blue-600 hover:bg-gray-100 px-10 py-7 text-lg rounded-full shadow-2xl group"
                            >
                                무료 상담 신청하기
                                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </motion.div>
                    </motion.div>
                </div>

                {/* Contact Methods */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="grid md:grid-cols-3 gap-6 mb-12"
                >
                    {[
                        {
                            icon: Phone,
                            title: "전화 상담",
                            content: "010-2740-1734",
                            description: "평일 09:00 - 18:00",
                            gradient: "from-blue-500 to-blue-600",
                        },
                        {
                            icon: MessageCircle,
                            title: "카카오톡 상담",
                            content: "@본연",
                            description: "24시간 실시간 채팅",
                            gradient: "from-yellow-400 to-yellow-500",
                        },
                        {
                            icon: Mail,
                            title: "이메일 문의",
                            content: "bonyeon.cs@gmail.com",
                            description: "24시간 내 답변",
                            gradient: "from-purple-500 to-purple-600",
                        },
                    ].map((method, idx) => (
                        <motion.div
                            key={method.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.6 + idx * 0.1 }}
                            whileHover={{ y: -5, scale: 1.02 }}
                            className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-white hover:bg-white/20 transition-all cursor-pointer"
                        >
                            <motion.div
                                whileHover={{ rotate: 360 }}
                                transition={{ duration: 0.6 }}
                                className={`inline-flex p-3 bg-gradient-to-br ${method.gradient} rounded-xl mb-4`}
                            >
                                <method.icon className="w-6 h-6 text-white" />
                            </motion.div>
                            <h4 className="text-lg font-bold mb-2">{method.title}</h4>
                            <p className="text-2xl font-bold mb-1">{method.content}</p>
                            <p className="text-sm text-blue-100">{method.description}</p>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Trust Badges */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                    className="flex flex-wrap justify-center gap-8 text-white/80 text-sm"
                >
                    {[
                        "✓ 무료 견적",
                        "✓ 24시간 특급 처리",
                        "✓ 100% 책임 서비스",
                        "✓ 친환경 장비 사용",
                    ].map((badge, idx) => (
                        <motion.div
                            key={badge}
                            initial={{ opacity: 0, scale: 0.8 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: 0.9 + idx * 0.05 }}
                            whileHover={{ scale: 1.1 }}
                            className="flex items-center gap-2"
                        >
                            <span className="text-lg">{badge}</span>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
