import React from 'react';
import { createBoard } from '@wixc3/react-board';
import { Lesson07 } from '../../../components/lessons/07/lesson-07';

export default createBoard({
    name: '07 Components',
    Board: () => <Lesson07 />,
    environmentProps: {
        windowWidth: 840,
        windowHeight: 630,
    },
});
