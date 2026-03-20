import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
    ArrowLeft,
    Phone,
    Eye,
    Timer,
    Star,
    Search,
    Trash2,
    Sparkles,
    Droplets,
    ClipboardCheck,
    FlaskConical,
    Flame,
    ShieldCheck,
    RectangleVertical,
    Lightbulb,
    Umbrella,
    Mountain,
    HardHat,
    FileText,
    BadgeCheck,
} from "lucide-react";

const processSteps = [
    {
        step: "STEP 1",
        label: "Inspect",
        title: "현장 점검",
        desc: "간판 소재, 오염 종류 및 정도, 주변 환경을 사전 점검하여 최적의 세정 방법을 결정합니다.",
        icon: Search,
        color: "bg-blue-500",
    },
    {
        step: "STEP 2",
        label: "Remove",
        title: "오염 제거",
        desc: "소재에 적합한 전용 약제를 적용하여 먼지, 매연, 곰팡이 등 표면 오염물을 안전하게 제거합니다.",
        icon: Trash2,
        color: "bg-red-500",
    },
    {
        step: "STEP 3",
        label: "Detail",
        title: "디테일 클리닝",
        desc: "글자 사이, 조명 틈새, 프레임 접합부 등 세밀한 부분까지 꼼꼼하게 마무리합니다.",
        icon: Sparkles,
        color: "bg-purple-500",
    },
    {
        step: "STEP 4",
        label: "Rinse & Coat",
        title: "린스 및 코팅",
        desc: "깨끗한 물로 잔여 세정제를 완벽 제거한 뒤, 오염 재부착을 방지하는 보호 코팅을 시공합니다.",
        icon: Droplets,
        color: "bg-emerald-500",
    },
    {
        step: "STEP 5",
        label: "Final Check",
        title: "최종 검수",
        desc: "작업 전·후 사진 대조, 고객 입회 하 최종 상태를 확인하고 작업 완료 보고서를 전달합니다.",
        icon: ClipboardCheck,
        color: "bg-amber-500",
    },
];

const serviceScopes = [
    {
        icon: RectangleVertical,
        title: "플렉스 간판",
        desc: "플렉스 소재 특성에 맞춘 저압 세정으로 변색·찢김 없이 본래의 선명한 색감을 복원합니다.",
    },
    {
        icon: Lightbulb,
        title: "LED 채널 간판",
        desc: "전기 회로에 영향을 주지 않는 정밀 세정 공법으로 조명 밝기와 글자 선명도를 되살립니다.",
    },
    {
        icon: Umbrella,
        title: "어닝 청소",
        desc: "천막·어닝 소재에 침착된 먼지, 곰팡이, 오염물을 전용 브러시와 약제로 깔끔하게 제거합니다.",
    },
    {
        icon: Mountain,
        title: "고층 간판",
        desc: "로프 작업 및 고소 장비를 활용하여 접근이 어려운 고층 간판도 안전하게 청소합니다.",
    },
];

const techPoints = [
    {
        icon: FlaskConical,
        title: "소재별 전용 약제 시스템",
        subtitle: "Material-Specific Solutions",
        desc: "알루미늄, 아크릴, 스테인리스, 갈바륨 등 간판 소재마다 최적화된 전용 세정제를 사용하여 부식·변색 위험 없이 오염만 선택적으로 제거합니다.",
        color: "bg-blue-500",
        borderColor: "border-blue-200",
    },
    {
        icon: Flame,
        title: "특수 오염 박리 공법",
        subtitle: "Advanced Stain Removal",
        desc: "일반 세정으로 제거되지 않는 매연 침착, 페인트 흔적, 조류(이끼) 오염 등을 전문 박리 기술로 깨끗하게 처리합니다.",
        color: "bg-red-500",
        borderColor: "border-red-200",
    },
    {
        icon: ShieldCheck,
        title: "외장 보호 코팅 서비스",
        subtitle: "Protective Coating",
        desc: "세정 완료 후 간판 표면에 UV 차단 및 오염 방지 코팅을 시공하여 깨끗한 상태를 오래 유지하고, 재오염 주기를 최대 50% 연장합니다.",
        color: "bg-emerald-500",
        borderColor: "border-emerald-200",
    },
];

const trustItems = [
    {
        icon: HardHat,
        title: "전문 고소 작업팀",
        desc: "산업안전보건법 준수, 유자격 고소 작업 전문 인력이 안전 장비를 완비하고 작업에 임합니다.",
        color: "bg-orange-500",
    },
    {
        icon: BadgeCheck,
        title: "영업배상책임보험 가입",
        desc: "작업 중 발생할 수 있는 모든 사고에 대해 영업배상책임보험으로 고객의 자산을 보호합니다.",
        color: "bg-blue-500",
    },
    {
        icon: FileText,
        title: "디지털 작업 보고서",
        desc: "작업 전·후 비교 사진, 사용 약제 내역, 점검 결과를 포함한 체계적인 보고서를 제공합니다.",
        color: "bg-emerald-500",
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

export function SignCleaningDetail() {
    const navigate = useNavigate();

    return (
        <div className="bg-white">
            {/* Hero Banner */}
            <section className="relative bg-[#1e2b4f] text-white overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: "url('./assets/services/sign_cleaning_hero_bg.jpg')" }}
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

                        <p className="text-blue-300 font-medium text-sm tracking-widest mb-3">BONYEON SIGN CLEANING</p>
                        <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-4">
                            간판 청소 서비스
                        </h1>
                        <p className="text-lg sm:text-xl text-white/80 max-w-2xl leading-relaxed">
                            "간판은 비즈니스의 얼굴입니다"
                        </p>
                        <p className="text-base text-white/60 mt-4 max-w-2xl leading-relaxed">
                            오염된 간판은 고객의 신뢰를 떨어뜨립니다. 본연(BONYEON)은 소재별 전문 세정 기술과 안전한 고소 작업 시스템으로
                            간판 본연의 깨끗함을 되찾아 드립니다.
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

            {/* 01. 간판 청소가 왜 필요한가요? */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="01"
                            title="간판 청소가 왜 필요한가요?"
                            subtitle="간판의 청결 상태는 고객이 매장에 들어서기 전, 가장 먼저 마주하는 브랜드 인상입니다."
                        />
                        <div className="grid sm:grid-cols-3 gap-6">
                            {([
                                {
                                    title: "브랜드 이미지 제고",
                                    desc: "깨끗하고 선명한 간판은 매장의 신뢰도를 높이고, 고객에게 '관리가 잘 되는 곳'이라는 긍정적 첫인상을 전달합니다.",
                                    icon: Star,
                                    color: "bg-amber-500",
                                },
                                {
                                    title: "시인성 확보",
                                    desc: "먼지와 매연에 가려진 간판은 광고 효과가 절반으로 줄어듭니다. 정기적인 세정으로 글자와 색상의 본래 선명도를 유지합니다.",
                                    icon: Eye,
                                    color: "bg-blue-500",
                                },
                                {
                                    title: "시설 수명 연장",
                                    desc: "오염물이 오래 방치되면 소재 부식과 변색이 가속됩니다. 전문 관리를 통해 간판의 교체 주기를 크게 늘릴 수 있습니다.",
                                    icon: Timer,
                                    color: "bg-emerald-500",
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

            {/* 02. BONYEON만의 특화된 청소 프로세스 */}
            <section className="py-16 px-4 sm:px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="02"
                            title="BONYEON만의 특화된 청소 프로세스"
                            subtitle="5단계 전문 공정을 통해 간판의 소재를 보호하면서 오염만 정밀하게 제거합니다."
                        />
                        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            {processSteps.map((step, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
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

            {/* 03. 서비스 대상 및 범위 */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="03"
                            title="서비스 대상 및 범위"
                            subtitle="다양한 간판 유형에 맞춘 전문 세정 솔루션을 제공합니다."
                        />
                        <div className="grid sm:grid-cols-2 gap-4">
                            {serviceScopes.map((scope, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 15 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-gray-50 rounded-xl p-6 hover:bg-blue-50/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <scope.icon className="w-8 h-8 text-blue-500 flex-shrink-0" />
                                        <h3 className="font-bold text-gray-900">{scope.title}</h3>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed">{scope.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 04. 3대 전문 기술 포인트 */}
            <section className="py-16 px-4 sm:px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="04"
                            title="3대 전문 기술 포인트"
                            subtitle="본연만의 차별화된 기술력으로 간판의 깨끗함과 수명을 동시에 책임집니다."
                        />
                        <div className="space-y-6">
                            {techPoints.map((point, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -15 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.15 }}
                                    className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`w-10 h-10 ${point.color} rounded-lg flex items-center justify-center`}>
                                            <point.icon className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">{point.title}</h3>
                                            <p className="text-sm text-gray-500">{point.subtitle}</p>
                                        </div>
                                    </div>
                                    <p className={`text-gray-600 mb-4 italic border-l-4 ${point.borderColor} pl-4`}>
                                        {point.desc}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 05. 안전 및 신뢰 시스템 */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="05"
                            title="안전 및 신뢰 시스템"
                            subtitle="고객의 안심을 최우선으로, 체계적인 안전 관리와 투명한 서비스를 약속합니다."
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

            {/* CTA */}
            <section className="py-16 px-4 sm:px-6 bg-[#1e2b4f] text-white text-center">
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                        간판의 첫인상을 되살리세요
                    </h2>
                    <p className="text-white/70 mb-8">
                        전문 상담을 통해 간판 상태를 진단하고 최적의 청소 플랜을 제안해 드립니다.
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
