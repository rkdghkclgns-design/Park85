import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, Phone, AlertTriangle, Search, ShieldCheck, Wind, Beaker, Layers, Atom, Zap, FileText, HeartPulse, Brain, Activity, Leaf, ClipboardCheck, Settings, Users } from "lucide-react";

const dangerPoints = [
    {
        icon: HeartPulse,
        title: "호흡기 · 피부 질환",
        desc: "눈 따가움, 기침, 피부 발진, 아토피 악화 등 즉각적인 건강 이상 증상을 유발합니다.",
        color: "bg-rose-500",
    },
    {
        icon: Brain,
        title: "신경계 독성",
        desc: "두통, 어지러움, 집중력 저하 등 신경계에 영향을 미치며, 장기 노출 시 만성 피로와 불면을 초래합니다.",
        color: "bg-purple-500",
    },
    {
        icon: Activity,
        title: "발암성 물질",
        desc: "폼알데하이드는 세계보건기구(WHO)가 지정한 1군 발암물질로, 장기 노출 시 비인두암 등의 위험이 증가합니다.",
        color: "bg-red-500",
    },
];

const processSteps = [
    {
        step: "STEP 01",
        title: "정밀 측정 및 진단",
        desc: "폼알데하이드, TVOC, 벤젠 등 유해물질 농도를 전문 측정 장비로 정밀 분석하고, 오염원의 위치와 방출 패턴을 진단합니다.",
        icon: Search,
        color: "bg-blue-500",
    },
    {
        step: "STEP 02",
        title: "차폐 시공 (Sealing)",
        desc: "유해물질 방출이 심한 자재 표면에 전문 차폐제를 도포하여 유해가스의 실내 유입을 물리적으로 차단합니다.",
        icon: Layers,
        color: "bg-emerald-500",
    },
    {
        step: "STEP 03",
        title: "중화 및 촉매 분해",
        desc: "단백질 수용체 분해 공법 및 광촉매 기술을 적용하여 폼알데하이드·VOCs를 무해한 물질(물, 이산화탄소)로 분해합니다.",
        icon: Atom,
        color: "bg-purple-500",
    },
    {
        step: "STEP 04",
        title: "오존 산화 및 정화",
        desc: "고농도 오존을 투입하여 공기 중 잔여 유해물질을 산화 분해하고, 환기를 통해 안전한 공기질 상태를 최종 확인합니다.",
        icon: Wind,
        color: "bg-amber-500",
    },
];

const whyBonyeon = [
    {
        icon: ShieldCheck,
        title: "타협 없는 정석 시공",
        desc: "간편 스프레이식 처리가 아닌, 차폐-중화-산화-환기의 복합 공정을 정석대로 수행합니다. 시간이 더 걸리더라도 근본적인 해결을 추구합니다.",
        color: "bg-blue-500",
    },
    {
        icon: Leaf,
        title: "안전한 약제",
        desc: "영유아, 반려동물, 임산부가 있는 가정에서도 안심할 수 있는 무독성 친환경 인증 약제만을 사용합니다.",
        color: "bg-green-500",
    },
    {
        icon: FileText,
        title: "데이터 기반 리포트",
        desc: "시공 전·후 유해물질 농도 측정 데이터를 비교 리포트로 제공하여 개선 효과를 수치로 확인하실 수 있습니다.",
        color: "bg-purple-500",
    },
    {
        icon: Settings,
        title: "맞춤형 케어",
        desc: "공간의 크기, 자재 종류, 거주자 구성(영유아·임산부·반려동물)에 따라 약제와 공정을 최적화하여 적용합니다.",
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

export function NewHouseSyndromeDetail() {
    const navigate = useNavigate();

    return (
        <div className="bg-white">
            {/* Hero Banner */}
            <section className="relative bg-[#1e2b4f] text-white overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: "url('./assets/services/new_house_hero_bg.jpg')" }}
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
                            새집증후군 케어 서비스
                        </h1>
                        <p className="text-lg sm:text-xl text-white/80 max-w-2xl leading-relaxed">
                            "우리 아이와 반려동물이 마음껏 숨 쉬는 공간, 본연이 만듭니다"
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

            {/* 01. 새집증후군이란 */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="01"
                            title="새집증후군이란"
                            subtitle="새로운 공간이 내뿜는 보이지 않는 유해물질, 그 실체를 알아야 합니다."
                        />
                        <div className="grid sm:grid-cols-2 gap-4">
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="bg-gray-50 rounded-xl p-6"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-rose-500 rounded-lg flex items-center justify-center">
                                        <AlertTriangle className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="font-bold text-gray-900">폼알데하이드 (HCHO)</h3>
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    합판, 가구, 벽지 접착제, 바닥재 등에서 방출되는 무색의 자극성 기체입니다.
                                    WHO 지정 1군 발암물질로, 눈·코·목의 자극, 두통, 호흡곤란을 유발하며
                                    장기 노출 시 심각한 건강 문제를 초래할 수 있습니다.
                                </p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.1 }}
                                className="bg-gray-50 rounded-xl p-6"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                                        <Beaker className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="font-bold text-gray-900">VOCs (휘발성 유기화합물)</h3>
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    페인트, 접착제, 실런트, 새 가구에서 방출되는 톨루엔, 자일렌, 벤젠 등의 화학물질입니다.
                                    실내 공기질을 크게 저하시키며, 두통, 어지러움, 알레르기 반응을 일으키고
                                    면역력이 약한 영유아와 노약자에게 특히 위험합니다.
                                </p>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 02. 왜 위험한가 */}
            <section className="py-16 px-4 sm:px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="02"
                            title="왜 위험한가"
                            subtitle="새집증후군 유해물질은 단순 불편함을 넘어 심각한 건강 위험을 초래합니다."
                        />
                        <div className="grid sm:grid-cols-3 gap-6">
                            {dangerPoints.map((item, i) => (
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

            {/* 03. 본연만의 차별화 솔루션 */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="03"
                            title="본연만의 차별화 솔루션"
                            subtitle="단백질 수용체 분해 공법으로 유해물질의 근본 원인을 제거합니다."
                        />

                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 sm:p-8 border border-blue-100 mb-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                                    <Atom className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-blue-600 tracking-wider">KEY POINT</p>
                                    <h3 className="text-xl font-bold text-gray-900">단백질 수용체 분해 공법</h3>
                                </div>
                            </div>
                            <p className="text-gray-700 leading-relaxed mb-4">
                                일반적인 새집증후군 시공이 표면 코팅이나 임시 흡착에 그치는 반면,
                                본연의 단백질 수용체 분해 공법은 유해물질이 방출되는 자재 내부의 화학적 결합 구조 자체를 분해합니다.
                            </p>
                            <ul className="space-y-2">
                                <li className="text-sm text-gray-600 flex items-start gap-2">
                                    <span className="text-blue-500 mt-0.5 flex-shrink-0 font-bold">&#10003;</span>
                                    폼알데하이드의 방출 원인인 수지(樹脂) 결합을 촉매 반응으로 분해하여 재방출을 원천 차단
                                </li>
                                <li className="text-sm text-gray-600 flex items-start gap-2">
                                    <span className="text-blue-500 mt-0.5 flex-shrink-0 font-bold">&#10003;</span>
                                    VOCs 분자를 무해한 물(H2O)과 이산화탄소(CO2)로 전환하는 친환경 분해 메커니즘
                                </li>
                                <li className="text-sm text-gray-600 flex items-start gap-2">
                                    <span className="text-blue-500 mt-0.5 flex-shrink-0 font-bold">&#10003;</span>
                                    일시적 마스킹이 아닌, 시간이 지나도 재발하지 않는 근본적 해결
                                </li>
                            </ul>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 04. 전문 4단계 복합 공정 */}
            <section className="py-16 px-4 sm:px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="04"
                            title="전문 4단계 복합 공정"
                            subtitle="측정부터 정화까지, 체계적인 복합 공정으로 안전한 공간을 만듭니다."
                        />
                        <div className="space-y-4">
                            {processSteps.map((step, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -15 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.15 }}
                                    className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`w-14 h-14 ${step.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                            <step.icon className="w-7 h-7 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 mb-1">{step.step}</p>
                                            <h4 className="font-bold text-gray-900 mb-1">{step.title}</h4>
                                            <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 05. 왜 본연이어야 하는가 */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="05"
                            title="왜 본연이어야 하는가"
                            subtitle="새집증후군 케어, 본연이 다른 이유를 확인하세요."
                        />
                        <div className="grid sm:grid-cols-2 gap-4">
                            {whyBonyeon.map((item, i) => (
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

            {/* 06. 본연의 약속 */}
            <section className="py-16 px-4 sm:px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="06"
                            title="본연의 약속"
                            subtitle="건강한 공간을 향한 본연의 변함없는 다짐입니다."
                        />
                        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                    <Users className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">가족의 숨결을 지키는 공간</h3>
                            </div>
                            <p className="text-gray-600 leading-relaxed mb-4">
                                새 집의 설렘이 건강의 걱정으로 바뀌어서는 안 됩니다.
                                본연은 우리 아이, 반려동물, 그리고 가족 모두가 깊은 숨을 들이쉴 수 있는 공간을 만들기 위해
                                한 치의 타협도 없는 정석 시공을 약속합니다.
                            </p>
                            <p className="text-gray-600 leading-relaxed">
                                시공 전후 측정 데이터로 증명하고, 안전한 약제로 시공하며,
                                입주 후에도 안심할 수 있는 사후 관리까지 -- 본연이 공간 본연의 가치를 되찾아 드리겠습니다.
                            </p>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-16 px-4 sm:px-6 bg-[#1e2b4f] text-white text-center">
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                        새 공간의 첫 호흡, 본연이 책임지겠습니다
                    </h2>
                    <p className="text-white/70 mb-8">
                        전문 상담을 통해 새집증후군 케어 솔루션을 제안해 드립니다.
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
