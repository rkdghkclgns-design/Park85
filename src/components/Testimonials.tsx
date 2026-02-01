import { motion } from "motion/react";
import { Star, Quote } from "lucide-react";

const testimonials = [
    {
        name: "김민지",
        role: "직장인",
        image: "./assets/clients/client_1.png",
        rating: 5,
        text: "바쁜 일상 속에서 건물 관리 걱정을 덜 수 있어서 정말 좋아요. 청소부터 관리까지 완벽하고 품질도 최고입니다!",
        featured: true,
    },
    {
        name: "박준호",
        role: "소상공인",
        image: "./assets/clients/client_2.png",
        rating: 5,
        text: "매장 청소를 맡기는데 항상 깔끔하게 관리되어 옵니다. 시간 약속도 정확하고 서비스가 전문적이에요.",
    },
    {
        name: "이수연",
        role: "3아이 엄마",
        image: "./assets/clients/client_3.png",
        rating: 5,
        text: "건물 관리가 정말 힘들었는데 본연 덕분에 주말을 되찾았어요. 친환경 장비라 안심되고 좋습니다.",
        featured: true,
    },
    {
        name: "최태영",
        role: "대학생",
        image: "./assets/clients/client_student.png",
        rating: 5,
        text: "학생 할인도 있고 가격도 합리적이에요. 기숙사 생활하면서 청소 스트레스가 없어졌어요.",
    },
    {
        name: "정하은",
        role: "간호사",
        image: "./assets/clients/client_nurse.png",
        rating: 5,
        text: "야근이 많아 청소할 시간이 없었는데 정말 편리합니다. 늦은 시간에도 관리 가능해서 감사해요!",
        featured: true,
    },
    {
        name: "강동훈",
        role: "사업가",
        image: "./assets/clients/client_owner.png",
        rating: 5,
        text: "사무실 청소를 맡기는데 항상 새것처럼 깨끗해요. 프리미엄 서비스가 가격 대비 정말 만족스럽습니다.",
    },
];

export function Testimonials() {
    return (
        <section id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-20"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-100 rounded-full blur-3xl opacity-20"></div>

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <span className="inline-block bg-blue-100 text-blue-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                        고객 후기
                    </span>
                    <h2 className="text-4xl md:text-5xl text-gray-900 mb-4">
                        고객님들의 <span className="text-blue-600">생생한 이야기</span>
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        15,000명 이상의 고객님들이 본연과 함께하고 있습니다
                    </p>
                </motion.div>

                {/* Testimonials Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                    {testimonials.map((testimonial, index) => (
                        <motion.div
                            key={testimonial.name}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                            whileHover={{ y: -10 }}
                            className={`relative bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 ${testimonial.featured ? "ring-2 ring-blue-200" : ""
                                }`}
                        >
                            {/* Quote Icon */}
                            <div className="absolute -top-4 -left-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-3 shadow-lg">
                                <Quote className="w-6 h-6 text-white" />
                            </div>

                            {/* Rating */}
                            <div className="flex gap-1 mb-4">
                                {[...Array(testimonial.rating)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ scale: 0 }}
                                        whileInView={{ scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.3, delay: index * 0.1 + i * 0.05 }}
                                    >
                                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                    </motion.div>
                                ))}
                            </div>

                            {/* Text */}
                            <p className="text-gray-700 mb-6 leading-relaxed text-lg">
                                "{testimonial.text}"
                            </p>

                            {/* Author */}
                            <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
                                <motion.img
                                    whileHover={{ scale: 1.1 }}
                                    src={testimonial.image}
                                    alt={testimonial.name}
                                    className="w-14 h-14 rounded-full object-cover ring-2 ring-blue-100"
                                />
                                <div>
                                    <div className="font-bold text-gray-900 text-lg">{testimonial.name}</div>
                                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                                </div>
                            </div>

                            {/* Featured Badge */}
                            {testimonial.featured && (
                                <div className="absolute top-4 right-4 bg-blue-100 text-blue-600 text-xs px-3 py-1 rounded-full font-semibold">
                                    ⭐ BEST
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>

                {/* Stats Section */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-size-200 bg-pos-0 hover:bg-pos-100 transition-all duration-1000 rounded-3xl p-12 text-white relative overflow-hidden"
                >
                    {/* Animated Background */}
                    <div className="absolute inset-0 opacity-10">
                        <motion.div
                            animate={{
                                scale: [1, 1.5, 1],
                                rotate: [0, 180, 360],
                            }}
                            transition={{
                                duration: 15,
                                repeat: Infinity,
                                ease: "linear",
                            }}
                            className="absolute top-0 left-0 w-full h-full"
                            style={{
                                backgroundImage: "radial-gradient(circle, white 2px, transparent 2px)",
                                backgroundSize: "40px 40px",
                            }}
                        />
                    </div>

                    <div className="grid md:grid-cols-4 gap-8 text-center relative z-10">
                        {[
                            { number: "4.9", suffix: "/5", label: "평균 만족도", icon: "⭐" },
                            { number: "15,000", suffix: "+", label: "누적 고객", icon: "👥" },
                            { number: "100,000", suffix: "+", label: "완료된 크리닝", icon: "✨" },
                            { number: "99", suffix: "%", label: "재이용률", icon: "💯" },
                        ].map((stat, idx) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, scale: 0.5 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.7 + idx * 0.1, type: "spring" }}
                                whileHover={{ scale: 1.1 }}
                            >
                                <div className="text-5xl mb-2">{stat.icon}</div>
                                <div className="flex items-baseline justify-center mb-2">
                                    <motion.span
                                        initial={{ opacity: 0 }}
                                        whileInView={{ opacity: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 1, delay: 0.9 + idx * 0.1 }}
                                        className="text-5xl font-bold"
                                    >
                                        {stat.number}
                                    </motion.span>
                                    <span className="text-2xl ml-1">{stat.suffix}</span>
                                </div>
                                <div className="text-blue-100 font-medium">{stat.label}</div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>


            </div>
        </section>
    );
}
