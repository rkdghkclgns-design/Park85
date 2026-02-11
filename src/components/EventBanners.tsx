import { motion } from "motion/react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

export function EventBanners() {
    const banners = [
        {
            id: "EVENT 01",
            title: "정기 청소 이벤트",
            desc: "정기 청소 1년 계약 시",
            highlight: "대청소 1회 무료",
            img: "/assets/event_cleaning.png",
            badgeColor: "bg-blue-500",
            highlightColor: "text-yellow-300",
        },
        {
            id: "EVENT 02",
            title: "비수기 에어컨 이벤트",
            desc: "1월~5월 / 10월~12월 미리 준비하세요.",
            highlight: "10% 할인",
            img: "/assets/event_ac.png",
            badgeColor: "bg-blue-500",
            highlightColor: "text-yellow-300",
        },
        {
            id: "EVENT 03",
            title: "정기 소독 이벤트",
            desc: "정기 소독 1년 계약 시",
            highlight: "첫 달 무료",
            img: "/assets/event_disinfection.png",
            badgeColor: "bg-blue-500",
            highlightColor: "text-yellow-300",
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
                breakpoint: 768,
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

                {/* Desktop/Tablet: Slider */}
                <div className="hidden md:block">
                    <Slider {...settings} className="-mx-2">
                        {banners.map((item, index) => (
                            <div key={item.id} className="px-2">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                    className="rounded-2xl relative overflow-hidden h-64 cursor-pointer hover:shadow-lg transition-all group"
                                >
                                    {/* 배경 이미지 */}
                                    <img
                                        src={item.img}
                                        alt={item.title}
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />
                                    {/* 어두운 오버레이 */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

                                    {/* 텍스트 콘텐츠 */}
                                    <div className="absolute inset-0 flex flex-col justify-end p-6 z-10">
                                        <span className={`self-start ${item.badgeColor} text-white px-3 py-1 rounded-full text-xs font-bold mb-3`}>
                                            {item.id}
                                        </span>
                                        <h3 className="text-xl font-bold text-white mb-1 leading-tight">
                                            {item.title}
                                        </h3>
                                        <p className="text-sm text-gray-200 mb-2">{item.desc}</p>
                                        <div className={`${item.highlightColor} font-black text-2xl`}>
                                            {item.highlight}
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        ))}
                    </Slider>
                </div>

                {/* Mobile: Vertical List */}
                <div className="flex flex-col gap-4 md:hidden">
                    {banners.map((item, index) => (
                        <motion.div
                            key={`mobile-${item.id}`}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="rounded-2xl relative overflow-hidden h-52"
                        >
                            {/* 배경 이미지 */}
                            <img
                                src={item.img}
                                alt={item.title}
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                            {/* 어두운 오버레이 */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

                            {/* 텍스트 콘텐츠 */}
                            <div className="absolute inset-0 flex flex-col justify-end p-5 z-10">
                                <span className={`self-start ${item.badgeColor} text-white px-2 py-0.5 rounded-full text-[10px] font-bold mb-2`}>
                                    {item.id}
                                </span>
                                <h3 className="text-lg font-bold text-white mb-1">{item.title}</h3>
                                <p className="text-xs text-gray-200 mb-1">{item.desc}</p>
                                <div className={`${item.highlightColor} font-black text-xl`}>
                                    {item.highlight}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
