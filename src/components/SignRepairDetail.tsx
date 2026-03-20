import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
    ArrowLeft,
    Phone,
    HardHat,
    Wrench,
    Sparkles,
    ClipboardCheck,
    ShieldCheck,
    Search,
    FileText,
    CheckCircle,
    ShieldAlert,
    Award,
    Users,
    DollarSign,
    VolumeX,
    Lightbulb,
    Timer,
    Camera,
    CalendarCheck,
} from "lucide-react";

const featureItems = [
    {
        icon: HardHat,
        title: "안전 우선 고소 작업",
        desc: "국가 공인 자격을 갖춘 전문가가 안전 장비를 완비하고 고소 작업을 수행합니다. 영업배상책임보험으로 만일의 사고에도 완벽히 대비합니다.",
        color: "bg-blue-500",
    },
    {
        icon: Wrench,
        title: "원인별 맞춤 수리",
        desc: "단순 조명 교체부터 구조 보강까지, 문제의 근본 원인을 진단하여 맞춤형 솔루션을 제공합니다. 재발 방지를 위한 근본적인 처방을 합니다.",
        color: "bg-amber-500",
    },
    {
        icon: Sparkles,
        title: "청소 + 수리 동시에",
        desc: "간판 수리와 함께 외부 세척을 동시 진행하여 별도 비용과 시간을 절약합니다. 한 번의 방문으로 간판을 새것처럼 되살립니다.",
        color: "bg-emerald-500",
    },
    {
        icon: ClipboardCheck,
        title: "철저한 사후 관리",
        desc: "수리 완료 후 작업 전후 비교 사진 리포트를 제공하며, 하자 보증 기간 내 무상 A/S를 보장합니다.",
        color: "bg-purple-500",
    },
];

const serviceTableItems = [
    {
        category: "조명 보수",
        items: [
            "LED 모듈 / 형광등 교체",
            "안정기(트랜스) 교체 및 배선 수리",
            "채널 간판 부분 점등 불량 수리",
            "네온사인 가스 충전 및 복원",
        ],
    },
    {
        category: "외관 복원",
        items: [
            "간판 시트지 교체 및 재시공",
            "아크릴 / 갈바 전면판 교체",
            "오염, 변색, 퇴색 세척 및 복원",
            "돌출 간판 글자 파손 보수",
        ],
    },
    {
        category: "구조 보수",
        items: [
            "간판 프레임 용접 및 보강",
            "내부 방수 처리 및 누수 방지",
            "볼트, 브라켓 교체 및 고정력 강화",
            "안전 점검 및 구조 진단",
        ],
    },
    {
        category: "철거 및 이전",
        items: [
            "노후 간판 안전 철거",
            "이전 설치 및 재배치",
            "임대 종료 시 원상 복구",
            "폐기물 수거 및 처리",
        ],
    },
];

const processSteps = [
    {
        step: "STEP 1",
        label: "Contact",
        title: "상담 접수",
        desc: "전화 또는 카카오톡으로 간판 상태와 요청 사항을 접수합니다.",
        icon: Phone,
        color: "bg-slate-500",
    },
    {
        step: "STEP 2",
        label: "Diagnosis",
        title: "현장 진단",
        desc: "전문가가 직접 방문하여 간판 상태를 정밀 진단하고 수리 방안을 수립합니다.",
        icon: Search,
        color: "bg-blue-500",
    },
    {
        step: "STEP 3",
        label: "Estimate",
        title: "견적 안내",
        desc: "진단 결과를 바탕으로 투명한 견적서를 작성하여 상세히 안내합니다.",
        icon: FileText,
        color: "bg-purple-500",
    },
    {
        step: "STEP 4",
        label: "Repair & Clean",
        title: "수리 + 세척",
        desc: "승인된 계획에 따라 수리와 외부 세척을 동시에 진행합니다.",
        icon: Wrench,
        color: "bg-amber-500",
    },
    {
        step: "STEP 5",
        label: "Inspection",
        title: "검수 완료",
        desc: "작업 완료 후 고객과 함께 최종 검수를 진행하고 리포트를 전달합니다.",
        icon: CheckCircle,
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

export function SignRepairDetail() {
    const navigate = useNavigate();

    return (
        <div className="bg-white">
            {/* Hero Banner */}
            <section className="relative bg-[#1e2b4f] text-white overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: "url('./assets/services/sign_repair_hero_bg.jpg')" }}
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

                        <p className="text-blue-300 font-medium text-sm tracking-widest mb-3">BONYEON SIGN REPAIR SERVICE</p>
                        <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-4">
                            간판 수리 서비스
                        </h1>
                        <p className="text-lg sm:text-xl text-white/80 max-w-2xl leading-relaxed">
                            "건물의 얼굴, 간판이 밝아야 비즈니스가 살아납니다"
                        </p>
                        <p className="text-base text-white/60 mt-4 max-w-2xl leading-relaxed">
                            꺼진 조명, 변색된 시트, 흔들리는 프레임. 방치된 간판은 매출 하락의 원인이 됩니다. 본연(BONYEON)이 간판을 새것처럼 되살려 비즈니스의 활력을 되찾아 드립니다.
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

            {/* 01. 서비스 특장점 */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="01"
                            title="서비스 특장점"
                            subtitle="본연의 간판 수리 서비스가 다른 이유, 네 가지 핵심 강점을 소개합니다."
                        />
                        <div className="grid sm:grid-cols-2 gap-4">
                            {featureItems.map((item, i) => (
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

            {/* 02. 주요 서비스 내용 */}
            <section className="py-16 px-4 sm:px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="02"
                            title="주요 서비스 내용"
                            subtitle="간판의 모든 문제를 원스톱으로 해결합니다."
                        />
                        <div className="grid sm:grid-cols-2 gap-4">
                            {serviceTableItems.map((group, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 15 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
                                >
                                    <h3 className="font-bold text-gray-900 mb-4 text-lg border-b border-gray-100 pb-2">{group.category}</h3>
                                    <ul className="space-y-2">
                                        {group.items.map((item, j) => (
                                            <li key={j} className="text-sm text-gray-600 flex items-start gap-2">
                                                <span className="text-blue-500 mt-0.5 flex-shrink-0 font-bold">&#10003;</span>
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 03. 작업 프로세스 */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="03"
                            title="작업 프로세스"
                            subtitle="상담부터 검수까지, 체계적인 5단계 프로세스로 진행합니다."
                        />
                        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            {processSteps.map((step, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-gray-50 rounded-xl p-5 hover:bg-blue-50/50 transition-colors text-center"
                                >
                                    <div className={`w-12 h-12 ${step.color} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                                        <step.icon className="w-6 h-6 text-white" />
                                    </div>
                                    <p className="text-xs font-bold text-gray-400 mb-0.5">{step.step}</p>
                                    <p className="text-xs text-blue-600 font-medium mb-1">[{step.label}]</p>
                                    <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                                    <p className="text-xs text-gray-600 leading-relaxed">{step.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* SECTION 1: 안전과 책임 */}
            <section className="py-16 px-4 sm:px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="04"
                            title="안전과 책임"
                            subtitle="고소 작업의 안전은 타협할 수 없습니다. 본연은 안전을 최우선으로 합니다."
                        />
                        <div className="grid sm:grid-cols-3 gap-4">
                            {([
                                {
                                    icon: ShieldAlert,
                                    title: "영업배상책임보험",
                                    desc: "작업 중 발생할 수 있는 모든 사고에 대비한 영업배상책임보험에 가입되어 있습니다. 건물주와 입주민 모두 안심하실 수 있습니다.",
                                },
                                {
                                    icon: Award,
                                    title: "국가 공인 전문가",
                                    desc: "고소작업 관련 국가 공인 자격증을 보유한 전문 기술자가 작업합니다. 체계적인 안전 교육을 이수한 숙련된 인력만 투입됩니다.",
                                },
                                {
                                    icon: Users,
                                    title: "2인 1조 안전 원칙",
                                    desc: "모든 고소 작업은 반드시 2인 1조로 진행합니다. 한 명은 작업, 한 명은 안전 감시를 전담하여 사고를 원천 차단합니다.",
                                },
                            ] as const).map((item, i) => (
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

            {/* SECTION 2: 경제성과 효율성 */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="05"
                            title="경제성과 효율성"
                            subtitle="불필요한 비용은 줄이고, 비즈니스 운영에 지장을 주지 않는 스마트한 시공을 약속합니다."
                        />
                        <div className="grid sm:grid-cols-2 gap-4">
                            {([
                                {
                                    icon: DollarSign,
                                    title: "불필요한 장비 임대료 ZERO",
                                    desc: "자체 보유한 전문 장비(사다리차, 고소작업대, 크레인 등)로 시공하여 외부 장비 임대 비용이 발생하지 않습니다. 합리적인 견적의 비결입니다.",
                                    color: "bg-amber-500",
                                },
                                {
                                    icon: VolumeX,
                                    title: "영업 방해 없는 무소음 시공",
                                    desc: "영업 시간 외 작업, 소음 최소화 공법 적용으로 매장 운영에 전혀 지장을 주지 않습니다. 고객의 비즈니스가 멈추지 않도록 배려합니다.",
                                    color: "bg-blue-500",
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

            {/* SECTION 3: 에너지 세이빙 */}
            <section className="py-16 px-4 sm:px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="06"
                            title="에너지 세이빙"
                            subtitle="간판 수리와 함께 에너지 비용까지 절감하는 스마트 솔루션을 제공합니다."
                        />
                        <div className="grid sm:grid-cols-2 gap-4">
                            {([
                                {
                                    icon: Lightbulb,
                                    title: "LED 교체로 전기료 다이어트",
                                    desc: "기존 형광등, 네온 조명을 고효율 LED로 교체하면 전기료를 최대 60% 절감할 수 있습니다. 교체 비용은 절약된 전기료로 빠르게 회수됩니다.",
                                    color: "bg-amber-500",
                                },
                                {
                                    icon: Timer,
                                    title: "스마트 타이머 무료 세팅",
                                    desc: "간판 수리 시 자동 점등/소등 타이머를 무료로 세팅해 드립니다. 영업 시간에 맞춰 자동 제어되어 불필요한 전력 낭비를 방지합니다.",
                                    color: "bg-emerald-500",
                                },
                            ] as const).map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 15 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
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

            {/* SECTION 4: 투명한 보고 */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="07"
                            title="투명한 보고"
                            subtitle="고소 부위는 직접 확인이 어렵습니다. 본연은 눈으로 확인할 수 있는 증거를 제공합니다."
                        />
                        <div className="grid sm:grid-cols-2 gap-4">
                            {([
                                {
                                    icon: Camera,
                                    title: "고소 부위 정밀 사진 리포트",
                                    desc: "작업 전후 비교 사진을 고화질로 촬영하여 상세 리포트로 제공합니다. 고소 부위의 상태를 눈높이에서 확인하실 수 있습니다.",
                                    color: "bg-blue-500",
                                },
                                {
                                    icon: CalendarCheck,
                                    title: "무료 안전 점검 서비스",
                                    desc: "수리 완료 후 6개월 내 1회 무료 안전 점검을 제공합니다. 간판의 고정 상태, 누수 여부, 조명 작동을 재확인하여 안전을 보장합니다.",
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

            {/* CTA */}
            <section className="py-16 px-4 sm:px-6 bg-[#1e2b4f] text-white text-center">
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                        간판이 밝아야 비즈니스가 살아납니다
                    </h2>
                    <p className="text-white/70 mb-8">
                        꺼진 조명, 낡은 간판 때문에 고민이신가요? 전문가가 무료로 진단해 드립니다.
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
