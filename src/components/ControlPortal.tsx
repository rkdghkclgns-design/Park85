import { Link, useLocation } from "react-router-dom";

export const controlPortalPath = "/service/charger/charger-cleaning";
const standaloneControlUrl = "https://cleanreport-demo.smart433699.chatgpt.site/#control";
const embeddedRoute = /^control-detail\/(?:site|worker|report|mail)\/[a-zA-Z0-9%_.+@-]+(?:\?month=\d{4}-\d{2})?$/;
const integrated = () => Boolean(document.querySelector('meta[name="bonyeon-control"]'));

export function controlLoginUrl() {
    return integrated() ? "#" + controlPortalPath : standaloneControlUrl;
}

export function ControlPortal() {
    const { search } = useLocation();
    const requestedView = new URLSearchParams(search).get("view") ?? "";
    const view = embeddedRoute.test(requestedView) ? requestedView : "control";

    if (!integrated()) {
        return (
            <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 p-6">
                <h1 className="text-2xl font-semibold text-[#1e2b4f]">본연 청소관제</h1>
                <a className="rounded-lg bg-[#1e2b4f] px-4 py-3 text-center text-white" href={standaloneControlUrl}>
                    로그인
                </a>
                <Link className="text-[#1e2b4f] underline" to="/">본연 홈페이지</Link>
            </main>
        );
    }

    return (
        <iframe
            allow="camera 'self'"
            className="block h-dvh w-full border-0"
            referrerPolicy="no-referrer"
            src={"/control-app#" + view}
            title="본연 청소관제"
        />
    );
}
