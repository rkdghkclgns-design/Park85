import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

export function EventBanners() {
    const banners = [
        {
            id: "EVENT 01",
            title: "정기 청소 이벤트",
            desc: <>정기 청소 1년 계약 시 <br className="hidden md:block" /><span className="text-yellow-400 font-bold">대청소 1회 무료 서비스</span></>,
            img: "/assets/event_cleaning.png",
            bgColor: "bg-[#1a233a]",
            textColor: "text-white",
            badgeColor: "bg-blue-500",
            imgPosition: "object-right"
        },
        {
            id: "EVENT 02",
            title: "비수기 에어컨 이벤트",
            desc: "1월~5월 / 10월~12월 미리 준비하세요.",
            highlight: "10% 할인",
            img: "/assets/event_ac.png",
            bgColor: "bg-[#eff6ff]",
            textColor: "text-gray-900",
            badgeColor: "bg-blue-100",
            badgeTextColor: "text-blue-600",
            highlightColor: "text-blue-600",
            imgPosition: "object-right"
        },
        {
            id: "EVENT 03",
            title: "정기 소독 이벤트",
            desc: "정기 소독 1년 계약 시",
            highlight: "첫 달 무료",
            img: "/assets/event_disinfection.png",
            bgColor: "bg-[#fff7ed]",
            textColor: "text-gray-900",
            badgeColor: "bg-orange-100",
            badgeTextColor: "text-orange-600",
            highlightColor: "text-orange-500",
            imgPosition: "object-right"
        }
    ];

    const settings = {
        dots: true,
        infinite: true,
        speed: 500,
        slidesToShow: 3,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 3000,
        responsive: [
            {
                breakpoint: 1024,
                settings: {
                    slidesToShow: 2,
                    slidesToScroll: 1,
                }
            },
            {
                breakpoint: 768, // Increased breakpoint to cover larger phones/small tablets
                settings: {
                    slidesToShow: 1,
                    slidesToScroll: 1
                }
            }
        ]
    };

    return (
        <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white overflow-hidden">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-10"
                >
                    <span className="inline-block bg-blue-100 text-blue-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                        EVENT
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                        이달의 <span className="text-blue-600">이벤트</span>
                    </h2>
                </motion.div>
                <Slider {...settings} className="-mx-2">
                    {banners.map((item, index) => (
                        <div key={item.id} className="px-2">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className={`${item.bgColor} rounded-2xl relative overflow-hidden h-52 md:h-64 flex flex-col justify-center p-4 md:p-8 cursor-pointer hover:shadow-lg transition-all`}
                            >
                                {/* Badge - Absolutely Positioned */}
                                <span className={`absolute top-4 left-4 md:top-6 md:left-6 z-20 inline-block ${item.badgeColor} ${item.badgeTextColor || 'text-white'} px-2 md:px-3 py-1 rounded-full text-[10px] md:text-sm font-bold`}>
                                    {item.id}
                                </span>

                                <div className="relative z-10 w-[55%] break-keep">
                                    <h3 className={`text-lg md:text-2xl font-bold mb-1 md:mb-3 leading-tight ${item.textColor}`}>
                                        {item.title}
                                    </h3>
                                    <div className={`text-xs md:text-base mb-2 md:mb-4 leading-relaxed ${item.textColor === 'text-white' ? 'text-gray-200' : 'text-gray-600'}`}>
                                        {item.desc}
                                    </div>
                                    {item.highlight && (
                                        <div className={`${item.highlightColor} font-black text-lg md:text-3xl`}>
                                            {item.highlight}
                                        </div>
                                    )}
                                </div>
                                <div className="absolute right-0 top-0 bottom-0 w-[45%] h-full z-0 overflow-hidden">
                                    <img
                                        src={item.img}
                                        alt={item.title}
                                        className={`w-full h-full ${item.imgPosition}`}
                                    />
                                </div>
                            </motion.div>
                        </div>
                    ))}
                </Slider>
            </div>
        </section>
    );
}

