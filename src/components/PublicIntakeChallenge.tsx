import { useEffect, useRef, useState } from "react";

interface ChallengeOptions {
    sitekey: string;
    size: 'normal' | 'compact';
    action: string;
    callback: (token: string) => void;
    "expired-callback": () => void;
    "error-callback": () => void;
}

interface ChallengeService {
    render: (container: HTMLElement, options: ChallengeOptions) => string;
    remove: (id: string) => void;
}

declare global {
    interface Window {
        turnstile?: ChallengeService;
    }
}

const settingsUrl = "https://bonyeon-control.cleaning-autopost-slack-relay.workers.dev/api/public-intake/settings";
let scriptPromise: Promise<ChallengeService> | undefined;

function loadChallenge() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    scriptPromise ??= new Promise<ChallengeService>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.onload = () => window.turnstile
            ? resolve(window.turnstile)
            : reject(new Error("보안 확인을 불러오지 못했습니다."));
        script.onerror = () => {
            script.remove();
            scriptPromise = undefined;
            reject(new Error("보안 확인에 연결하지 못했습니다."));
        };
        document.head.append(script);
    });
    return scriptPromise;
}

export function PublicIntakeChallenge({ onToken }: { onToken: (token: string) => void }) {
    const container = useRef<HTMLDivElement>(null);
    const [message, setMessage] = useState("보안 확인을 준비하고 있습니다.");
    useEffect(() => {
        const controller = new AbortController();
        let service: ChallengeService | undefined;
        let widget: string | undefined;
        onToken("");
        async function mount() {
            try {
                const response = await fetch(settingsUrl, { signal: controller.signal, cache: "no-store" });
                const settings = await response.json();
                if (!response.ok || !settings.configured || !settings.siteKey) {
                    throw new Error("온라인 접수에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
                }
                service = await loadChallenge();
                if (controller.signal.aborted || !container.current) return;
                widget = service.render(container.current, {
                    sitekey: settings.siteKey,
                    action: "consultation",
                    size: window.matchMedia("(max-width: 360px)").matches ? "compact" : "normal",
                    callback: token => {
                        onToken(token);
                        setMessage("보안 확인을 마쳤습니다.");
                    },
                    "expired-callback": () => {
                        onToken("");
                        setMessage("보안 확인이 만료됐습니다. 다시 확인해 주세요.");
                    },
                    "error-callback": () => {
                        onToken("");
                        setMessage("보안 확인을 완료하지 못했습니다. 연결을 확인해 주세요.");
                    },
                });
            } catch (error) {
                if (!controller.signal.aborted) {
                    setMessage(error instanceof Error ? error.message : "보안 확인을 불러오지 못했습니다.");
                }
            }
        }
        void mount();
        return () => {
            controller.abort();
            if (widget !== undefined) service?.remove(widget);
        };
    }, [onToken]);
    return <div className="space-y-2"><div ref={container} /><p className="text-sm text-slate-600" role="status">{message}</p></div>;
}
