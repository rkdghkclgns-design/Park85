import { motion } from "motion/react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

export function EventBanners() {
    // 각 배너는 하나의 이미지로 구성
    const banners = [
        { id: "event-1", img: "/assets/event_cleaning.png", alt: "정기 청소 이벤트" },
        { id: "event-2", img: "/assets/event_ac.png", alt: "비수기 에어컨 이벤트" },
        { id: "event-3", img: "/assets/event_disinfection.png", alt: "정기 소독 이벤트" },
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
                                    className="rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-all"
                                >
                                    <img
                                        src={item.img}
                                        alt={item.alt}
                                        className="w-full h-auto object-cover rounded-2xl"
                                    />
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
                            className="rounded-2xl overflow-hidden"
                        >
                            <img
                                src={item.img}
                                alt={item.alt}
                                className="w-full h-auto object-cover rounded-2xl"
                            />
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
