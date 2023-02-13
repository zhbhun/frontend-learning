import React from 'react';
import { createBoard } from '@wixc3/react-board';
import { Pupil } from '../../../components/lessons/pupil/pupil';

export default createBoard({
    name: 'pupil',
    Board: () => <Pupil />,
});
