import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

export function EventBanners() {
    return (
        <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Main Banner - Regular Cleaning */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="bg-[#1a233a] rounded-2xl p-8 md:p-12 relative overflow-hidden flex flex-col md:flex-row justify-between items-center"
                >
                    <div className="relative z-10 text-white mb-6 md:mb-0">
                        <span className="inline-block bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold mb-4">EVENT 01</span>
                        <h3 className="text-2xl md:text-4xl font-bold mb-4">정기 청소 이벤트</h3>
                        <p className="text-lg md:text-xl text-gray-200">정기 청소 1년 계약 시 <br className="hidden md:block" /><span className="text-yellow-400 font-bold">대청소 1회 무료 서비스</span></p>
                    </div>
                    <div className="relative z-10 flex items-center gap-6">
                        <div className="text-right hidden md:block">
                            <div className="text-gray-400 text-sm mb-1">연간 계약 혜택</div>
                            <div className="text-4xl font-bold text-white">FREE</div>
                        </div>
                        <div className="text-white bg-white/10 p-4 rounded-full">
                            <ArrowRight className="w-8 h-8 md:w-12 md:h-12" />
                        </div>
                    </div>
                </motion.div>

                {/* Sub Banners */}
                <div className="grid md:grid-cols-2 gap-8">
                    {/* AC Cleaning Event */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="bg-[#eff6ff] rounded-2xl p-8 relative overflow-hidden h-72 md:h-80 flex flex-col justify-center"
                    >
                        <div className="relative z-10">
                            <span className="inline-block bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-bold mb-4">EVENT 02</span>
                            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">비수기 에어컨 이벤트</h3>
                            <p className="text-gray-600 mb-4 text-sm md:text-base">1월~5월 / 10월~12월 미리 준비하세요.</p>
                            <div className="text-blue-600 font-black text-3xl">10% 할인</div>
                        </div>
                        <div className="absolute right-0 bottom-0 w-1/2 h-full opacity-20 transform translate-x-4 translate-y-4">
                            <div className="w-full h-full bg-blue-400 rounded-full blur-3xl"></div>
                        </div>
                    </motion.div>

                    {/* Disinfection Event */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="bg-[#fff7ed] rounded-2xl p-8 relative overflow-hidden h-72 md:h-80 flex flex-col justify-center"
                    >
                        <div className="relative z-10">
                            <span className="inline-block bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-bold mb-4">EVENT 03</span>
                            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">정기 소독 이벤트</h3>
                            <p className="text-gray-600 mb-4 text-sm md:text-base">정기 소독 1년 계약 시</p>
                            <div className="text-orange-500 font-black text-3xl">첫 달 무료</div>
                        </div>
                        <div className="absolute right-0 bottom-0 w-1/2 h-full opacity-20 transform translate-x-4 translate-y-4">
                            <div className="w-full h-full bg-orange-400 rounded-full blur-3xl"></div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
