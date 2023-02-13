import React from 'react';
import { createBoard } from '@wixc3/react-board';
import { Lesson09 } from '../../../components/lessons/09/lesson-09';

export default createBoard({
    name: '09 Grid Layout',
    Board: () => <Lesson09 />,
    environmentProps: {
        windowWidth: 840,
        windowHeight: 630,
    },
});
