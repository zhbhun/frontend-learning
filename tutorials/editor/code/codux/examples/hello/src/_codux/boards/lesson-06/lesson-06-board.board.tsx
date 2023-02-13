import React from 'react';
import { createBoard } from '@wixc3/react-board';
import { Lesson06 } from '../../../components/lessons/06/lesson-06';

export default createBoard({
    name: '06 Create Class',
    Board: () => <Lesson06 />,
    environmentProps: {
        windowWidth: 840,
        windowHeight: 630,
    },
});
