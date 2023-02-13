import type React from 'react';
import styles from './task-symbol.module.scss';
import type { SymbolName } from './symbols';
import { symbols } from './symbols';

export interface TaskSymbolProps {
    name?: SymbolName;
}

export const TaskSymbol: React.FC<TaskSymbolProps> = ({ name = 'empty' }) => {
    const Symbol = symbols[name];
    return (
        <span>
            <Symbol className={styles[name]} />
        </span>
    );
};
