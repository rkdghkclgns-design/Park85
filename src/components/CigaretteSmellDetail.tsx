import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, Phone, AlertTriangle, Beaker, Wind, Sun, ClipboardCheck, Leaf, ShieldCheck, Cpu, HandshakeIcon, Home, Store, Cigarette, HeartPulse, TrendingDown, Building2 } from "lucide-react";

const processSteps = [
    {
        step: "STEP 1",
        label: "Diagnosis",
        title: "정밀 진단",
        desc: "니코틴 오염도 측정, 냄새 강도 분석 및 오염 범위 파악",
        icon: ClipboardCheck,
        color: "bg-blue-500",
    },
    {
        step: "STEP 2",
        label: "Neutralize",
        title: "니코틴 중화 세척",
        desc: "전문 약제를 활용한 벽면·천장·바닥 니코틴 타르 중화 및 세척",
        icon: Beaker,
        color: "bg-emerald-500",
    },
    {
        step: "STEP 3",
        label: "Fumigation",
        title: "공간 훈증 / 오존 처리",
        desc: "밀폐 공간 훈증 및 고농도 오존 발생기를 통한 악취 분자 산화 분해",
        icon: Wind,
        color: "bg-purple-500",
    },
    {
        step: "STEP 4",
        label: "UV Coating",
        title: "UV 살균 & 피톤치드 코팅",
        desc: "자외선 살균으로 잔여 세균 제거 후 피톤치드 기반 항균 코팅 시공",
        icon: Sun,
        color: "bg-amber-500",
    },
    {
        step: "STEP 5",
        label: "Inspection",
        title: "검수 완료",
        desc: "냄새 측정기 재측정, 고객 입회 검수 및 최종 품질 확인",
        icon: ShieldCheck,
        color: "bg-rose-500",
    },
];

const coreStrengths = [
    {
        icon: Leaf,
        title: "무독성 친환경 약품",
        desc: "인체에 무해한 친환경 인증 전문 약제만을 사용하여 작업 후에도 안심할 수 있는 공간을 만듭니다.",
        color: "bg-green-500",
    },
    {
        icon: Beaker,
        title: "근본적 원인 제거",
        desc: "표면적인 탈취가 아닌, 니코틴·타르가 침착된 소재 심부까지 분해하여 냄새의 근본 원인을 제거합니다.",
        color: "bg-blue-500",
    },
    {
        icon: Cpu,
        title: "첨단 장비 투입",
        desc: "고농도 오존 발생기, UV-C 살균기, 산업용 훈증기 등 전문 장비를 투입하여 완벽한 제거를 실현합니다.",
        color: "bg-purple-500",
    },
    {
        icon: HandshakeIcon,
        title: "사후 관리 보증",
        desc: "시공 완료 후에도 일정 기간 사후 관리를 보증하며, 재발 시 무상 재시공을 지원합니다.",
        color: "bg-amber-500",
    },
];

const residentialPoints = [
    { title: "니코틴 고착 제거", desc: "벽지, 천장, 가구 표면에 스며든 니코틴·타르 성분을 중화 세척하여 원래의 색상과 청결을 회복합니다." },
    { title: "3차 흡연 차단", desc: "눈에 보이지 않지만 실내 먼지와 표면에 잔류하는 유해 화학물질(3차 흡연)까지 완벽히 제거합니다." },
    { title: "공기질 복원", desc: "오존 처리 및 피톤치드 코팅을 통해 쾌적하고 건강한 실내 공기질을 복원합니다." },
    { title: "추천 고객", desc: "이사 전·후 원룸 세입자, 흡연자 퇴실 후 원상복구가 필요한 임대인, 비흡연 가족 구성원이 있는 가정" },
];

const commercialPoints = [
    { title: "대면적 고출력 장비", desc: "상업 공간 규모에 맞는 산업용 고출력 오존 발생기 및 훈증 장비를 투입하여 넓은 면적도 빠르게 처리합니다." },
    { title: "덕트·환기구 케어", desc: "천장 덕트, 환기구 내부에 축적된 니코틴 오염까지 분해 세척하여 재오염을 원천 차단합니다." },
    { title: "이미지 브랜딩", desc: "담배 냄새 없는 깨끗한 공간은 고객 신뢰와 매장 이미지를 높이는 핵심 요소입니다." },
    { title: "추천 업종", desc: "부동산 중개 사무소, 노래방·PC방, 숙박업소, 중고차 매장, 흡연 가능 음식점·카페" },
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

export function CigaretteSmellDetail() {
    const navigate = useNavigate();

    return (
        <div className="bg-white">
            {/* Hero Banner */}
            <section className="relative bg-[#1e2b4f] text-white overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: "url('./assets/services/cigarette_hero_bg.jpg')" }}
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

                        <p className="text-blue-300 font-medium text-sm tracking-widest mb-3">BONYEON AIR PURIFICATION</p>
                        <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-4">
                            담배 냄새 완벽 제거
                        </h1>
                        <p className="text-lg sm:text-xl text-white/80 max-w-2xl leading-relaxed">
                            "눈에 보이지 않는 유해물질, 담배 냄새의 근본을 해결합니다"
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

            {/* 01. 서비스 필요성 */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="01"
                            title="서비스 필요성"
                            subtitle="담배 냄새는 단순한 불쾌감을 넘어, 건강과 자산 가치에 직접적인 영향을 미칩니다."
                        />
                        <div className="grid sm:grid-cols-2 gap-4">
                            {([
                                {
                                    icon: AlertTriangle,
                                    title: "3차 흡연의 위험",
                                    desc: "담배 연기가 사라진 후에도 벽면, 가구, 카펫에 잔류하는 유해 화학물질(3차 흡연)은 비흡연자에게도 지속적으로 노출됩니다.",
                                },
                                {
                                    icon: Cigarette,
                                    title: "강력한 흡착력",
                                    desc: "니코틴과 타르 성분은 벽지, 천장, 섬유 소재에 강하게 흡착되어 일반 환기나 방향제로는 절대 제거되지 않습니다.",
                                },
                                {
                                    icon: HeartPulse,
                                    title: "건강 위협",
                                    desc: "잔류 니코틴은 공기 중 아질산과 반응하여 발암성 물질(니트로사민)을 생성하며, 영유아와 반려동물에게 더욱 치명적입니다.",
                                },
                                {
                                    icon: TrendingDown,
                                    title: "자산 가치 하락",
                                    desc: "흡연 냄새가 배인 공간은 임대·매매 시 자산 가치가 크게 하락하며, 세입자 유치에도 어려움을 겪습니다.",
                                },
                            ] as const).map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 15 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-gray-50 rounded-xl p-6 hover:bg-blue-50/50 transition-colors"
                                >
                                    <item.icon className="w-8 h-8 text-blue-500 mb-3" />
                                    <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 02. 전문 제거 프로세스 */}
            <section className="py-16 px-4 sm:px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="02"
                            title="전문 제거 프로세스"
                            subtitle="5단계 체계적 공정으로 담배 냄새의 근본 원인을 완벽하게 제거합니다."
                        />
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {processSteps.map((step, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className={`w-12 h-12 ${step.color} rounded-xl flex items-center justify-center mb-4`}>
                                        <step.icon className="w-6 h-6 text-white" />
                                    </div>
                                    <p className="text-xs font-bold text-gray-400 mb-1">{step.step}</p>
                                    <p className="text-xs text-blue-600 font-medium mb-2">[{step.label}]</p>
                                    <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 03. 핵심 특장점 */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="03"
                            title="핵심 특장점"
                            subtitle="본연만의 차별화된 기술력과 약품으로 완벽한 결과를 보장합니다."
                        />
                        <div className="grid sm:grid-cols-2 gap-4">
                            {coreStrengths.map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 15 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-gray-50 rounded-xl p-6 hover:bg-blue-50/50 transition-colors"
                                >
                                    <item.icon className={`w-8 h-8 text-white p-1.5 rounded-lg ${item.color} mb-3`} />
                                    <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 04. 원룸·주거 공간 */}
            <section className="py-16 px-4 sm:px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="04"
                            title="원룸 · 주거 공간"
                            subtitle="소중한 생활 공간에서 담배 냄새를 완전히 제거하여 건강한 주거 환경을 되찾아 드립니다."
                        />
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                <Home className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">주거 공간 맞춤 솔루션</h3>
                        </div>
                        <div className="space-y-4">
                            {residentialPoints.map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -15 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.15 }}
                                    className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
                                >
                                    <h4 className="font-bold text-gray-900 mb-1">{item.title}</h4>
                                    <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 05. 상가·상업 공간 */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="05"
                            title="상가 · 상업 공간"
                            subtitle="고객이 방문하는 상업 공간의 담배 냄새를 제거하여 브랜드 이미지와 매출을 높입니다."
                        />
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">상업 공간 맞춤 솔루션</h3>
                        </div>
                        <div className="space-y-4">
                            {commercialPoints.map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -15 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.15 }}
                                    className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
                                >
                                    <h4 className="font-bold text-gray-900 mb-1">{item.title}</h4>
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
                    <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                        담배 냄새, 더 이상 참지 마세요
                    </h2>
                    <p className="text-white/70 mb-8">
                        전문 상담을 통해 공간에 최적화된 담배 냄새 제거 솔루션을 제안해 드립니다.
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
