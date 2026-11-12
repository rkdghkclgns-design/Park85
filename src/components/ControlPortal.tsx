import { useLocation } from "react-router-dom";

export const controlPortalPath = "/service/charger/charger-cleaning";
const embeddedRoute = /^control-detail\/(?:site|worker|report|mail)\/[a-zA-Z0-9%_.+@-]+(?:\?month=\d{4}-\d{2})?$/;

export const controlLoginUrl = "#" + controlPortalPath;

export function ControlPortal() {
    const { search } = useLocation();
    const requestedView = new URLSearchParams(search).get("view") ?? "";
    const view = embeddedRoute.test(requestedView) ? requestedView : "control";


    return (
        <iframe
            allow="camera 'self'"
            className="block h-dvh w-full border-0"
            referrerPolicy="no-referrer"
            src={"/control-app/#" + view}
            title="본연 청소관제"
        />
    );
}
