import React from 'react';
import { createBoard } from '@wixc3/react-board';
import { Lesson04 } from '../../../components/lessons/04/lesson-04';

export default createBoard({
    name: '04 Computed Styles',
    Board: () => <Lesson04 />,
    environmentProps: {
        windowWidth: 840,
        windowHeight: 630,
    },
});
