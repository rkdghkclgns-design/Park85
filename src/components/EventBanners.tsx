import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

export function EventBanners() {
    return (
        <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Main Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="bg-[#1a233a] rounded-2xl p-8 md:p-12 relative overflow-hidden flex flex-col md:flex-row justify-between items-center"
                >
                    <div className="relative z-10 text-white mb-6 md:mb-0">
                        <h3 className="text-2xl md:text-3xl font-bold mb-2">사무실 통합 관리</h3>
                        <p className="text-xl text-gray-200">함께 견적받고 최대 20% 추가할인</p>
                    </div>
                    <div className="relative z-10 flex items-center gap-8">
                        <div className="flex flex-col gap-2">
                            <span className="bg-white text-[#1a233a] px-3 py-1 rounded font-bold text-sm transform -rotate-6 shadow-lg inline-block text-center">미화관리</span>
                            <span className="bg-white text-[#1a233a] px-3 py-1 rounded font-bold text-sm transform rotate-6 shadow-lg inline-block text-center">스낵</span>
                            <span className="bg-white text-[#1a233a] px-3 py-1 rounded font-bold text-sm transform -rotate-3 shadow-lg inline-block text-center">비품/렌탈</span>
                        </div>
                        <div className="text-6xl md:text-8xl font-black text-white leading-none">
                            20%
                        </div>
                        <div className="text-white">
                            <ArrowRight className="w-12 h-12 md:w-16 md:h-16 transform rotate-90 md:rotate-0" />
                        </div>
                    </div>
                </motion.div>

                {/* Sub Banners */}
                <div className="grid md:grid-cols-2 gap-8">
                    {/* AC Cleaning */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="bg-[#eff6ff] rounded-2xl p-8 relative overflow-hidden h-64 md:h-80 flex flex-col justify-center"
                    >
                        <div className="relative z-10">
                            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">세균, 냄새 완벽 제거<br />냉난방기 청소</h3>
                        </div>
                        <div className="absolute right-0 bottom-0 top-0 w-1/2">
                            <img
                                src="https://images.unsplash.com/photo-1621905251918-48416bd8575a?q=80&w=2069&auto=format&fit=crop"
                                alt="AC Cleaning"
                                className="w-full h-full object-cover mask-image-gradient"
                                style={{ maskImage: 'linear-gradient(to right, transparent, black)' }}
                            />
                        </div>
                        <div className="absolute bottom-8 left-8 z-10">
                            <span className="text-blue-500 font-black text-3xl">UP TO 30%</span>
                        </div>
                    </motion.div>

                    {/* Fabric Care */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="bg-[#fff7ed] rounded-2xl p-8 relative overflow-hidden h-64 md:h-80 flex flex-col justify-center"
                    >
                        <div className="relative z-10">
                            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">생활 얼룩부터 묵은때 까지<br />패브릭&카페트 관리</h3>
                        </div>
                        <div className="absolute right-0 bottom-0 top-0 w-1/2">
                            <img
                                src="https://images.unsplash.com/photo-1558317374-a35186516d22?q=80&w=1965&auto=format&fit=crop"
                                alt="Fabric Cleaning"
                                className="w-full h-full object-cover"
                                style={{ maskImage: 'linear-gradient(to right, transparent, black)' }}
                            />
                        </div>
                        <div className="absolute bottom-8 left-8 z-10">
                            <span className="text-orange-400 font-black text-3xl">UP TO 30%</span>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
