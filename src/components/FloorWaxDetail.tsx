import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
    ArrowLeft,
    Phone,
    ShieldCheck,
    Sparkles,
    TrendingUp,
    DollarSign,
    Bug,
    Eye,
    ScanSearch,
    Eraser,
    Droplets,
    Layers,
    ClipboardCheck,
    Leaf,
    Target,
    Settings,
    BookOpen,
} from "lucide-react";

const whyWaxCards = [
    {
        icon: ShieldCheck,
        title: "자산 가치 보호",
        desc: "바닥재 기공 침투를 방지하여 오염과 마모로부터 원본 자재를 보호합니다. 왁스 코팅은 바닥 교체 비용을 줄이는 가장 효과적인 예방 투자입니다.",
        color: "bg-blue-500",
    },
    {
        icon: TrendingUp,
        title: "유지 관리 효율성",
        desc: "왁스 코팅 표면은 미끄럼을 방지하고 일상 청소의 효율을 높여, 관리 인력과 시간을 절감합니다.",
        color: "bg-emerald-500",
    },
    {
        icon: Sparkles,
        title: "브랜드 이미지 제고",
        desc: "은은한 광택이 감도는 바닥은 공간의 품격을 높이고, 방문객에게 신뢰감 있는 첫인상을 전달합니다.",
        color: "bg-purple-500",
    },
];

const whyBonyeonPoints = [
    {
        icon: DollarSign,
        title: "LCC(생애주기비용) 절감",
        desc: "본연의 프리미엄 왁스 코팅은 바닥재 교체 주기를 3배 이상 연장하여 장기적 유지 비용을 획기적으로 줄입니다.",
        color: "bg-amber-500",
    },
    {
        icon: Bug,
        title: "미세먼지 & 세균 억제",
        desc: "코팅막이 바닥 기공을 밀봉하여 먼지와 세균의 서식 환경을 원천 차단, 위생적인 공간을 유지합니다.",
        color: "bg-emerald-500",
    },
    {
        icon: Eye,
        title: "시각적 깊이감 구현",
        desc: "다층 코팅 기술로 단순한 반짝임이 아닌, 바닥 자재 본연의 질감과 색감을 살린 고급스러운 깊이감을 연출합니다.",
        color: "bg-blue-500",
    },
];

const processSteps = [
    {
        step: "STEP 01",
        label: "Diagnosis",
        title: "표면 정밀 진단",
        desc: "바닥 자재의 종류, 손상 정도, 기존 왁스 상태를 정밀 분석하여 최적의 시공 전략을 수립합니다.",
        icon: ScanSearch,
        color: "bg-blue-500",
    },
    {
        step: "STEP 02",
        label: "Stripping",
        title: "정밀 박리",
        desc: "구왁스 및 오염층을 전문 마루 광택기와 박리제를 사용하여 완벽하게 제거합니다. 새 코팅의 밀착력을 결정하는 핵심 공정입니다.",
        icon: Eraser,
        color: "bg-red-500",
    },
    {
        step: "STEP 03",
        label: "Neutralize",
        title: "잔여물 흡입 & 중화 처리",
        desc: "박리 후 남은 잔여 약품과 오염물을 흡입 제거하고, 표면을 중화 처리하여 새 왁스의 접착 환경을 완성합니다.",
        icon: Droplets,
        color: "bg-cyan-500",
    },
    {
        step: "STEP 04",
        label: "Coating",
        title: "프리미엄 코팅막 형성",
        desc: "프리미엄 왁스를 다층으로 도포하여 내구성과 광택을 극대화합니다. 각 층이 완전히 건조된 후 다음 층을 시공하는 정밀 공정입니다.",
        icon: Layers,
        color: "bg-purple-500",
    },
    {
        step: "STEP 05",
        label: "Inspection",
        title: "최종 경화 & 검수",
        desc: "코팅막의 균일한 경화 상태, 광택도, 밀착력을 최종 검수하여 완벽한 품질을 보장합니다.",
        icon: ClipboardCheck,
        color: "bg-amber-500",
    },
];

const specialtyPoints = [
    {
        icon: Leaf,
        title: "친환경 프리미엄 라인업",
        desc: "인체에 무해하고 환경부 인증을 획득한 프리미엄 왁스 제품만을 사용합니다.",
    },
    {
        icon: Target,
        title: "무결점 시공 원칙",
        desc: "기포, 얼룩, 두께 불균일 제로를 목표로 숙련된 전문가가 한 층 한 층 정밀 시공합니다.",
    },
    {
        icon: Settings,
        title: "현장 맞춤형 솔루션",
        desc: "대리석, PVC, 에폭시, 원목 등 바닥재 특성에 따라 최적의 왁스와 공법을 선택합니다.",
    },
    {
        icon: BookOpen,
        title: "사후 관리 가이드 제공",
        desc: "시공 완료 후 일상 관리 방법과 재시공 시기를 안내하는 맞춤 가이드를 제공합니다.",
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

export function FloorWaxDetail() {
    const navigate = useNavigate();

    return (
        <div className="bg-white">
            {/* Hero Banner */}
            <section className="relative bg-[#1e2b4f] text-white overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: "url('./assets/services/floor_wax_hero_bg.jpg')" }}
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

                        <p className="text-blue-300 font-medium text-sm tracking-widest mb-3">PREMIUM FLOOR CARE</p>
                        <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-4">
                            프리미엄 바닥 왁스
                        </h1>
                        <p className="text-lg sm:text-xl text-white/80 max-w-2xl leading-relaxed">
                            공간의 격을 결정하는 최상의 바닥 왁스 솔루션
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

            {/* 01. 왜 바닥 왁스 코팅이 필수인가요? */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="01"
                            title="왜 바닥 왁스 코팅이 필수인가요?"
                            subtitle="바닥은 공간에서 가장 넓은 면적을 차지하며, 첫인상과 위생을 동시에 결정합니다."
                        />
                        <div className="grid sm:grid-cols-3 gap-6">
                            {whyWaxCards.map((card, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 15 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-gray-50 rounded-xl p-6 hover:bg-blue-50/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <card.icon className={`w-8 h-8 text-white p-1.5 rounded-lg ${card.color} flex-shrink-0`} />
                                        <h3 className="font-bold text-gray-900">{card.title}</h3>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed">{card.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 02. 왜 본연의 바닥 왁스인가? */}
            <section className="py-16 px-4 sm:px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="02"
                            title="왜 본연의 바닥 왁스인가?"
                            subtitle="단순한 광택제가 아닙니다. 본연은 바닥의 수명과 가치를 동시에 높이는 토탈 솔루션을 제공합니다."
                        />
                        <div className="grid sm:grid-cols-3 gap-6">
                            {whyBonyeonPoints.map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 15 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <item.icon className={`w-8 h-8 text-white p-1.5 rounded-lg ${item.color} flex-shrink-0`} />
                                        <h3 className="font-bold text-gray-900">{item.title}</h3>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 03. 본연의 4단계 정밀 공정 */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="03"
                            title="본연의 5단계 정밀 공정"
                            subtitle="완벽한 바닥 왁스는 철저한 공정에서 탄생합니다. 한 단계도 건너뛰지 않는 정밀 시공을 약속합니다."
                        />
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {processSteps.map((step, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-gray-50 rounded-xl p-6 hover:bg-blue-50/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`w-12 h-12 ${step.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                            <step.icon className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 mb-0.5">{step.step}</p>
                                            <p className="text-xs text-blue-600 font-medium mb-0.5">[{step.label}]</p>
                                            <h3 className="font-bold text-gray-900">{step.title}</h3>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 04. BONYEON SPECIALTY */}
            <section className="py-16 px-4 sm:px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="04"
                            title="BONYEON SPECIALTY"
                            subtitle="본연만의 차별화된 전문성이 바닥의 가치를 완성합니다."
                        />
                        <div className="grid sm:grid-cols-2 gap-4">
                            {specialtyPoints.map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 15 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <item.icon className="w-8 h-8 text-blue-500 flex-shrink-0" />
                                        <h3 className="font-bold text-gray-900">{item.title}</h3>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-16 px-4 sm:px-6 bg-[#1e2b4f] text-white text-center">
                <div className="max-w-2xl mx-auto">
                    <p className="text-white/60 italic mb-6 leading-relaxed">
                        "지나가는 발걸음이 머무는 곳마다, 본연의 손길이 닿은 바닥은 신뢰를 증명합니다."
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                        바닥의 가치를 높이는 프리미엄 왁스, 지금 시작하세요
                    </h2>
                    <p className="text-white/70 mb-8">
                        전문 상담을 통해 현장에 최적화된 바닥 왁스 솔루션을 제안해 드립니다.
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
