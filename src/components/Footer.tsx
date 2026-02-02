import { motion } from "motion/react";
import { Facebook, Instagram, Youtube, Mail, Phone, MapPin, Send } from "lucide-react";
import { Button } from "./ui/button";

export function Footer() {
    return (
        <footer className="bg-gray-900 text-gray-300 pt-20 pb-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute top-0 left-0 w-full h-full" style={{
                    backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                }} />
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Main Footer Content */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12 mt-16">
                    {/* Company Info */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                    >
                        <img src="./assets/logo.png" alt="본연" className="h-12 w-auto mb-6 object-contain" />
                        <p className="text-gray-400 mb-6 leading-relaxed">
                            프리미엄 서비스 & 정기관리 크리닝 서비스, 당신의 소중한 시간을 만들어 드립니다.
                        </p>
                        <div className="flex gap-4">
                            {[
                                { icon: Facebook, link: "#" },
                                { icon: Instagram, link: "#" },
                                { icon: Youtube, link: "#" },
                            ].map((social, idx) => (
                                <motion.a
                                    key={idx}
                                    href={social.link}
                                    whileHover={{ scale: 1.2, rotate: 360 }}
                                    transition={{ duration: 0.5 }}
                                    className="bg-gray-800 p-3 rounded-full hover:bg-gradient-to-br hover:from-blue-600 hover:to-purple-600 transition-all"
                                >
                                    <social.icon className="w-5 h-5" />
                                </motion.a>
                            ))}
                        </div>
                    </motion.div>

                    {/* Quick Links */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <h4 className="text-white text-lg font-bold mb-4">빠른 링크</h4>
                        <ul className="space-y-3">
                            {[
                                "서비스 소개",
                                "이용 방법",
                                "고객 후기",
                            ].map((link, idx) => (
                                <li key={link}>
                                    <motion.a
                                        href="#"
                                        whileHover={{ x: 5, color: "#3B82F6" }}
                                        className="hover:text-blue-400 transition-all inline-block"
                                    >
                                        {link}
                                    </motion.a>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Support */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                    >
                        <h4 className="text-white text-lg font-bold mb-4">고객 지원</h4>
                        <ul className="space-y-3">
                            {[
                                "자주 묻는 질문",
                                "이용 가이드",
                                "서비스 지역",
                                "제휴 문의",
                                "개인정보처리방침",
                                "이용약관",
                            ].map((link, idx) => (
                                <li key={link}>
                                    <motion.a
                                        href="#"
                                        whileHover={{ x: 5, color: "#3B82F6" }}
                                        className="hover:text-blue-400 transition-all inline-block"
                                    >
                                        {link}
                                    </motion.a>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Contact */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                    >
                        <h4 className="text-white text-lg font-bold mb-4">문의하기</h4>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 mt-1 flex-shrink-0 text-blue-400" />
                                <span className="leading-relaxed">
                                    경기도 포천시 영북면 북원로 254-15, 1층
                                </span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Phone className="w-5 h-5 flex-shrink-0 text-blue-400" />
                                <motion.a
                                    href="tel:01027401734"
                                    whileHover={{ scale: 1.05, color: "#3B82F6" }}
                                    className="hover:text-blue-400 transition-all"
                                >
                                    010-2740-1734
                                </motion.a>
                            </li>
                            <li className="flex items-center gap-3">
                                <Mail className="w-5 h-5 flex-shrink-0 text-blue-400" />
                                <motion.a
                                    href="mailto:bonyeon.cs@gmail.com"
                                    whileHover={{ scale: 1.05, color: "#3B82F6" }}
                                    className="hover:text-blue-400 transition-all"
                                >
                                    bonyeon.cs@gmail.com
                                </motion.a>
                            </li>
                        </ul>

                        <div className="mt-6 p-4 bg-gray-800 rounded-xl">
                            <p className="text-sm text-gray-400 mb-2">고객센터 운영시간</p>
                            <p className="text-white font-semibold">평일 09:00 - 18:00</p>
                            <p className="text-sm text-gray-400">주말 및 공휴일 휴무</p>
                        </div>
                    </motion.div>
                </div>

                {/* Certifications */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="border-t border-gray-800 pt-8 mb-8"
                >
                    <div className="grid md:grid-cols-4 gap-6 text-center">
                        {[
                            { icon: "🏆", title: "품질인증", subtitle: "ISO 9001" },
                            { icon: "🌿", title: "친환경인증", subtitle: "Green Clean" },
                            { icon: "⭐", title: "우수기업", subtitle: "Best Award" },
                        ].map((cert, idx) => (
                            <motion.div
                                key={cert.title}
                                whileHover={{ scale: 1.05 }}
                                className="bg-gray-800 rounded-xl p-4"
                            >
                                <div className="text-3xl mb-2">{cert.icon}</div>
                                <div className="text-white font-semibold">{cert.title}</div>
                                <div className="text-sm text-gray-400">{cert.subtitle}</div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Bottom Bar */}
                <div className="border-t border-gray-800 pt-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="text-gray-400 text-sm">
                            <p className="mb-2">
                                <span className="text-white">본연</span> | 대표자: 박해담 | 사업자등록번호: 166-19-02708
                            </p>
                            <p>주소: 경기도 포천시 영북면 북원로 254-15, 1층</p>
                        </div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.6 }}
                        className="text-center mt-6 pt-6 border-t border-gray-800"
                    >
                        <p className="text-gray-400 text-sm">
                            © 2026 본연. All rights reserved.
                        </p>
                    </motion.div>
                </div>
            </div>
        </footer>
    );
}
