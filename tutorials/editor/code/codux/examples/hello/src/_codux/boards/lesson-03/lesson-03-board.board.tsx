import React from 'react';
import { createBoard } from '@wixc3/react-board';
import { Lesson03 } from '../../../components/lessons/03/lesson-03';

export default createBoard({
    name: '03 Add Elements',
    Board: () => <Lesson03 />,
    environmentProps: {
        windowWidth: 840,
        windowHeight: 630,
    },
});
