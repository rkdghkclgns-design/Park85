import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
    ArrowLeft,
    Phone,
    ShieldAlert,
    DollarSign,
    Wind,
    CheckCircle2,
    Zap,
    Fan,
    ShieldCheck,
    ScanSearch,
    Wrench,
    ShieldPlus,
    Leaf,
    Droplets,
    Sparkles,
    ClipboardCheck,
} from "lucide-react";

const whyCleanCards = [
    {
        icon: ShieldAlert,
        title: "치명적 미생물 차단",
        desc: "에어컨 내부는 곰팡이, 레지오넬라균 등 유해 미생물의 온상입니다. 정기 세척 없이는 냉방 가동 시 오염된 공기가 실내에 직접 분사됩니다.",
        color: "bg-red-500",
    },
    {
        icon: DollarSign,
        title: "비용 절감",
        desc: "열교환기에 먼지가 쌓이면 냉방 효율이 떨어져 전기요금이 최대 30% 이상 상승합니다. 정밀 세척으로 에너지 낭비를 차단합니다.",
        color: "bg-amber-500",
    },
    {
        icon: Wind,
        title: "쾌적한 환경",
        desc: "퀴퀴한 냄새의 90% 이상은 에어컨 내부 오염에서 비롯됩니다. 근본적인 세척만이 진정한 쾌적함을 되찾아 줍니다.",
        color: "bg-blue-500",
    },
];

const selfCheckItems = [
    "에어컨을 켜면 퀴퀴한 냄새가 난다",
    "바람 세기가 예전보다 약해진 느낌이 든다",
    "에어컨 가동 시 눈이 따갑거나 목이 간지럽다",
    "송풍구 주변에 검은 점(곰팡이)이 보인다",
    "같은 온도인데 전기요금이 이전보다 증가했다",
];

const statsCards = [
    {
        label: "Energy Saving",
        value: "15~30%",
        desc: "전기요금 절감",
        color: "bg-emerald-500",
        icon: Zap,
    },
    {
        label: "Air-Flow Up",
        value: "20%",
        desc: "풍량 효율 향상",
        color: "bg-blue-500",
        icon: Fan,
    },
    {
        label: "Safe Air",
        value: "99.9%",
        desc: "살균 완료",
        color: "bg-purple-500",
        icon: ShieldCheck,
    },
];

const comparisonRows = [
    { category: "분해 범위", low: "필터·전면 커버만 분리", bonyeon: "열교환기·드레인팬·송풍팬 완전 분해" },
    { category: "세척 방식", low: "스프레이 약품 분사 후 간단 세정", bonyeon: "고압 세척수 관통 + 다단계 헹굼" },
    { category: "약품 사용", low: "범용 세정제 (잔류 성분 우려)", bonyeon: "친환경 인증 전용 약품 (인체 무해)" },
    { category: "사후 관리", low: "없음", bonyeon: "세척 전후 사진 리포트 + 관리 가이드" },
    { category: "전문 장비", low: "가정용 도구 활용", bonyeon: "산업용 고압 세척기 + HEPA 집진기" },
];

const processSteps = [
    {
        step: "STEP 01",
        label: "Pre-Check",
        title: "사전 진단",
        desc: "에어컨 기종, 설치 환경, 오염 정도를 사전 진단하여 최적의 세척 전략을 수립합니다.",
        icon: ScanSearch,
        color: "bg-blue-500",
    },
    {
        step: "STEP 02",
        label: "Disassemble",
        title: "완전 분해",
        desc: "필터, 전면 패널은 물론 열교환기, 드레인팬, 송풍팬까지 세척 가능한 모든 부품을 완전 분해합니다.",
        icon: Wrench,
        color: "bg-gray-600",
    },
    {
        step: "STEP 03",
        label: "Protect",
        title: "철저한 보양",
        desc: "벽면, 바닥, 가구, 전자기기를 전문 보양재로 완벽하게 보호하여 2차 오염을 방지합니다.",
        icon: ShieldPlus,
        color: "bg-indigo-500",
    },
    {
        step: "STEP 04",
        label: "Eco-Clean",
        title: "친환경 약품 적용",
        desc: "인체에 무해한 친환경 인증 전용 세정제를 적용하여 찌든 오염과 곰팡이를 분해합니다.",
        icon: Leaf,
        color: "bg-green-500",
    },
    {
        step: "STEP 05",
        label: "Deep Wash",
        title: "심층 고압 세척",
        desc: "산업용 고압 세척기로 냉각핀 사이사이, 드레인팬 내부까지 세척수를 관통시켜 오염물을 완벽 제거합니다.",
        icon: Droplets,
        color: "bg-cyan-500",
    },
    {
        step: "STEP 06",
        label: "Sanitize",
        title: "살균 및 건조",
        desc: "전용 살균제로 99.9% 살균 처리 후 충분한 건조 시간을 확보하여 곰팡이 재발생을 억제합니다.",
        icon: Sparkles,
        color: "bg-purple-500",
    },
    {
        step: "STEP 07",
        label: "Final Check",
        title: "철저한 검수",
        desc: "재조립 후 정상 가동 테스트, 풍량·온도 확인, 세척 전후 비교 사진 리포트를 제공합니다.",
        icon: ClipboardCheck,
        color: "bg-amber-500",
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

export function AirconCleaningDetail() {
    const navigate = useNavigate();

    return (
        <div className="bg-white">
            {/* Hero Banner */}
            <section className="relative bg-[#1e2b4f] text-white overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: "url('./assets/services/aircon_hero_bg.jpg')" }}
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

                        <p className="text-blue-300 font-medium text-sm tracking-widest mb-3">BONYEON AIRCON CARE</p>
                        <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-4">
                            에어컨 & 공조기 정밀 케어
                        </h1>
                        <p className="text-lg sm:text-xl text-white/80 max-w-2xl leading-relaxed">
                            눈에 보이는 먼지만 닦지 않습니다. 보이지 않는 오염의 근본을 제거합니다.
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

            {/* 01. 왜 에어컨 세척이 필수인가요? */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="01"
                            title="왜 에어컨 & 공조기 세척이 필수인가요?"
                            subtitle="에어컨은 단순 가전이 아닙니다. 실내 공기의 질을 결정하는 핵심 설비입니다."
                        />
                        <div className="grid sm:grid-cols-3 gap-6">
                            {whyCleanCards.map((card, i) => (
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

            {/* 02. 에어컨 자가진단 리스트 */}
            <section className="py-16 px-4 sm:px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="02"
                            title="에어컨 자가진단 리스트"
                            subtitle="아래 항목 중 하나라도 해당된다면, 전문 세척이 필요한 시점입니다."
                        />
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 max-w-2xl">
                            <ul className="space-y-4">
                                {selfCheckItems.map((item, i) => (
                                    <motion.li
                                        key={i}
                                        initial={{ opacity: 0, x: -15 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.1 }}
                                        className="flex items-start gap-3"
                                    >
                                        <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-700 leading-relaxed">{item}</span>
                                    </motion.li>
                                ))}
                            </ul>
                            <p className="text-sm text-gray-500 mt-6 border-t border-gray-100 pt-4">
                                2개 이상 해당 시 전문 세척을 권장합니다. 무료 사전 진단을 받아보세요.
                            </p>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 03. 데이터로 증명하는 본연의 가치 */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="03"
                            title="데이터로 증명하는 본연의 가치"
                            subtitle="본연의 정밀 세척은 체감할 수 있는 수치로 그 효과를 증명합니다."
                        />
                        <div className="grid sm:grid-cols-3 gap-6">
                            {statsCards.map((stat, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-gray-50 rounded-xl p-6 text-center hover:bg-blue-50/50 transition-colors"
                                >
                                    <div className={`w-14 h-14 ${stat.color} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                                        <stat.icon className="w-7 h-7 text-white" />
                                    </div>
                                    <p className="text-xs font-bold text-gray-400 tracking-widest mb-1">{stat.label}</p>
                                    <p className="text-3xl sm:text-4xl font-black text-gray-900 mb-1">{stat.value}</p>
                                    <p className="text-sm text-gray-600">{stat.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 04. 저가 업체와 본연의 결정적 차이 */}
            <section className="py-16 px-4 sm:px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="04"
                            title="저가 업체와 본연의 결정적 차이"
                            subtitle="가격이 아닌 '결과'로 비교해 주세요. 진정한 세척은 눈에 보이지 않는 곳에서 차이가 납니다."
                        />

                        {/* Comparison Table */}
                        <div className="overflow-x-auto mb-8">
                            <table className="w-full bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 w-1/4">비교 항목</th>
                                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-400 w-[37.5%]">저가 업체</th>
                                        <th className="px-4 py-3 text-left text-sm font-bold text-blue-600 w-[37.5%]">본연 (BONYEON)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {comparisonRows.map((row, i) => (
                                        <motion.tr
                                            key={i}
                                            initial={{ opacity: 0 }}
                                            whileInView={{ opacity: 1 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: i * 0.08 }}
                                            className="border-t border-gray-100"
                                        >
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.category}</td>
                                            <td className="px-4 py-3 text-sm text-gray-500">{row.low}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700 font-medium">{row.bonyeon}</td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <p className="text-gray-600 italic border-l-4 border-blue-200 pl-4">
                            "우리는 10분 더 걸리더라도 냉각핀의 뒷면까지 세척수가 관통하는 것을 확인합니다."
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* 05. 본연의 7단계 정밀 세척 프로세스 */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="05"
                            title="본연의 7단계 정밀 세척 프로세스"
                            subtitle="한 단계도 건너뛰지 않는 체계적인 공정이 완벽한 결과를 만듭니다."
                        />
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {processSteps.map((step, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.08 }}
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

            {/* CTA */}
            <section className="py-16 px-4 sm:px-6 bg-[#1e2b4f] text-white text-center">
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                        깨끗한 공기, 본연의 정밀 세척으로 시작하세요
                    </h2>
                    <p className="text-white/70 mb-8">
                        전문 상담을 통해 에어컨 기종과 환경에 맞는 최적의 세척 솔루션을 제안해 드립니다.
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
