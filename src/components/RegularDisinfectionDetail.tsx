import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, Phone, Shield, Bug, HeartPulse, Award, Wind, Flame, Cloud, Info } from "lucide-react";

const needCards = [
    {
        icon: Shield,
        title: "바이러스의 생존력 차단",
        desc: "바이러스와 박테리아는 물체 표면이나 공기 중에서 수 시간에서 수일까지 생존합니다. 주기적인 소독만이 교차 감염의 고리를 끊을 수 있습니다.",
    },
    {
        icon: Bug,
        title: "해충의 번식 주기 제어",
        desc: "해충은 한 번의 소독으로 완전히 박멸되지 않습니다. 알에서 깨어나는 부화 주기에 맞춘 반복 관리가 있어야만 서식처를 원천 봉쇄할 수 있습니다.",
    },
    {
        icon: HeartPulse,
        title: "면역 취약 계층 보호",
        desc: "어린이집, 요양시설 등 면역력이 약한 분들이 머무는 공간은 법정 의무 소독 기준을 준수함과 동시에, 전문가의 세심한 상시 관리가 필수적입니다.",
    },
    {
        icon: Award,
        title: "브랜드 신뢰도 상승",
        desc: "'방역 안심 구역' 인증은 방문객과 직원들에게 심리적 안정감을 주며, 기업이나 업장의 신뢰도를 높이는 가장 확실한 방법입니다.",
    },
];

const solutions = [
    {
        number: "01",
        title: "공간 전체 살균",
        label: "ULV 초미립자 분무 소독",
        tagline: "공기 중 부유균부터 미세 틈새까지 빈틈없는 살균",
        principle: "초미립자 살포기(Ultra Low Volume)를 사용하여 소독 입자를 10~50미크론 이하의 아주 미세한 안개 형태로 분사",
        advantage: "입자가 매우 가벼워 공기 중에 오래 체류하며 손이 닿지 않는 천장, 벽면 뒤쪽, 가구 사이 틈새까지 침투. 소독 후 잔여물이 거의 남지 않아 전자 기기가 많은 사무실에서도 안전",
        effect: "공기 중 비말 감염균 및 물체 표면의 바이러스 99.9% 제거",
        icon: Wind,
        color: "bg-blue-500",
    },
    {
        number: "02",
        title: "해충 원천 차단",
        label: "잔류 분무 소독",
        tagline: "보행 해충의 유입과 번식을 막는 강력한 방어선",
        principle: "해충의 주요 이동 경로인 걸레받이, 하수구 주변, 싱크대 하부 등에 지속력이 강한 살충 성분을 미세 분무하여 잔류시키는 방식",
        advantage: "즉각적인 박멸 효과는 물론, 약제가 살포된 지점을 지나는 해충이 신경 마비를 일으켜 사멸하게 만드는 장기적인 방제 효과",
        effect: "바퀴벌레, 개미, 먼지다듬이 등 보행 해충의 실내 유입 차단 및 박멸",
        icon: Bug,
        color: "bg-emerald-500",
    },
    {
        number: "03",
        title: "정밀 고온 살균",
        label: "고압 스팀 소독",
        tagline: "화학 성분 걱정 없는 친환경 고온 물리 살균",
        principle: "100\u00B0C 이상의 고온\u00B7고압 증기를 직접 분사하여 세균의 단백질 구조를 파괴하는 물리적 소독 방식",
        advantage: "살균제 사용이 조심스러운 어린이집 교구, 장난감, 침구류, 주방 집기 등에 가장 적합. 찌든 때 제거와 살균을 동시에 해결하며 건조가 빨라 즉시 사용 가능",
        effect: "대장균, 황색포도상구균 등 식중독균 박멸 및 집먼지진드기 제거",
        icon: Flame,
        color: "bg-orange-500",
    },
    {
        number: "04",
        title: "외부 유입 방지",
        label: "광범위 연무 소독",
        tagline: "대단위 외부 공간의 해충 서식지 집중 공략",
        principle: "살충 성분을 가열하여 연기 형태로 분출시키는 방식. 연기의 확산력을 이용해 넓은 야외 공간을 순식간에 방역",
        advantage: "수풀 사이, 하수구 내부, 정화조 등 일반적인 분무가 닿지 않는 깊숙한 곳까지 연기가 침투하여 숨어있는 해충(모기, 파리 등)을 몰아냄",
        effect: "건물 외곽, 주차장, 화단 등 외부 해충 번식지 집중 관리",
        icon: Cloud,
        color: "bg-purple-500",
    },
];

function SectionTitle({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
    return (
        <div className="mb-8">
            <span className="text-[60px] sm:text-[75px] font-black text-blue-600/15 tracking-wider leading-none">{number}</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{title}</h2>
            <p className="text-gray-500 mt-2 max-w-2xl">{subtitle}</p>
        </div>
    );
}

export function RegularDisinfectionDetail() {
    const navigate = useNavigate();

    return (
        <div className="bg-white">
            {/* Hero Banner */}
            <section className="relative bg-[#1e2b4f] text-white overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: "url('./assets/services/disinfection_hero_bg.jpg')" }}
                />
                <div className="absolute inset-0 bg-[#1e2b4f]/70" />
                <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <button
                            onClick={() => navigate("/")}
                            className="flex items-center gap-2 text-white/70 hover:text-white mb-8 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="text-sm">메인으로 돌아가기</span>
                        </button>

                        <p className="text-blue-300 font-medium text-sm tracking-widest mb-3">SUBSCRIPTION DISINFECTION</p>
                        <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-4">
                            정기 소독 서비스
                        </h1>
                        <p className="text-lg sm:text-xl text-white/80 max-w-2xl leading-relaxed">
                            "보이지 않는 세균까지 맑게, 안심할 수 있는 본연의 공간을 완성합니다"
                        </p>
                        <p className="text-base text-white/60 mt-4 max-w-2xl leading-relaxed">
                            매일 머무는 공간이 언제나 바이러스와 해충으로부터 안전할 수 있도록, 본연(BONYEON)이 과학적인 4단계 입체 방역 솔루션을 통해 체계적인 정기 관리 서비스를 제공합니다.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 mt-8">
                            <a
                                href="tel:01027401734"
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-[#1e2b4f] rounded-lg font-bold hover:bg-gray-100 transition-colors"
                            >
                                <Phone className="w-4 h-4" />
                                전화 상담하기
                            </a>
                            <button
                                onClick={() => {
                                    navigate("/");
                                    setTimeout(() => {
                                        document.getElementById("section-services")?.scrollIntoView({ behavior: "smooth" });
                                    }, 100);
                                }}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-white text-white rounded-lg font-bold hover:bg-white hover:text-[#1e2b4f] transition-colors"
                            >
                                다른 서비스 보기
                            </button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 01. Why Regular Disinfection */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="01"
                            title="왜 '정기 소독'이 반드시 필요한가요?"
                            subtitle="깨끗해 보이는 공간도 눈에 보이지 않는 위험까지 방어할 수는 없습니다"
                        />
                        <div className="grid sm:grid-cols-2 gap-4">
                            {needCards.map((card, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 15 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-gray-50 rounded-xl p-6 hover:bg-blue-50/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <card.icon className="w-8 h-8 text-blue-500 flex-shrink-0" />
                                        <h3 className="font-bold text-gray-900">{card.title}</h3>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed">{card.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 02. 4-Step Disinfection Solutions */}
            <section className="py-16 px-4 sm:px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="02"
                            title="본연의 4대 입체 방역 솔루션"
                            subtitle="4가지 전문 공법을 유기적으로 결합하여, 공간 안팎의 모든 위생 위협 요소를 체계적으로 제거합니다."
                        />
                        <div className="space-y-6">
                            {solutions.map((sol, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
                                >
                                    {/* Header */}
                                    <div className="flex items-start gap-4 mb-5">
                                        <div className={`w-14 h-14 ${sol.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                            <sol.icon className="w-7 h-7 text-white" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-xs font-bold text-white px-2 py-0.5 rounded ${sol.color}`}>{sol.number}</span>
                                                <h3 className="text-xl font-bold text-gray-900">{sol.title}</h3>
                                            </div>
                                            <p className="text-sm text-blue-600 font-medium">{sol.label}</p>
                                            <p className="text-sm text-gray-500 mt-1 italic">"{sol.tagline}"</p>
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="grid sm:grid-cols-3 gap-4">
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="text-xs font-bold text-gray-400 mb-2 tracking-wider">기술 원리</p>
                                            <p className="text-sm text-gray-600 leading-relaxed">{sol.principle}</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="text-xs font-bold text-gray-400 mb-2 tracking-wider">특장점</p>
                                            <p className="text-sm text-gray-600 leading-relaxed">{sol.advantage}</p>
                                        </div>
                                        <div className="bg-blue-50 rounded-lg p-4">
                                            <p className="text-xs font-bold text-blue-400 mb-2 tracking-wider">효과</p>
                                            <p className="text-sm text-blue-700 leading-relaxed font-medium">{sol.effect}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 03. Notice */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="03"
                            title="안내 사항"
                            subtitle="본연의 방역 서비스에 대한 안내 및 보장 사항을 확인하세요."
                        />
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex items-start gap-4">
                            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Info className="w-5 h-5 text-white" />
                            </div>
                            <p className="text-gray-700 leading-relaxed">
                                본연은 환경부 승인 약제만을 엄선하여 사용하며, 모든 작업 후에는 소독 필증(소독 증명서) 발행을 통해 철저한 사후 관리를 보장합니다.
                            </p>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-16 px-4 sm:px-6 bg-[#1e2b4f] text-white text-center">
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                        안심할 수 있는 공간, 정기 소독으로 시작하세요
                    </h2>
                    <p className="text-white/70 mb-8">
                        전문 상담을 통해 귀사에 최적화된 방역 솔루션을 제안해 드립니다.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <a
                            href="tel:01027401734"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#1e2b4f] rounded-lg font-bold hover:bg-gray-100 transition-colors"
                        >
                            <Phone className="w-5 h-5" />
                            010-2740-1734
                        </a>
                        <button
                            onClick={() => navigate("/")}
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white text-white rounded-lg font-bold hover:bg-white hover:text-[#1e2b4f] transition-colors"
                        >
                            메인으로 돌아가기
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
