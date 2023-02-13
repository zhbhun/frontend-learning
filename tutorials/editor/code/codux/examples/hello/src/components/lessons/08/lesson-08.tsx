import React, { useEffect, useState } from 'react';
import styles from './lesson-08.module.scss';
import { Box } from '../../common/box/box';
import { ConfettiFx } from '../../fx/confetti-fx/confetti-fx';
import { Task08 as Task } from '../../tasks/08/task-08';

export const Lesson08: React.FC = () => {
    const [lessonSolved, setLessonSolved] = useState(false);

    useEffect(() => {
        setLessonSolved(isSolved());
    }, []);

    return (
        <div className={styles.root}>
            <Task />
            <div className={styles.playground}>
                <div
                    className={`${styles.section} ${styles.circles}`}
                    id="circles"
                >
                    <Box color="darkLavender" className={styles.circle} />
                    <Box color="hotPink" className={styles.circle} />
                    <Box color="danaPink" className={styles.circle} />
                </div>
                <div className={`${styles.section} ${styles.tags}`}>
                    <Box
                        align="left"
                        iconColor="charcoalBlack"
                        icon="circle"
                        color="darkLavender"
                        className={styles.tag}
                    />
                    <Box
                        align="left"
                        iconColor="charcoalBlack"
                        icon="circle"
                        color="hotPink"
                        className={styles.tag}
                    />
                    <Box
                        align="left"
                        iconColor="charcoalBlack"
                        icon="circle"
                        color="danaPink"
                        className={styles.tag}
                    />
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
    const elem = getComputed('circles');
    const isflex = elem.getPropertyValue('display') === 'flex';
    const isSolvedDirection =
        elem.getPropertyValue('flex-direction') === 'column';
    const isSolvedJustify =
        elem.getPropertyValue('justify-content') === 'flex-end' || elem.getPropertyValue('justify-content') === 'end';
    const isSolvedGap = getNumValue(elem.getPropertyValue('gap')) === 26;
    return isflex && isSolvedDirection && isSolvedJustify && isSolvedGap;
}

function getComputed(id: string) {
    return getComputedStyle(document.getElementById(id)!);
}

function getNumValue(cssValue: string): number {
    return Number(cssValue.replace(/px$/, ''));
}
