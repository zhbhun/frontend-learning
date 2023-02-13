import React, { useEffect, useState } from 'react';
import styles from './lesson-07.module.scss';
import { Box } from '../../common/box/box';
import { ConfettiFx } from '../../fx/confetti-fx/confetti-fx';
import { Task07 as Task } from '../../tasks/07/task-07';

// lesson solutions
// unsolved: right, right, up, down, right, left, right
const solutionDirections = [
    ['right', 'down', 'down', 'left', 'left', 'right', 'right'].join(''),
    ['left', 'left', 'right', 'right', 'up', 'up', 'left'].join(''),
    ['down', 'left', 'up', 'down', 'up', 'up', 'left'].join(''),
    ['right', 'down', 'down', 'up', 'down', 'right', 'up'].join(''),
];
const solutionRoutes = [
    [0, 1, 4, 3, 2, 5, 6],
    [6, 5, 2, 3, 4, 1, 0],
    [4, 1, 0, 3, 6, 5, 2],
    [2, 5, 6, 3, 0, 1, 4],
];

export const Lesson07: React.FC = () => {
    // arrow animation vars
    const [arrowAnimSeq, setArrowAnimSeq] = useState([
        false,
        false,
        false,
        false,
        false,
        false,
        false,
    ]);
    const [solutionStatus, setSolutionStatus] = useState({
        solved: false,
        solutionIndex: -1,
    });
    const [arrowAnimIdx, setArrowAnimIdx] = useState(0);

    useEffect(() => {
        const solutionStatus = getSolutionStatus();
        if (solutionStatus.solved) {
            setSolutionStatus(solutionStatus);
        }
    }, []);

    // animate arrows
    useEffect(() => {
        let animInterval: NodeJS.Timer;

        if (solutionStatus.solved) {
            animInterval = setInterval(() => {
                const nextBlink = [...arrowAnimSeq];
                if (arrowAnimIdx === arrowAnimSeq.length) {
                    nextBlink.fill(false);
                    setArrowAnimSeq(nextBlink);
                    setArrowAnimIdx(0);
                } else {
                    nextBlink[
                        solutionRoutes[solutionStatus.solutionIndex]![
                            arrowAnimIdx
                        ]!
                    ] = true;
                    setArrowAnimSeq(nextBlink);
                    setArrowAnimIdx(arrowAnimIdx + 1);
                }
            }, 405);
        }
        // clear interval
        return () => clearInterval(animInterval);
    });

    const getColor = (idx: number) => {
        return solutionStatus.solved
            ? arrowAnimSeq[idx]
                ? 'pastelPink'
                : 'white'
            : 'white';
    };

    return (
        <div className={styles.root}>
            <Task />
            <div className={styles.playground}>
                <Box
                    outlined
                    color="pastelPink"
                    icon="heartOutline"
                    className={styles.icon}
                />
                <Box
                    outlined
                    color={getColor(0)}
                    icon="arrow"
                    className={styles.icon}
                    iconDirection="right"
                />
                <Box
                    outlined
                    color={getColor(1)}
                    icon="arrow"
                    className={styles.icon}
                    iconDirection="right"
                />
                <Box
                    outlined
                    color={getColor(2)}
                    icon="arrow"
                    className={styles.icon}
                    iconDirection="up"
                />
                <Box
                    outlined
                    color={getColor(3)}
                    icon="arrow"
                    className={styles.icon}
                    iconDirection="down"
                />
                <Box
                    outlined
                    color={getColor(4)}
                    icon="arrow"
                    className={styles.icon}
                    iconDirection="right"
                />
                <Box
                    outlined
                    color={getColor(5)}
                    icon="arrow"
                    className={styles.icon}
                    iconDirection="left"
                />
                <Box
                    outlined
                    color={getColor(6)}
                    icon="arrow"
                    className={styles.icon}
                    iconDirection="right"
                />
                <Box
                    outlined
                    color="pastelPink"
                    icon="heart"
                    className={styles.icon}
                />
                <ConfettiFx
                    maxParticles={200}
                    show={solutionStatus.solved}
                    style={{
                        display: solutionStatus.solved ? 'block' : 'none',
                    }}
                />
            </div>
        </div>
    );
};

function getSolutionStatus() {
    const onStageDirections = Array.from(
        document.querySelectorAll('[data-direction]'),
        (icon) => icon.getAttribute('data-direction')
    ).join('');

    const resolution: { solved: boolean; solutionIndex: number } = {
        solved: false,
        solutionIndex: -1,
    };

    for (const [index, direction] of Object.entries(solutionDirections)) {
        if (direction === onStageDirections) {
            resolution.solved = true;
            resolution.solutionIndex = Number(index);
            break;
        }
    }

    return resolution;
}
