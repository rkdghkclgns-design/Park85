import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
    ArrowLeft,
    Phone,
    FlaskConical,
    Droplets,
    ShieldCheck,
    HardHat,
    Microscope,
    Zap,
    SprayCan,
    ShieldHalf,
    Atom,
    Camera,
    HeartHandshake,
    Building2,
    Home,
    Store,
    Factory,
    FileText,
    BadgeCheck,
    Search,
} from "lucide-react";

const differentiators = [
    {
        icon: Atom,
        title: "자재 성질을 이해한 과학적 클리닝",
        subtitle: "Scientific Cleaning",
        desc: "석재, 타일, 금속 패널, 유리 등 외벽 소재마다 최적의 pH 밸런스와 세정 방법을 적용합니다. 무분별한 고압 세척이 아닌, 자재를 보호하면서 오염만 선택적으로 제거하는 과학적 접근 방식입니다.",
        color: "bg-blue-500",
        borderColor: "border-blue-200",
    },
    {
        icon: Camera,
        title: "정직한 360도 검수 - 드론 촬영",
        subtitle: "Drone Inspection",
        desc: "작업 전·후 드론 촬영을 통해 고층부를 포함한 건물 전체의 세정 상태를 360도로 기록합니다. 눈으로 확인하기 어려운 곳까지 투명하게 검수하여 고객께 결과를 공유합니다.",
        color: "bg-purple-500",
        borderColor: "border-purple-200",
    },
    {
        icon: HeartHandshake,
        title: "무사고 원칙 안전 관리",
        subtitle: "Zero Accident Policy",
        desc: "모든 고소 작업은 산업안전보건법을 철저히 준수하며, 유자격 전문 인력이 이중 안전장치를 갖추고 작업합니다. 작업자와 건물 모두를 보호하는 무사고 원칙을 고수합니다.",
        color: "bg-emerald-500",
        borderColor: "border-emerald-200",
    },
];

const trustItems = [
    {
        icon: Search,
        title: "사전 실측 오염 진단",
        desc: "현장 방문을 통해 오염 유형, 외벽 소재, 작업 환경을 정밀 진단한 뒤, 맞춤형 세정 계획을 수립합니다.",
        color: "bg-blue-500",
    },
    {
        icon: BadgeCheck,
        title: "책임보험 가입",
        desc: "영업배상책임보험에 가입되어 있어 작업 중 발생할 수 있는 모든 사고에 대해 고객의 자산을 보호합니다.",
        color: "bg-amber-500",
    },
    {
        icon: FileText,
        title: "투명한 작업 리포트",
        desc: "작업 전·후 비교 사진, 사용 약제 내역, 드론 검수 영상 등을 포함한 상세 보고서를 제공합니다.",
        color: "bg-emerald-500",
    },
];

const serviceTargets = [
    {
        icon: Building2,
        title: "빌딩 / 오피스",
        desc: "유리 커튼월, 석재 외장재, 금속 패널 등 빌딩 외벽의 모든 소재에 대응하는 전문 세정 서비스를 제공합니다.",
    },
    {
        icon: Home,
        title: "아파트 / 오피스텔",
        desc: "주거 공간의 외벽 오염, 발코니 유리, 공용부 외장재를 체계적으로 관리합니다.",
    },
    {
        icon: Store,
        title: "상가 / 병원 / 관공서",
        desc: "방문객의 첫인상을 좌우하는 건물 외관을 깨끗하게 유지하여 시설의 신뢰도를 높입니다.",
    },
    {
        icon: Factory,
        title: "공장 / 물류센터",
        desc: "대형 산업 시설의 외벽 오염, 분진 침착, 배기가스 얼룩 등을 전문 장비와 약제로 효과적으로 제거합니다.",
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

export function ExteriorCleaningDetail() {
    const navigate = useNavigate();

    return (
        <div className="bg-white">
            {/* Hero Banner */}
            <section className="relative bg-[#1e2b4f] text-white overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: "url('./assets/services/exterior_hero_bg.jpg')" }}
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

                        <p className="text-blue-300 font-medium text-sm tracking-widest mb-3">BONYEON EXTERIOR CLEANING</p>
                        <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-4">
                            외벽 청소 서비스
                        </h1>
                        <p className="text-lg sm:text-xl text-white/80 max-w-2xl leading-relaxed">
                            "빌딩의 얼굴이 어두워지면, 기업의 신뢰도 함께 흐려집니다"
                        </p>
                        <p className="text-base text-white/60 mt-4 max-w-2xl leading-relaxed">
                            건물 외벽은 시간이 지날수록 매연, 분진, 물때, 이끼 등으로 본래의 색상을 잃어갑니다.
                            본연(BONYEON)은 자재를 보호하는 과학적 세정 공법과 안전한 고소 작업 시스템으로 건물의 가치를 되살립니다.
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

            {/* 01. 특수 약품 및 중성 세정 공법 */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="01"
                            title="특수 약품 및 중성 세정 공법"
                            subtitle="친환경 자재 보호를 최우선으로, 외벽 소재에 맞춘 과학적 세정 솔루션을 적용합니다."
                        />
                        <div className="bg-gray-50 rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                    <FlaskConical className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">친환경 자재 보호 세정</h3>
                                    <p className="text-sm text-gray-500">Eco-Friendly Material Protection</p>
                                </div>
                            </div>
                            <p className="text-gray-600 mb-4 italic border-l-4 border-blue-200 pl-4">
                                강산성·강알칼리성 세제는 오염을 빠르게 제거하지만, 동시에 외벽 소재를 부식시킵니다. 본연은 중성 pH 기반의 전문 세정제를 사용하여 자재를 보호합니다.
                            </p>
                            <div className="space-y-3">
                                {([
                                    { label: "소재별 pH 맞춤 세정", desc: "석재, 타일, 금속, 유리 등 외벽 소재마다 최적의 pH 밸런스를 가진 전용 세정제를 적용합니다." },
                                    { label: "친환경 인증 약제", desc: "환경부 인증 친환경 세정제를 사용하여 건물 주변 식생과 배수 시스템에 미치는 영향을 최소화합니다." },
                                    { label: "잔류 성분 제로", desc: "세정 후 깨끗한 물로 완벽하게 린스하여 약제 잔류로 인한 소재 변색이나 얼룩을 방지합니다." },
                                ]).map((item, i) => (
                                    <div key={i} className="text-sm text-gray-600 leading-relaxed flex items-start gap-2">
                                        <span className="text-blue-500 mt-0.5 flex-shrink-0 font-bold">&#10003;</span>
                                        <div>
                                            <span className="font-medium text-gray-700">{item.label}:</span> {item.desc}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 02. 고난도 로프 및 고소 작업 전문가 그룹 */}
            <section className="py-16 px-4 sm:px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="02"
                            title="고난도 로프 및 고소 작업 전문가 그룹"
                            subtitle="안전과 기술력을 겸비한 유자격 전문 인력이 어떤 높이에서도 완벽한 세정을 수행합니다."
                        />
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                                    <HardHat className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">전문 고소 작업 시스템</h3>
                                    <p className="text-sm text-gray-500">Professional High-Rise Operations</p>
                                </div>
                            </div>
                            <p className="text-gray-600 mb-6 italic border-l-4 border-orange-200 pl-4">
                                고층 건물 외벽 세정은 기술력만큼 안전이 중요합니다. 본연은 산업안전보건법을 철저히 준수하며 이중 안전 시스템으로 작업합니다.
                            </p>
                            <div className="grid sm:grid-cols-3 gap-4">
                                {([
                                    {
                                        icon: ShieldCheck,
                                        title: "유자격 전문 인력",
                                        desc: "고소 작업 자격증 보유 전문가가 직접 작업에 투입됩니다.",
                                        color: "bg-blue-500",
                                    },
                                    {
                                        icon: Zap,
                                        title: "이중 안전장치",
                                        desc: "주 로프와 보조 로프를 분리 설치하는 이중 안전 시스템을 적용합니다.",
                                        color: "bg-red-500",
                                    },
                                    {
                                        icon: Microscope,
                                        title: "현장 안전 점검",
                                        desc: "매 작업 시작 전 풍속, 기상, 장비 상태를 종합 점검합니다.",
                                        color: "bg-emerald-500",
                                    },
                                ] as const).map((item, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 15 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.1 }}
                                        className="bg-gray-50 rounded-xl p-5"
                                    >
                                        <div className="flex items-center gap-3 mb-3">
                                            <item.icon className={`w-8 h-8 text-white p-1.5 rounded-lg ${item.color} flex-shrink-0`} />
                                            <h4 className="font-bold text-gray-900 text-sm">{item.title}</h4>
                                        </div>
                                        <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 03. 맞춤형 고압 세척 & 발수 코팅 시스템 */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="03"
                            title="맞춤형 고압 세척 & 발수 코팅 시스템"
                            subtitle="세정과 보호를 동시에, 건물 외벽의 깨끗함을 오래 유지하는 통합 솔루션입니다."
                        />
                        <div className="grid sm:grid-cols-2 gap-6">
                            <motion.div
                                initial={{ opacity: 0, x: -15 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                className="bg-gray-50 rounded-xl p-6"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                        <SprayCan className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">고압 스팀 세척</h3>
                                        <p className="text-sm text-gray-500">High-Pressure Steam Cleaning</p>
                                    </div>
                                </div>
                                <ul className="space-y-3">
                                    {([
                                        "소재별 압력 조절로 자재 손상 없이 오염만 제거",
                                        "고온 스팀으로 곰팡이·이끼 등 유기 오염물 살균 제거",
                                        "물 사용량을 최소화하는 친환경 고효율 장비 운용",
                                    ]).map((text, i) => (
                                        <li key={i} className="text-sm text-gray-600 leading-relaxed flex items-start gap-2">
                                            <span className="text-blue-500 mt-0.5 flex-shrink-0 font-bold">&#10003;</span>
                                            {text}
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, x: 15 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                className="bg-gray-50 rounded-xl p-6"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                                        <ShieldHalf className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">외벽 발수 코팅</h3>
                                        <p className="text-sm text-gray-500">Water-Repellent Coating</p>
                                    </div>
                                </div>
                                <ul className="space-y-3">
                                    {([
                                        "빗물과 오염물의 침투를 차단하는 발수층 형성",
                                        "자외선에 의한 소재 변색 및 노화를 지연",
                                        "재오염 주기를 최대 50% 연장하여 유지 비용 절감",
                                    ]).map((text, i) => (
                                        <li key={i} className="text-sm text-gray-600 leading-relaxed flex items-start gap-2">
                                            <span className="text-emerald-500 mt-0.5 flex-shrink-0 font-bold">&#10003;</span>
                                            {text}
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 04. 본연의 차별점 3가지 */}
            <section className="py-16 px-4 sm:px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="04"
                            title="본연의 차별점 3가지"
                            subtitle="단순한 외벽 세척을 넘어, 건물의 자산 가치를 지키는 전문 파트너입니다."
                        />
                        <div className="space-y-6">
                            {differentiators.map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -15 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.15 }}
                                    className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`w-10 h-10 ${item.color} rounded-lg flex items-center justify-center`}>
                                            <item.icon className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
                                            <p className="text-sm text-gray-500">{item.subtitle}</p>
                                        </div>
                                    </div>
                                    <p className={`text-gray-600 italic border-l-4 ${item.borderColor} pl-4`}>
                                        {item.desc}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 05. 안심 서비스 */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="05"
                            title="안심 서비스"
                            subtitle="처음부터 끝까지 투명하고 책임감 있는 서비스를 약속합니다."
                        />
                        <div className="grid sm:grid-cols-3 gap-6">
                            {trustItems.map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 15 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-gray-50 rounded-xl p-6 hover:bg-blue-50/50 transition-colors"
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

            {/* 06. 서비스 대상 */}
            <section className="py-16 px-4 sm:px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="06"
                            title="서비스 대상"
                            subtitle="주거·상업·산업 시설까지, 모든 건물 유형의 외벽 세정을 책임집니다."
                        />
                        <div className="grid sm:grid-cols-2 gap-4">
                            {serviceTargets.map((target, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 15 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <target.icon className="w-8 h-8 text-blue-500 flex-shrink-0" />
                                        <h3 className="font-bold text-gray-900">{target.title}</h3>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed">{target.desc}</p>
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
                        건물의 가치를 되살리는 외벽 청소, 지금 시작하세요
                    </h2>
                    <p className="text-white/70 mb-8">
                        청소 그 이상의 가치, 건물의 수명을 생각하는 본연입니다.
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
