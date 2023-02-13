import { useEffect, useRef } from 'react';
import styles from './cursor-fx.module.scss';

function lerp(start: number, stop: number, amount: number) {
    return (1 - amount) * start + amount * stop;
}

function renderCircles(count: number) {
    const circles = [];
    for (let i = 0; i < count; i++) {
        const scale = lerp(30, 1, (i / (count - 1)) ** 1.3);
        const transitionDuration = i * 50 + 'ms';
        const transform = `translate(var(--x), var(--y)) scale(${scale})`;
        const style = { transitionDuration, transform };
        circles.push(<div key={i} style={style} />);
    }
    return circles;
}

const circles = renderCircles(12);

export function CursorFx() {
    const root = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            root.current?.style.setProperty('--x', e.clientX + 'px');
            root.current?.style.setProperty('--y', e.clientY + 'px');
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div
            ref={root}
            className={`${styles.root} ${styles.cursor}`}
            children={circles}
        />
    );
}
