import React from 'react';
import { createBoard } from '@wixc3/react-board';
import { Lesson10 } from '../../../components/lessons/10/lesson-10';

export default createBoard({
    name: '10 Work with Git',
    Board: () => <Lesson10 />,
    environmentProps: {
        windowWidth: 840,
        windowHeight: 630,
    },
});
