import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, Phone, Search, Beaker, Zap, ShieldCheck, Heart, Sparkles, Cpu, PawPrint, Baby, Users, Home, Stethoscope } from "lucide-react";

const processSteps = [
    {
        step: "STEP 01",
        title: "오염도 정밀 측정",
        desc: "암모니아 농도 측정기 및 UV 라이트를 활용하여 눈에 보이지 않는 소변 침투 구역과 오염 범위를 정밀하게 파악합니다.",
        icon: Search,
        color: "bg-blue-500",
    },
    {
        step: "STEP 02",
        title: "효소 분해 세척",
        desc: "반려동물 전용 효소 세정제를 사용하여 소변·배변 잔류물의 유기물 성분을 분자 수준에서 분해하고 악취 원인을 근본적으로 제거합니다.",
        icon: Beaker,
        color: "bg-emerald-500",
    },
    {
        step: "STEP 03",
        title: "플라즈마 / 오존 살균",
        desc: "플라즈마 이온 및 고농도 오존 처리를 통해 공기 중 부유 세균, 알레르기 유발 항원, 잔여 악취 분자를 산화 분해합니다.",
        icon: Zap,
        color: "bg-purple-500",
    },
    {
        step: "STEP 04",
        title: "항균 코팅 마무리",
        desc: "반려동물에게 안전한 무독성 항균 코팅제를 시공하여 재오염을 방지하고 장기간 청결한 상태를 유지합니다.",
        icon: ShieldCheck,
        color: "bg-amber-500",
    },
];

const serviceStrengths = [
    {
        icon: Heart,
        title: "Safety First",
        subtitle: "반려동물 안전 최우선",
        desc: "모든 약제는 반려동물과 영유아에게 무해한 친환경 인증 제품만을 사용합니다. 작업 후 잔류 화학물질이 남지 않아 맨발로 걸어도, 반려동물이 핥아도 안전합니다.",
        color: "bg-rose-500",
    },
    {
        icon: Sparkles,
        title: "Deep Cleaning",
        subtitle: "심부 침투 클리닝",
        desc: "표면적인 탈취가 아닌, 바닥재·벽지·가구 심부까지 침투한 암모니아와 유기물 성분을 효소 분해 방식으로 완전히 제거합니다.",
        color: "bg-blue-500",
    },
    {
        icon: Cpu,
        title: "Technical Equipment",
        subtitle: "전문 장비 투입",
        desc: "UV 오염 탐지기, 산업용 오존 발생기, 플라즈마 살균기, 효소 분사 장비 등 가정용으로는 불가능한 전문 장비를 투입합니다.",
        color: "bg-purple-500",
    },
];

const recommendedTargets = [
    {
        icon: PawPrint,
        text: "반려동물 배변 훈련 실패로 바닥·카펫에 냄새가 고착된 가정",
    },
    {
        icon: Baby,
        text: "영유아·임산부가 함께 생활하여 실내 공기질이 중요한 가정",
    },
    {
        icon: Users,
        text: "다두(多頭) 가정으로 반려동물 냄새 관리가 어려운 경우",
    },
    {
        icon: Home,
        text: "반려동물 퇴실 후 원상복구가 필요한 임대인 및 이사 전·후 세입자",
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

export function PetSmellDetail() {
    const navigate = useNavigate();

    return (
        <div className="bg-white">
            {/* Hero Banner */}
            <section className="relative bg-[#1e2b4f] text-white overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: "url('./assets/services/pet_smell_hero_bg.jpg')" }}
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
                            반려동물 냄새 제거
                        </h1>
                        <p className="text-lg sm:text-xl text-white/80 max-w-2xl leading-relaxed">
                            "가족의 건강과 반려동물의 행복을 위한 맞춤형 실내 케어"
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

            {/* 01. 왜 전문가의 환경 복원이 필요한가 */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="01"
                            title="왜 전문가의 환경 복원이 필요한가"
                            subtitle="반려동물과 함께하는 공간에는 보이지 않는 위생 문제가 숨어 있습니다."
                        />

                        <p className="text-gray-600 mb-8 leading-relaxed max-w-3xl">
                            반려동물의 배변, 피지, 침, 털에서 발생하는 냄새와 유해물질은 일반 청소로는 해결이 어렵습니다.
                            바닥재와 벽지 심부에 침투한 암모니아 성분, 공기 중 부유하는 알레르기 유발 항원,
                            그리고 반려동물 스스로도 스트레스를 받는 악취 환경까지 -- 전문적인 접근이 필요합니다.
                        </p>

                        {/* Sub-section: 심부 고착 악취 */}
                        <div className="mb-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                    <Beaker className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">심부 고착 악취 해결</h3>
                            </div>
                            <div className="space-y-3">
                                {([
                                    { label: "암모니아 침투", desc: "반려동물 소변의 암모니아 성분은 바닥재, 타일 틈새, 카펫 심부까지 침투하여 일반 세제로는 제거가 불가능합니다." },
                                    { label: "자가 관리 한계", desc: "방향제, 탈취 스프레이는 악취를 일시적으로 마스킹할 뿐, 근본 원인인 유기물 잔류물을 분해하지 못합니다." },
                                    { label: "전문 솔루션", desc: "효소 분해 세정 기술로 악취의 원인 물질 자체를 분자 수준에서 분해하여 완전히 제거합니다." },
                                ] as const).map((item, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -15 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.1 }}
                                        className="bg-gray-50 rounded-xl p-5"
                                    >
                                        <h4 className="font-bold text-gray-900 mb-1">{item.label}</h4>
                                        <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Sub-section: 부유 항원 및 알레르기 */}
                        <div className="mb-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                                    <Stethoscope className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">부유 항원 및 알레르기 유발 물질 정화</h3>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-5">
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    반려동물의 비듬, 타액, 털에서 발생하는 미세 입자는 공기 중에 장시간 부유하며 알레르기성 비염, 천식, 아토피를 유발하거나 악화시킵니다.
                                    플라즈마 이온 및 오존 살균 처리를 통해 공기 중 부유 항원을 산화 분해하여 가족 모두가 편안하게 호흡할 수 있는 환경을 만듭니다.
                                </p>
                            </div>
                        </div>

                        {/* Sub-section: 후각 스트레스 및 재배변 방지 */}
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                                    <PawPrint className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">반려동물의 후각 스트레스 및 재배변 방지</h3>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-5">
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    반려동물은 사람보다 수천 배 민감한 후각을 가지고 있습니다. 이전 배변 냄새가 남아있으면 같은 장소에 반복적으로 배변하는 습관이 고착됩니다.
                                    효소 분해 세척으로 냄새 원인을 완전히 제거하면 재배변 행동을 효과적으로 방지하고, 반려동물의 후각 스트레스를 크게 줄일 수 있습니다.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 02. BONYEON 특화 프로세스 */}
            <section className="py-16 px-4 sm:px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="02"
                            title="BONYEON 특화 프로세스"
                            subtitle="반려동물 전문 4단계 공정으로 냄새의 근본 원인을 제거합니다."
                        />
                        <div className="grid sm:grid-cols-2 gap-4">
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
                                    <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 03. 서비스 강점 */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="03"
                            title="서비스 강점"
                            subtitle="반려동물과 가족 모두를 생각하는 본연만의 차별화된 서비스입니다."
                        />
                        <div className="grid sm:grid-cols-3 gap-6">
                            {serviceStrengths.map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 15 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-gray-50 rounded-xl p-6 hover:bg-blue-50/50 transition-colors"
                                >
                                    <item.icon className={`w-8 h-8 text-white p-1.5 rounded-lg ${item.color} mb-3`} />
                                    <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                                    <p className="text-xs text-blue-600 font-medium mb-2">{item.subtitle}</p>
                                    <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 04. 추천 대상 */}
            <section className="py-16 px-4 sm:px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="04"
                            title="추천 대상"
                            subtitle="이런 분들께 본연의 반려동물 냄새 제거 서비스를 추천합니다."
                        />
                        <div className="space-y-4">
                            {recommendedTargets.map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -15 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4"
                                >
                                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <item.icon className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <p className="text-gray-700 leading-relaxed">{item.text}</p>
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
                        반려동물과의 공존은 깨끗한 공기에서 시작됩니다
                    </h2>
                    <p className="text-white/70 mb-8">
                        전문 상담을 통해 반려동물 가정에 최적화된 냄새 제거 솔루션을 제안해 드립니다.
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
