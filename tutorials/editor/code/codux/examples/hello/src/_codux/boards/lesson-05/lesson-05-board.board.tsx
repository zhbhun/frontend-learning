import React from 'react';
import { createBoard } from '@wixc3/react-board';
import { Lesson05 } from '../../../components/lessons/05/lesson-05';

export default createBoard({
    name: '05 Styles Panel',
    Board: () => <Lesson05 />,
    environmentProps: {
        windowWidth: 840,
        windowHeight: 630,
    },
});
