import React, { useEffect, useState } from 'react';
import styles from './lesson-09.module.scss';
import type { ColorName } from '../../../globals/colors';
import { Box } from '../../common/box/box';
import { ConfettiFx } from '../../fx/confetti-fx/confetti-fx';
import { Task09 as Task } from '../../tasks/09/task-09';

const boxes: ColorName[] = [
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'charcoalBlack',
    'charcoalBlack',
    'charcoalBlack',
    'turquoiseGreen',
    'charcoalBlack',
    'charcoalBlack',
    'charcoalBlack',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'charcoalBlack',
    'pastelPink',
    'pastelPink',
    'pastelPink',
    'charcoalBlack',
    'pastelPink',
    'pastelPink',
    'pastelPink',
    'charcoalBlack',
    'turquoiseGreen',
    'turquoiseGreen',
    'charcoalBlack',
    'pastelPink',
    'snowWhite',
    'pastelPink',
    'pastelPink',
    'pastelPink',
    'pastelPink',
    'pastelPink',
    'charcoalBlack',
    'turquoiseGreen',
    'turquoiseGreen',
    'charcoalBlack',
    'pastelPink',
    'pastelPink',
    'pastelPink',
    'pastelPink',
    'pastelPink',
    'pastelPink',
    'pastelPink',
    'charcoalBlack',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'charcoalBlack',
    'pastelPink',
    'pastelPink',
    'pastelPink',
    'pastelPink',
    'pastelPink',
    'charcoalBlack',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'charcoalBlack',
    'pastelPink',
    'pastelPink',
    'pastelPink',
    'charcoalBlack',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'charcoalBlack',
    'pastelPink',
    'charcoalBlack',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'charcoalBlack',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
    'turquoiseGreen',
];

export const Lesson09: React.FC = () => {
    const [lessonSolved, setLessonSolved] = useState(false);

    useEffect(() => {
        setLessonSolved(isSolved());
    }, []);

    return (
        <div className={styles.root}>
            <Task />
            <div className={styles.playground}>
                <div className={styles.grid} id="grid">
                    {boxes.map((color, idx) => (
                        <Box
                            key={idx}
                            color={color}
                            {...(color === 'snowWhite'
                                ? { className: styles.glow, id: 'glow' }
                                : '')}
                        />
                    ))}
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
    const pos = '445445';
    const grid = getComputed('grid');
    const isGrid = grid.getPropertyValue('display') === 'grid';
    const gridCols = grid
        .getPropertyValue('grid-template-columns')
        .split(' ').length;
    const gridRows = grid
        .getPropertyValue('grid-template-rows')
        .split(' ').length;

    const glow = getComputed('glow');
    const glowColPos =
        glow.getPropertyValue('grid-column-start') +
        glow.getPropertyValue('grid-column-end');
    const glowRowPos =
        glow.getPropertyValue('grid-row-start') +
        glow.getPropertyValue('grid-row-end');

    return (
        isGrid &&
        gridCols == 11 &&
        gridRows == 10 &&
        pos.indexOf(glowColPos) > -1 &&
        pos.indexOf(glowRowPos) > -1
    );
}

function getComputed(elem: string) {
    return getComputedStyle(document.getElementById(elem)!);
}
