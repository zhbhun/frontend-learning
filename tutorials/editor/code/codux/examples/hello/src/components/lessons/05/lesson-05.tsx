import React, { useEffect, useState } from 'react';
import styles from './lesson-05.module.scss';
import { Box } from '../../common/box/box';
import { ConfettiFx } from '../../fx/confetti-fx/confetti-fx';
import { Task05 as Task } from '../../tasks/05/task-05';

export const Lesson05: React.FC = () => {
    const [lessonSolved, setLessonSolved] = useState(false);

    useEffect(() => {
        setTimeout(() => {
            setLessonSolved(isSolved());
        }, 750);
    }, []);

    return (
        <div className={styles.root}>
            <Task />
            <div className={styles.playground}>
                <div className={styles.section}>
                    <div className={styles.row}>
                        <Box
                            text="N"
                            color={'lavender'}
                            className={styles.margin}
                            id="margin"
                        />
                        <Box
                            text="I"
                            color={'lavender'}
                            className={styles.margin}
                        />
                        <Box
                            text="C"
                            color={'lavender'}
                            className={styles.margin}
                        />
                        <Box
                            text="E"
                            color={'lavender'}
                            className={styles.margin}
                        />
                    </div>
                </div>
                <div className={styles.section}>
                    <div className={styles.row} >
                        <Box
                            text="Give me some space"
                            color={'turquoiseGreen'}
                            className={styles.padding}
                            id="padding"
                        />
                    </div>
                </div>
                <ConfettiFx
                    maxParticles={400}
                    dissolve={315}
                    show={lessonSolved}
                    style={{ display: lessonSolved ? 'block' : 'none' }}
                />
            </div>
        </div>
    );
};

function isSolved(): boolean {
    const margin = getNumValue(
        getComputed('margin').getPropertyValue('margin')
    );
    const padding = getNumValue(
        getComputed('padding').getPropertyValue('padding')
    );
    return margin <= 6 && margin >= 0 && padding <= 20 && padding >= 10;
}

function getComputed(id: string) {
    return getComputedStyle(document.getElementById(id)!);
}

function getNumValue(cssValue: string): number {
    return Number(cssValue.replace(/px$/, ''));
}
