import { useEffect, useState } from "react";
import {
    buildStyles,
    CircularProgressbarWithChildren
} from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

export default function Confirmed() {
    const [percentage, setPercentage] = useState(0);
    const [text, setText] = useState("🎵");

    useEffect(() => {
        const t1 = setTimeout(() => setPercentage(100), 100);
        const t2 = setTimeout(() => setText("✅"), 600);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, []);

    return (
        <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ height: "20rem", width: "20rem" }}>
                <CircularProgressbarWithChildren
                    value={percentage}
                    styles={buildStyles({
                        pathColor: "#00AB00"
                    })}
                >
                    <div style={{ textAlign: "center", fontSize: 20 }}>
                        <p style={{ fontSize: 20 }}>Thankyou for your order!</p>
                        <p style={{ fontSize: 40 }}>{text}</p>
                    </div>
                </CircularProgressbarWithChildren>
            </div>
        </div>
    );
}
