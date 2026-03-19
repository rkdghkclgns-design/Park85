import { useParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, Construction } from "lucide-react";
import { Button } from "./ui/button";
import { serviceCategories } from "../data/services";

export function ServiceDetail() {
    const { categoryId, serviceId } = useParams<{ categoryId: string; serviceId: string }>();
    const navigate = useNavigate();

    // Find category and sub-service
    const category = serviceCategories.find(c => c.id === categoryId);
    const subService = category?.subServices.find(s => s.id === serviceId);

    const serviceName = subService?.name ?? "알 수 없는 서비스";
    const categoryName = category?.name ?? "";

    return (
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-20">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center max-w-md mx-auto"
            >
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-50 flex items-center justify-center">
                    <Construction className="w-10 h-10 text-blue-500" />
                </div>

                {categoryName && (
                    <p className="text-sm text-blue-600 font-medium mb-2">
                        {categoryName}
                    </p>
                )}

                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    {serviceName}
                </h1>

                <div className="bg-gray-50 rounded-2xl p-8 mb-8">
                    <p className="text-lg text-gray-600 leading-relaxed">
                        해당 서비스 페이지는 현재
                        <span className="text-[#1e2b4f] font-bold"> 준비중</span>입니다.
                    </p>
                    <p className="text-sm text-gray-400 mt-3">
                        빠른 시일 내에 상세 내용을 제공해 드리겠습니다.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                        onClick={() => navigate("/")}
                        variant="outline"
                        className="flex items-center gap-2 px-6 py-3 rounded-lg"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        메인으로 돌아가기
                    </Button>
                    <a
                        href="tel:01027401734"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#1e2b4f] text-white rounded-lg font-medium hover:bg-[#151f3a] transition-colors"
                    >
                        전화 상담하기
                    </a>
                </div>
            </motion.div>
        </div>
    );
}
