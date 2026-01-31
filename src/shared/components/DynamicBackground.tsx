import { useEffect, useState } from "react";

type TimePhase = "dawn" | "day" | "dusk" | "night";

export const DynamicBackground = () => {
    const [phase, setPhase] = useState<TimePhase>("day");

    useEffect(() => {
        const updatePhase = () => {
            const hour = new Date().getHours();

            let newPhase: TimePhase = "night";
            if (hour >= 5 && hour < 8) {
                newPhase = "dawn";
            } else if (hour >= 8 && hour < 17) {
                newPhase = "day";
            } else if (hour >= 17 && hour < 20) {
                newPhase = "dusk";
            } else {
                newPhase = "night";
            }

            setPhase(newPhase);
        };

        // Initial check
        updatePhase();

        // Check every minute
        const interval = setInterval(updatePhase, 60000);
        return () => clearInterval(interval);
    }, []);

    const getGradient = (p: TimePhase) => {
        switch (p) {
            case "dawn": return "var(--gradient-dawn)";
            case "day": return "var(--gradient-day)";
            case "dusk": return "var(--gradient-dusk)";
            case "night": return "var(--gradient-night)";
            default: return "var(--gradient-day)";
        }
    };

    return (
        <div
            className={`fixed inset-0 -z-10 bg-transition pointer-events-none gradient-bg theme-${phase}`}
            aria-hidden="true"
        />
    );
};
