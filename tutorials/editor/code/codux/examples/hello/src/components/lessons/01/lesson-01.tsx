import React, { useState } from 'react';
import styles from './lesson-01.module.scss';
import type { ColorName } from '../../../globals/colors';
import { Box } from '../../common/box/box';
import { CursorFx } from '../../fx/cursor-fx/cursor-fx';
import { ConfettiFx } from '../../fx/confetti-fx/confetti-fx';
import { Task01 as Task } from '../../tasks/01/task-01';

const boxes: ColorName[] = [
    'lavender',
    'turquoiseGreen',
    'dirtyWhite',
    'aeroBlue',
    'hotRed',
    'hotPink',
    'goldYellow',
    'orangeRed',
    'aeroBlue',
    'richGreen',
    'darkLavender',
    'oliveGreen',
    'orangeRed',
    'pastelPink',
    'dirtyWhite',
    'richGreen',
    'oliveGreen',
    'orangeRed',
    'turquoiseGreen',
    'aeroBlue',
    'darkLavender',
    'hotRed',
    'hotPink',
];

export const Lesson01: React.FC = () => {
    // on mouse enter fade-out box
    const [visible, setVisible] = useState<boolean[]>(
        boxes.map(() => {
            return true;
        })
    );

    return (
        <div className={styles.root}>
            <Task />
            <div className={styles.playground}>
                {boxes.map((color, idx) => (
                    <Box
                        key={idx}
                        color={color}
                        className={`${styles.boxes} ${
                            visible[idx] || styles.fadeOut
                        }`}
                        onMouseEnter={() => {
                            const boxesVisibility = [...visible];
                            boxesVisibility[idx] = false;
                            setVisible(boxesVisibility);
                        }}
                    />
                ))}
                <CursorFx />
                <ConfettiFx
                    maxParticles={400}
                    dissolve={315}
                    show={visible.every((value) => value === false)}
                />
            </div>
        </div>
    );
};
