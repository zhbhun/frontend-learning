import React, { useEffect, useState } from 'react';
import styles from './lesson-06.module.scss';
import vars from '../../../globals/variables.module.scss';
import { ConfettiFx } from '../../fx/confetti-fx/confetti-fx';
import { Task06 as Task } from '../../tasks/06/task-06';

export const Lesson06: React.FC = () => {
    const [lessonSolved, setLessonSolved] = useState(false);

    useEffect(() => {
        setLessonSolved(isSolved());
    }, []);

    return (
        <div className={styles.root}>
            <Task />
            <div className={`${styles.playground}`} id="playground">
                <div className={styles.quote}>
                    “Creativity is <span>nothing but a mind set</span> free.”
                </div>
                <div className={styles.author}>Torrie T. Asai</div>
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
    const elem = document.getElementById('playground');
    const stageBgColor = rgba2hex(
        getComputedStyle(elem!).getPropertyValue('background-color')
    ).toUpperCase();
    const desiredColor = vars.charcoalBlack!.toUpperCase();
    return stageBgColor === desiredColor;
}

function rgba2hex(color: string) {
    const rgb = color
        .replace(/,\s+/g, ',')
        .match(/^rgba?\(([.\d]+)[, ]+([.\d]+)[, ]+([.\d]+)[, ]?([.\d]+)?\)$/i);
    let hex =
        (parseInt(rgb![1]!, 10) | (1 << 8)).toString(16).slice(1) +
        (parseInt(rgb![2]!, 10) | (1 << 8)).toString(16).slice(1) +
        (parseInt(rgb![3]!, 10) | (1 << 8)).toString(16).slice(1);
    if (rgb![4]) {
        if (rgb![4].startsWith('.')) {
            rgb![4] = '0' + rgb![4];
        }
        hex += ((parseInt(rgb![4], 10) * 255) | (1 << 8)).toString(16).slice(1);
    }
    return '#' + hex;
}
