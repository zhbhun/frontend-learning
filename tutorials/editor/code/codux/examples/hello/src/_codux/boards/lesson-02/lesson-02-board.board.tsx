import React from 'react';
import { createBoard } from '@wixc3/react-board';
import { Lesson02 } from '../../../components/lessons/02/lesson-02';

export default createBoard({
    name: '02 Elements Panel',
    Board: () => <Lesson02 />,
    environmentProps: {
        windowWidth: 840,
        windowHeight: 630,
    },
});
