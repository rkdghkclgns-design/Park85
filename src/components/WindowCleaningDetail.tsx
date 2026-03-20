import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
    ArrowLeft,
    Phone,
    Droplets,
    Zap,
    Brush,
    Building2,
    Building,
    Home,
    ClipboardCheck,
    Search,
    ShieldCheck,
    Layers,
    Scissors,
    SprayCan,
    Sparkles,
    HardHat,
    FileCheck,
    ShieldAlert,
    DollarSign,
    HeartHandshake,
    Leaf,
    CalendarCheck,
    RefreshCw,
} from "lucide-react";

const techItems = [
    {
        icon: Droplets,
        title: "산성비 스케일 정밀 제거",
        desc: "일반 세정으로는 제거 불가능한 산성비 스케일(물때)을 전문 약품과 연마 기법으로 투명도를 회복합니다.",
        color: "bg-blue-500",
    },
    {
        icon: Zap,
        title: "정전기 방지 코팅 처리",
        desc: "유리 표면에 미세한 코팅막을 형성하여 먼지 재흡착을 억제하고 깨끗한 상태를 오래 유지합니다.",
        color: "bg-purple-500",
    },
    {
        icon: Brush,
        title: "스퀴징 에징 마감",
        desc: "프로페셔널 스퀴지 기법으로 물 자국 없는 완벽한 마감을 실현합니다.",
        color: "bg-emerald-500",
    },
];

const spaceCards = [
    {
        icon: Building2,
        title: "상업 공간 - 쇼윈도",
        desc: "매장의 첫인상을 결정짓는 쇼윈도 유리를 투명하게 관리하여 제품 진열 효과를 극대화합니다.",
        color: "bg-amber-500",
    },
    {
        icon: Building,
        title: "오피스 빌딩 - 외창 로프 작업",
        desc: "고층 빌딩 외부 유리창을 전문 로프 기술자가 안전하게 작업하여 건물 외관의 품격을 유지합니다.",
        color: "bg-blue-500",
    },
    {
        icon: Home,
        title: "프리미엄 주거 - 한강뷰",
        desc: "한강뷰 아파트, 펜트하우스 등 조망권이 중요한 주거 공간의 유리를 완벽하게 케어합니다.",
        color: "bg-emerald-500",
    },
];

const processSteps = [
    {
        step: "STEP 1",
        label: "Inspection",
        title: "사전 진단",
        desc: "유리 종류, 오염도, 스케일 수준을 정밀 진단하여 최적의 작업 방법을 수립합니다.",
        icon: Search,
        color: "bg-slate-500",
    },
    {
        step: "STEP 2",
        label: "Protection",
        title: "안전 보양",
        desc: "프레임, 실리콘, 주변 마감재를 보양 테이프로 보호하여 작업 중 손상을 방지합니다.",
        icon: ShieldCheck,
        color: "bg-blue-500",
    },
    {
        step: "STEP 3",
        label: "Reaction",
        title: "오염물 반응",
        desc: "유리 표면의 스케일과 오염물에 전문 약품을 도포하여 화학적으로 분해합니다.",
        icon: Layers,
        color: "bg-purple-500",
    },
    {
        step: "STEP 4",
        label: "Scraping",
        title: "스크래핑",
        desc: "특수 블레이드로 잔여 스케일과 부착 오염물을 물리적으로 정밀 제거합니다.",
        icon: Scissors,
        color: "bg-amber-500",
    },
    {
        step: "STEP 5",
        label: "Rinse & Squeegee",
        title: "린스 스퀴징",
        desc: "순수(정제수)로 세정 후 프로페셔널 스퀴지 기법으로 물 자국 없이 마감합니다.",
        icon: SprayCan,
        color: "bg-emerald-500",
    },
    {
        step: "STEP 6",
        label: "Detailing",
        title: "디테일링",
        desc: "프레임, 모서리, 창틀까지 극세사 타월로 마무리하여 완벽한 투명도를 완성합니다.",
        icon: Sparkles,
        color: "bg-rose-500",
    },
];

const safetyItems = [
    {
        icon: HardHat,
        title: "고소 작업 전문가",
        desc: "국가 공인 자격을 보유한 전문 기술자가 고소 작업을 수행합니다. 체계적인 교육과 현장 경험을 바탕으로 안전하고 정밀한 시공을 보장합니다.",
    },
    {
        icon: FileCheck,
        title: "안전 규정 준수",
        desc: "산업안전보건법 및 고소작업 안전 가이드라인을 철저히 준수합니다. 작업 전 안전 브리핑과 장비 점검을 필수로 시행합니다.",
    },
    {
        icon: ShieldAlert,
        title: "보험 가입",
        desc: "영업배상책임보험에 가입하여 작업 중 발생할 수 있는 모든 사고에 대해 완벽한 보상 체계를 갖추고 있습니다.",
    },
];

const promiseItems = [
    {
        icon: DollarSign,
        title: "투명하고 합리적인 견적",
        color: "bg-amber-500",
        borderColor: "border-amber-200",
        subs: [
            "현장 실측 기반의 정확한 면적 산출로 불필요한 비용을 제거합니다.",
            "추가 비용 없는 올인원 견적을 제공하며, 작업 전 상세 견적서를 서면으로 안내합니다.",
            "정기 계약 시 최대 20% 할인 혜택을 드립니다.",
        ],
    },
    {
        icon: HeartHandshake,
        title: "차별화된 사후 관리",
        color: "bg-blue-500",
        borderColor: "border-blue-200",
        subs: [
            "작업 완료 후 48시간 이내 만족도 확인 전화를 드립니다.",
            "미흡 부분 발견 시 무상 재시공을 보장합니다.",
            "작업 전후 비교 사진을 포함한 상세 리포트를 제공합니다.",
        ],
    },
    {
        icon: Leaf,
        title: "친환경 저자극 케어",
        color: "bg-emerald-500",
        borderColor: "border-emerald-200",
        subs: [
            "환경부 인증 친환경 세정제를 사용하여 유해 화학물질 노출을 최소화합니다.",
            "작업 후 잔류 약품이 남지 않아 영유아, 반려동물이 있는 공간에서도 안심할 수 있습니다.",
            "폐수 처리 규정을 준수하여 환경 오염을 방지합니다.",
        ],
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

export function WindowCleaningDetail() {
    const navigate = useNavigate();

    return (
        <div className="bg-white">
            {/* Hero Banner */}
            <section className="relative bg-[#1e2b4f] text-white overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: "url('./assets/services/glass_hero_bg.jpg')" }}
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

                        <p className="text-blue-300 font-medium text-sm tracking-widest mb-3">PROFESSIONAL GLASS CARE SOLUTION</p>
                        <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-4">
                            유리창 정밀 케어
                        </h1>
                        <p className="text-lg sm:text-xl text-white/80 max-w-2xl leading-relaxed">
                            "비워냄으로 완성하는 투명함, 본연의 유리창 정밀 케어"
                        </p>
                        <p className="text-base text-white/60 mt-4 max-w-2xl leading-relaxed">
                            산성비 스케일, 먼지, 물때로 흐려진 유리를 전문 기술로 되살립니다. 본연(BONYEON)의 유리창 정밀 케어는 단순한 세척을 넘어, 공간에 빛과 투명함을 되돌려 드립니다.
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

            {/* 01. 본연만의 차별화된 전문 기술 */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="01"
                            title="본연만의 차별화된 전문 기술"
                            subtitle="일반 물걸레 세척이 아닌, 유리 표면 과학에 기반한 전문 케어 기술을 적용합니다."
                        />
                        <div className="grid sm:grid-cols-3 gap-4">
                            {techItems.map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 15 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-gray-50 rounded-xl p-6 hover:bg-blue-50/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                            <item.icon className="w-6 h-6 text-white" />
                                        </div>
                                        <h3 className="font-bold text-gray-900">{item.title}</h3>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 02. 공간별 맞춤 서비스 */}
            <section className="py-16 px-4 sm:px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="02"
                            title="공간별 맞춤 서비스"
                            subtitle="공간의 특성과 유리 종류에 따라 최적화된 케어 방법을 적용합니다."
                        />
                        <div className="grid sm:grid-cols-3 gap-4">
                            {spaceCards.map((card, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                            <card.icon className="w-6 h-6 text-white" />
                                        </div>
                                        <h3 className="font-bold text-gray-900">{card.title}</h3>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed">{card.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 03. 체계적인 작업 프로세스 */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="03"
                            title="체계적인 작업 프로세스"
                            subtitle="6단계 정밀 프로세스를 통해 유리 본연의 투명함을 되찾습니다."
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

            {/* 04. 안전 관리 시스템 */}
            <section className="py-16 px-4 sm:px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="04"
                            title="안전 관리 시스템"
                            subtitle="고소 작업의 안전은 타협할 수 없습니다. 본연은 철저한 안전 관리 체계를 갖추고 있습니다."
                        />
                        <div className="grid sm:grid-cols-3 gap-4">
                            {safetyItems.map((item, i) => (
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

            {/* 05. 정기 관리 서비스 */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="05"
                            title="정기 관리 서비스"
                            subtitle="유리창의 투명함을 365일 유지하는 가장 경제적인 방법, 정기 관리를 추천드립니다."
                        />
                        <div className="space-y-4">
                            <motion.div
                                initial={{ opacity: 0, x: -15 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                className="bg-gray-50 rounded-xl p-6"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <CalendarCheck className="w-8 h-8 text-blue-500 flex-shrink-0" />
                                    <h3 className="font-bold text-gray-900">주기적 케어의 장점</h3>
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                                    유리창 오염은 방치할수록 산성비 스케일이 고착화되어 제거가 어려워지고, 복원 비용이 증가합니다. 정기적인 관리를 통해 항상 깨끗한 상태를 유지하면 장기적으로 비용을 절감할 수 있습니다.
                                </p>
                                <ul className="space-y-2">
                                    <li className="text-sm text-gray-600 flex items-start gap-2">
                                        <span className="text-blue-500 mt-0.5 flex-shrink-0 font-bold">&#10003;</span>
                                        월 1회 / 분기 1회 / 반기 1회 등 공간 환경에 맞는 주기 설계
                                    </li>
                                    <li className="text-sm text-gray-600 flex items-start gap-2">
                                        <span className="text-blue-500 mt-0.5 flex-shrink-0 font-bold">&#10003;</span>
                                        정기 계약 시 회당 단가 할인 및 우선 스케줄 배정
                                    </li>
                                    <li className="text-sm text-gray-600 flex items-start gap-2">
                                        <span className="text-blue-500 mt-0.5 flex-shrink-0 font-bold">&#10003;</span>
                                        매 방문 시 유리 상태 리포트 제공으로 관리 이력 추적 가능
                                    </li>
                                </ul>
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, x: -15 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.15 }}
                                className="bg-gray-50 rounded-xl p-6"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <RefreshCw className="w-8 h-8 text-emerald-500 flex-shrink-0" />
                                    <h3 className="font-bold text-gray-900">정기 관리 프로세스</h3>
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    초기 정밀 시공 후 정기 방문 시에는 간편 유지 관리 프로세스를 적용하여 효율적으로 투명한 상태를 유지합니다. 방문 시마다 유리 상태를 점검하고, 스케일 재발 징후가 보이면 즉시 선제적 케어를 진행합니다.
                                </p>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 06. 본연의 세 가지 약속 */}
            <section className="py-16 px-4 sm:px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="06"
                            title="본연의 세 가지 약속"
                            subtitle="본연(BONYEON)은 기술을 넘어, 신뢰로 완성되는 서비스를 약속합니다."
                        />
                        <div className="space-y-6">
                            {promiseItems.map((promise, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -15 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.15 }}
                                    className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
                                >
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`w-10 h-10 ${promise.color} rounded-lg flex items-center justify-center`}>
                                            <promise.icon className="w-5 h-5 text-white" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900">{promise.title}</h3>
                                    </div>
                                    <ul className="space-y-3">
                                        {promise.subs.map((sub, j) => (
                                            <li key={j} className="text-sm text-gray-600 leading-relaxed flex items-start gap-2">
                                                <span className="text-emerald-500 mt-0.5 flex-shrink-0 font-bold">&#10003;</span>
                                                <span>{sub}</span>
                                            </li>
                                        ))}
                                    </ul>
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
                        유리창 본연의 투명함을 되찾으세요
                    </h2>
                    <p className="text-white/70 mb-8">
                        전문 상담을 통해 공간에 최적화된 유리창 케어 플랜을 제안해 드립니다.
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
