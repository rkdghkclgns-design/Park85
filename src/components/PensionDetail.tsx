import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, Phone, Eraser, Star, Clock, Building2, Users, BarChart3, ShieldAlert, Wind, BedDouble, UtensilsCrossed, Sofa, ClipboardCheck, Leaf, Droplets, Gem } from "lucide-react";

const whyCheckoutCleaning = [
    {
        icon: Eraser,
        title: "흔적 지우기",
        desc: "이전 투숙객이 남긴 머리카락, 얼룩, 음식 냄새 등 모든 흔적을 완벽히 제거하여 새 투숙객에게 '처음 그대로'의 공간을 제공합니다.",
        color: "bg-blue-500",
    },
    {
        icon: Star,
        title: "리뷰 별점 관리",
        desc: "숙소 청결도는 리뷰 별점의 핵심 요소입니다. 전문 청소로 일관된 위생 수준을 유지하면 자연스럽게 높은 평점과 재예약률을 확보합니다.",
        color: "bg-amber-500",
    },
    {
        icon: Clock,
        title: "운영 효율 극대화",
        desc: "퇴실~입실 사이 촉박한 시간에 숙련된 전문 인력이 체계적으로 작업하여 턴오버 지연 없이 안정적인 운영을 지원합니다.",
        color: "bg-emerald-500",
    },
];

const whyRegularManagement = [
    {
        title: "건축물 및 비품 수명 연장",
        desc: "바닥재, 벽지, 가구, 가전 등 비품의 오염을 주기적으로 관리하면 교체 비용을 절감하고 시설의 수명을 크게 연장할 수 있습니다.",
        color: "bg-blue-500",
        borderColor: "border-blue-400",
    },
    {
        title: "고정 투입 인력의 숙련도",
        desc: "매번 다른 인력이 아닌, 해당 펜션을 잘 아는 고정 전담팀이 투입되어 공간 구조와 특성을 파악한 효율적이고 꼼꼼한 관리가 가능합니다.",
        color: "bg-emerald-500",
        borderColor: "border-emerald-400",
    },
    {
        title: "위생의 상향 평준화",
        desc: "체크리스트 기반 표준 작업 절차(SOP)를 적용하여 누가, 언제 작업하더라도 동일한 수준의 위생 품질을 보장합니다.",
        color: "bg-amber-500",
        borderColor: "border-amber-400",
    },
    {
        title: "기물 파손 및 안전 사고 예방",
        desc: "정기 점검 시 시설 이상 징후를 조기에 발견하여 기물 파손, 누수, 안전 사고 등을 사전에 예방합니다.",
        color: "bg-red-500",
        borderColor: "border-red-400",
    },
];

const serviceCurriculum = [
    {
        step: "Step 1",
        label: "공간 Re-Set",
        subtitle: "환기 및 탈취",
        desc: "전 객실 창문 개방 환기, 잔류 냄새 원인 파악 및 탈취제 분사, 쓰레기·잔여물 수거 후 초기 상태로 리셋합니다.",
        icon: Wind,
        color: "bg-blue-500",
    },
    {
        step: "Step 2",
        label: "Bedding Care",
        subtitle: "침구 및 침실",
        desc: "침구류 교체 또는 전문 세탁 연계, 매트리스·베개 진드기 제거, 침실 먼지 케어 및 조명·콘센트 점검을 수행합니다.",
        icon: BedDouble,
        color: "bg-purple-500",
    },
    {
        step: "Step 3",
        label: "Hygiene Zone",
        subtitle: "주방 및 욕실",
        desc: "주방 기름때·식기 살균·냉장고 내부 세척, 욕실 곰팡이·물때 제거·배수구 세정·수전 광택 처리를 진행합니다.",
        icon: UtensilsCrossed,
        color: "bg-emerald-500",
    },
    {
        step: "Step 4",
        label: "Living & Detail",
        subtitle: "거실 및 부대시설",
        desc: "거실 바닥 3단계 케어, 소파·쿠션 패브릭 관리, TV·리모컨·스위치 살균, 바비큐장·테라스 등 부대시설 정비를 실시합니다.",
        icon: Sofa,
        color: "bg-amber-500",
    },
    {
        step: "Step 5",
        label: "Final Report",
        subtitle: "검수 및 보고",
        desc: "체크리스트 기반 최종 검수, 작업 전·후 비교 사진 촬영, 모바일 위생 리포트 전송 및 특이사항 피드백을 제공합니다.",
        icon: ClipboardCheck,
        color: "bg-gray-700",
    },
];

const coreStrengths = [
    {
        icon: Leaf,
        title: "Eco-Friendly",
        desc: "친환경 인증 세정제만 사용하여 투숙객의 피부와 호흡기에 안전한 공간을 만듭니다. 자연 속 펜션의 가치에 걸맞은 친환경 케어를 실현합니다.",
        color: "bg-green-500",
    },
    {
        icon: Droplets,
        title: "Odor Control",
        desc: "바비큐 연기, 습기, 배수구 악취 등 펜션 특유의 냄새 원인을 근본적으로 차단합니다. 다중 탈취 솔루션으로 다음 투숙객에게 깨끗한 첫 인상을 전달합니다.",
        color: "bg-blue-500",
    },
    {
        icon: Gem,
        title: "Black Card Detail",
        desc: "눈에 보이지 않는 곳까지 꼼꼼하게. 리모컨 틈새, 서랍 안쪽, 배수구 내부 등 일반 청소에서 놓치기 쉬운 디테일까지 완벽하게 관리합니다.",
        color: "bg-gray-800",
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

export function PensionDetail() {
    const navigate = useNavigate();

    return (
        <div className="bg-white">
            {/* Hero Banner */}
            <section className="relative bg-[#1e2b4f] text-white overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: "url('./assets/services/pension_hero_bg.jpg')" }}
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

                        <p className="text-blue-300 font-medium text-sm tracking-widest mb-3">BONYEON PENSION CARE</p>
                        <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-4">
                            펜션 케어 솔루션
                        </h1>
                        <p className="text-lg sm:text-xl text-white/80 max-w-2xl leading-relaxed">
                            "보이지 않는 곳까지 '본연'의 깨끗함으로 채웁니다"
                        </p>
                        <p className="text-base text-white/60 mt-4 max-w-2xl leading-relaxed">
                            투숙객이 체크인하는 그 순간, 청결이 신뢰가 됩니다. 본연(BONYEON)이 펜션 운영에 최적화된 전문 청소·살균·관리 솔루션으로 높은 리뷰 평점과 재예약률을 만들어 드립니다.
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

            {/* 01. 전문 퇴실 청소가 필요한 이유 */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="01"
                            title="전문 퇴실 청소가 필요한 이유"
                            subtitle="투숙객이 떠난 뒤의 청소 품질이 다음 고객의 첫인상과 리뷰를 결정합니다."
                        />
                        <div className="grid sm:grid-cols-3 gap-4">
                            {whyCheckoutCleaning.map((item, i) => (
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

            {/* 02. 정기적인 관리가 필요한 이유 - Color-Coded Cards */}
            <section className="py-16 px-4 sm:px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="02"
                            title="정기적인 관리가 필요한 이유"
                            subtitle="퇴실 청소를 넘어, 시설 전체를 주기적으로 관리해야 펜션의 자산 가치와 경쟁력을 유지할 수 있습니다."
                        />
                        <div className="grid sm:grid-cols-2 gap-4">
                            {whyRegularManagement.map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 15 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className={`bg-white rounded-xl p-6 shadow-sm border-l-4 ${item.borderColor} hover:shadow-md transition-shadow`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-3 h-3 ${item.color} rounded-full mt-1.5 flex-shrink-0`} />
                                        <div>
                                            <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                                            <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 03. 서비스 커리큘럼 - 5 Steps */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="03"
                            title="서비스 커리큘럼"
                            subtitle="공간별 특성에 맞는 5단계 체계적 프로세스로 펜션 전체를 케어합니다."
                        />
                        <div className="space-y-4">
                            {serviceCurriculum.map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -15 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-gray-50 rounded-xl p-5 hover:bg-blue-50/30 transition-colors"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`w-14 h-14 ${item.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                            <item.icon className="w-7 h-7 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 mb-0.5">{item.step}</p>
                                            <h3 className="font-bold text-gray-900">
                                                {item.label}
                                                <span className="text-sm font-medium text-blue-600 ml-2">— {item.subtitle}</span>
                                            </h3>
                                            <p className="text-sm text-gray-600 leading-relaxed mt-2">{item.desc}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 04. 핵심 차별화 포인트 */}
            <section className="py-16 px-4 sm:px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="04"
                            title="핵심 차별화 포인트"
                            subtitle="본연만의 펜션 전문 케어가 일반 청소와 다른 이유입니다."
                        />
                        <div className="grid sm:grid-cols-3 gap-6">
                            {coreStrengths.map((item, i) => (
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

            {/* CTA */}
            <section className="py-16 px-4 sm:px-6 bg-[#1e2b4f] text-white text-center">
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                        펜션의 가치를 지키는 전문 케어, 지금 시작하세요
                    </h2>
                    <p className="text-white/70 mb-4">
                        펜션 운영에 최적화된 맞춤 케어 플랜을 무료로 상담해 드립니다.
                    </p>
                    <p className="text-white/50 text-sm italic mb-8">
                        "청소는 지출이 아니라, 내 소중한 자산을 지키는 '투자'입니다."
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
