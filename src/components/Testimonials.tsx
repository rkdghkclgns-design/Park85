import { motion } from "motion/react";
import { Star, Quote } from "lucide-react";

const testimonials = [
    {
        name: "카페 로블루",
        role: "서울 마포구",
        image: "./assets/clients/client_1.png",
        rating: 5,
        text: "바쁜 매장 운영 중에도 신경 쓸 필요 없이 항상 깨끗하게 유지해주셔서 감사합니다. 손님들도 쾌적해하세요!",
        featured: true,
    },
    {
        name: "스타트업 라운지",
        role: "경기 판교",
        image: "./assets/clients/client_2_new.png",
        rating: 5,
        text: "직원들이 출근할 때마다 상쾌함을 느낍니다. 정기 관리 덕분에 업무 효율도 오르는 것 같아요.",
    },
    {
        name: "하늘소아과",
        role: "인천 송도",
        image: "./assets/clients/client_3.png",
        rating: 5,
        text: "병원이다 보니 위생이 가장 중요한데, 본연의 친환경 소독 서비스 덕분에 안심하고 진료합니다.",
        featured: true,
    },
    {
        name: "메가 스터디카페",
        role: "서울 강남구",
        image: "./assets/clients/client_student.png",
        rating: 5,
        text: "학생들이 공부하는 공간이라 공기질까지 신경 써주시니 학부모님들도 좋아하십니다.",
    },
    {
        name: "더 피트니스",
        role: "경기 일산",
        image: "./assets/clients/client_fitness_new.png",
        rating: 5,
        text: "운동 기구 사이사이 먼지까지 꼼꼼하게 제거해주셔서 회원님들 만족도가 정말 높습니다.",
        featured: true,
    },
    {
        name: "공유오피스 워크",
        role: "대전 서구",
        image: "./assets/clients/client_owner_new.png",
        rating: 5,
        text: "다양한 사람들이 오가는 곳인데 화장실부터 회의실까지 항상 완벽하게 관리해주십니다.",
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




            </div>
        </section>
    );
}
