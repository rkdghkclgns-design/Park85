import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, Phone, ShieldCheck, Sparkles, Clock, Tent, Wind, Droplets, Flame, BedDouble, ClipboardCheck, Bug, SprayCan, Wrench } from "lucide-react";

const whyRegularCleaning = [
    {
        icon: ShieldCheck,
        title: "위생 방역",
        desc: "투숙객 교체 시마다 축적되는 세균·곰팡이·진드기를 전문 장비로 제거하여 감염 위험을 사전에 차단합니다.",
        color: "bg-blue-500",
    },
    {
        icon: BedDouble,
        title: "패브릭 수명 연장",
        desc: "침구, 러그, 커튼 등 고가 패브릭을 소재별 전용 케어로 관리하여 교체 주기를 늘리고 비용을 절감합니다.",
        color: "bg-emerald-500",
    },
    {
        icon: Clock,
        title: "운영 효율 극대화",
        desc: "퇴실~입실 사이 타이트한 턴오버 시간에 체계적인 청소 프로세스를 적용해 재투숙 준비 시간을 단축합니다.",
        color: "bg-purple-500",
    },
];

const whyDeepCleaning = [
    {
        icon: Tent,
        title: "특수 소재 관리",
        desc: "텐트 스킨, 방수 코팅 원단, 우드 데크 등 글램핑 특유의 소재는 전문 세정제와 장비로만 안전하게 관리할 수 있습니다.",
        color: "bg-amber-500",
    },
    {
        icon: Bug,
        title: "잔류 음식물 제거",
        desc: "바비큐, 조리 후 남는 기름때·음식 냄새·해충 유인 요소를 근본적으로 제거하여 위생 리스크를 차단합니다.",
        color: "bg-red-500",
    },
    {
        icon: ShieldCheck,
        title: "안전 투숙 환경",
        desc: "화재 위험 요소 점검, 가스 라인 청결 유지, 미끄럼 방지 처리 등 투숙객 안전까지 고려한 통합 관리를 수행합니다.",
        color: "bg-blue-500",
    },
];

const layerSystem = [
    {
        layer: "Layer 1",
        label: "Exterior",
        title: "외부 관리",
        items: [
            { name: "텐트 스킨 세척", desc: "방수 코팅을 보호하면서 곰팡이·물때·먼지를 제거하는 전용 세정 공정" },
            { name: "데크 정비", desc: "우드 데크 이끼·오염 제거 및 미끄럼 방지 코팅 점검" },
        ],
        color: "bg-blue-500",
        borderColor: "border-blue-200",
    },
    {
        layer: "Layer 2",
        label: "Interior",
        title: "내부 관리",
        items: [
            { name: "패브릭 케어", desc: "침구·러그·쿠션 등 섬유 소재의 진드기 제거 및 살균 건조" },
            { name: "바닥 및 공조", desc: "내부 바닥 습식 케어, 에어컨·난방기 필터 세척 및 환기 시스템 점검" },
        ],
        color: "bg-emerald-500",
        borderColor: "border-emerald-200",
    },
    {
        layer: "Layer 3",
        label: "Sanitary",
        title: "위생 특화",
        items: [
            { name: "고온 스팀 살균", desc: "100°C 이상 고온 스팀으로 매트리스·소파·카펫 심층 살균 처리" },
            { name: "베딩 솔루션", desc: "투숙객 교체 시 베개·이불·토퍼 전수 교체 또는 전문 세탁 연계 서비스" },
        ],
        color: "bg-purple-500",
        borderColor: "border-purple-200",
    },
];

const differentiationPoints = [
    {
        icon: Wind,
        title: "냄새 제로",
        desc: "바비큐 연기, 습기, 곰팡이 등 글램핑 특유의 냄새 원인을 근본적으로 제거하는 다중 탈취 솔루션을 적용합니다.",
        color: "bg-blue-500",
    },
    {
        icon: SprayCan,
        title: "안심 방역",
        desc: "인체에 무해한 친환경 방역제를 사용하여 해충·진드기·세균을 차단하고, 자연 속에서도 안심할 수 있는 투숙 환경을 제공합니다.",
        color: "bg-emerald-500",
    },
    {
        icon: Wrench,
        title: "소재별 전문 장비",
        desc: "텐트 원단, 방수 코팅, 우드, 패브릭 등 소재 특성에 맞는 전용 장비와 세정제를 사용하여 손상 없는 정밀 케어를 실현합니다.",
        color: "bg-amber-500",
    },
];

const processSteps = [
    { step: "STEP 1", title: "현장 진단", desc: "텐트 상태·오염도·소재 확인 후 맞춤 작업 계획 수립", icon: ClipboardCheck, color: "bg-blue-500" },
    { step: "STEP 2", title: "건식 먼지 제거", desc: "HEPA 필터 장비로 내·외부 미세먼지 및 잔해물 1차 제거", icon: Wind, color: "bg-gray-500" },
    { step: "STEP 3", title: "정밀 습식 세척", desc: "소재별 전용 세정제로 얼룩·기름때·곰팡이 정밀 제거", icon: Droplets, color: "bg-cyan-500" },
    { step: "STEP 4", title: "고온 스팀 살균", desc: "100°C 이상 스팀으로 매트리스·패브릭·바닥 심층 살균", icon: Flame, color: "bg-red-500" },
    { step: "STEP 5", title: "탈취 방역", desc: "친환경 탈취제 분사 및 해충 방역 처리로 쾌적한 공간 완성", icon: SprayCan, color: "bg-emerald-500" },
    { step: "STEP 6", title: "마지막 검수", desc: "체크리스트 기반 최종 품질 검수 및 사진 기록 완료", icon: Sparkles, color: "bg-amber-500" },
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

export function GlampingDetail() {
    const navigate = useNavigate();

    return (
        <div className="bg-white">
            {/* Hero Banner */}
            <section className="relative bg-[#1e2b4f] text-white overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: "url('./assets/services/glamping_hero_bg.jpg')" }}
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

                        <p className="text-blue-300 font-medium text-sm tracking-widest mb-3">BONYEON GLAMPING CARE</p>
                        <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-4">
                            글램핑 케어 솔루션
                        </h1>
                        <p className="text-lg sm:text-xl text-white/80 max-w-2xl leading-relaxed">
                            "자연의 낭만은 그대로, 청결은 호텔 수준으로"
                        </p>
                        <p className="text-base text-white/60 mt-4 max-w-2xl leading-relaxed">
                            자연 속 프리미엄 숙소에 걸맞은 위생 수준을 유지합니다. 본연(BONYEON)이 글램핑 특화 청소·살균·방역 솔루션으로 투숙객 만족도와 운영 효율을 동시에 높여 드립니다.
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

            {/* 01. 퇴실 후 정기 청소가 필요한 이유 */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="01"
                            title="퇴실 후 정기 청소가 필요한 이유"
                            subtitle="투숙객이 떠난 뒤 눈에 보이지 않는 오염까지 관리해야 다음 고객의 만족도를 보장할 수 있습니다."
                        />
                        <div className="grid sm:grid-cols-3 gap-4">
                            {whyRegularCleaning.map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 15 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-gray-50 rounded-xl p-6 hover:bg-blue-50/50 transition-colors"
                                >
                                    <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center mb-4`}>
                                        <item.icon className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 02. 전체적인 글램핑 청소가 필요한 이유 */}
            <section className="py-16 px-4 sm:px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="02"
                            title="전체적인 글램핑 청소가 필요한 이유"
                            subtitle="퇴실 청소만으로는 부족합니다. 글램핑 시설 전체를 주기적으로 관리해야 시설 수명과 투숙객 안전을 동시에 지킬 수 있습니다."
                        />
                        <div className="grid sm:grid-cols-3 gap-4">
                            {whyDeepCleaning.map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 15 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center mb-4`}>
                                        <item.icon className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 03. 서비스 상세 범위 - 3-Layer System */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="03"
                            title="서비스 상세 범위 (3-Layer System)"
                            subtitle="글램핑 시설의 외부·내부·위생 영역을 3개 레이어로 분류하여 빈틈없이 관리합니다."
                        />
                        <div className="space-y-6">
                            {layerSystem.map((layer, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -15 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.15 }}
                                    className={`bg-gray-50 rounded-xl p-6 border-l-4 ${layer.borderColor}`}
                                >
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`w-10 h-10 ${layer.color} rounded-lg flex items-center justify-center`}>
                                            <span className="text-white font-bold text-xs">{layer.layer.split(" ")[1]}</span>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">{layer.title}</h3>
                                            <p className="text-xs text-gray-500 font-medium">{layer.layer} — {layer.label}</p>
                                        </div>
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        {layer.items.map((item, j) => (
                                            <div key={j} className="bg-white rounded-lg p-4 shadow-sm">
                                                <h4 className="font-bold text-gray-900 text-sm mb-1">{item.name}</h4>
                                                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 04. 차별화 포인트 */}
            <section className="py-16 px-4 sm:px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="04"
                            title="차별화 포인트"
                            subtitle="본연만의 글램핑 전문 케어가 일반 청소와 다른 이유입니다."
                        />
                        <div className="grid sm:grid-cols-3 gap-6">
                            {differentiationPoints.map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 15 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
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

            {/* 05. 정기 관리 플랜 공정표 */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="05"
                            title="정기 관리 플랜 공정표"
                            subtitle="6단계 체계적 공정으로 글램핑 시설의 위생을 완벽하게 관리합니다."
                        />
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                            {processSteps.map((step, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-gray-50 rounded-xl p-6 hover:bg-blue-50/50 transition-colors"
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

                        {/* 모바일 위생 리포트 */}
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="bg-blue-50 rounded-xl p-6 border border-blue-100"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                    <ClipboardCheck className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">모바일 위생 리포트</h3>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                매 작업 완료 후 사진 기반 위생 리포트를 모바일로 전송합니다. 작업 전·후 비교 사진, 체크리스트 완료 현황, 특이사항 메모를 실시간으로 확인하실 수 있어 현장에 직접 방문하지 않아도 위생 관리 상태를 투명하게 파악할 수 있습니다.
                            </p>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-16 px-4 sm:px-6 bg-[#1e2b4f] text-white text-center">
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                        자연 속 프리미엄 위생, 본연이 책임집니다
                    </h2>
                    <p className="text-white/70 mb-8">
                        글램핑 시설에 최적화된 케어 플랜을 무료로 상담해 드립니다.
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
                            onClick={() => {
                                navigate("/");
                                setTimeout(() => {
                                    document.getElementById("section-services")?.scrollIntoView({ behavior: "smooth" });
                                }, 100);
                            }}
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white text-white rounded-lg font-bold hover:bg-white hover:text-[#1e2b4f] transition-colors"
                        >
                            다른 서비스 보기
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
