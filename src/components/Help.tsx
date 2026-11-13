import { Link } from "react-router-dom";
import { controlPortalPath } from "./ControlPortal";

export function Help() {
    return <main className="mx-auto max-w-4xl px-5 pb-20 pt-32 text-slate-800">
        <h1 className="mb-8 text-3xl font-bold">본연 이용 안내</h1>
        <section id="help-faq" className="mb-12 scroll-mt-28 space-y-4">
            <h2 className="text-2xl font-bold">자주 묻는 질문</h2>
            <details className="rounded-xl border p-5" open><summary className="cursor-pointer font-semibold">청소 상담은 어떻게 신청하나요?</summary>
                <p className="mt-3">홈페이지의 간편상담에서 서비스와 연락처를 입력하거나 <a className="text-blue-700 underline" href="tel:01027401734">010-2740-1734</a>로 문의해 주세요.</p></details>
            <details className="rounded-xl border p-5"><summary className="cursor-pointer font-semibold">청소관제는 누구나 볼 수 있나요?</summary>
                <p className="mt-3">본연에 로그인하고 관리자에게 이용 권한을 승인받아야 합니다. 작업자는 본인의 배정 현장과 작업·지급 내역을 확인합니다.</p></details>
            <details className="rounded-xl border p-5"><summary className="cursor-pointer font-semibold">작업자 가입은 어떻게 하나요?</summary>
                <p className="mt-3">로그인 화면에서 회원가입을 선택해 초대를 요청합니다. 관리자가 전달한 로그인 키로 로그인한 뒤 가입 신청을 완료해 주세요. 사업자는 사업자등록증·통장사본·계산서 수신 이메일을 준비해 주세요.</p></details>
        </section>
        <section id="help-guide" className="scroll-mt-28 space-y-4">
            <h2 className="text-2xl font-bold">작업자 이용 가이드</h2>
            <ol className="list-decimal space-y-3 pl-6">
                <li>내 작업에서 배정과 오늘 할 일을 확인하고 현장을 선택합니다.</li>
                <li>현장 청소 안내를 확인하고 충전기별 안전 점검을 진행합니다.</li>
                <li>구역을 선택한 뒤 작업 전·후 사진을 촬영하고 외함·내함·주변·고장확인 결과를 저장합니다. 내부 청소는 해당 현장의 작업 범위에 따라 선택합니다.</li>
                <li>저장된 증빙 수량에 따라 부분 완료 또는 전체 완료를 등록합니다. 완료 보고는 관리자 승인 후 처리됩니다.</li>
                <li>사진 전송 상태를 확인해 주세요. 인터넷이 끊기면 촬영본을 기기에 보관하며 관제 화면에서 다시 연결되면 자동 전송합니다. 전송이 끝나기 전 브라우저 데이터나 저장 공간을 삭제하지 마세요.</li>
            </ol>
            <p>신청·배정·청소 결과에 관한 문의는 <a className="text-blue-700 underline" href="mailto:bonyeon.cs@gmail.com">bonyeon.cs@gmail.com</a>으로 보내 주세요.</p>
            <Link className="inline-block rounded-lg bg-blue-700 px-5 py-3 text-white" to={controlPortalPath}>청소관제 로그인</Link>
        </section>
    </main>;
}
