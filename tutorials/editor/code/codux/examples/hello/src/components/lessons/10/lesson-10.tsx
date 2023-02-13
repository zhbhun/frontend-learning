import type React from 'react';
import styles from './lesson-10.module.scss';
import { ReactComponent as Cloud } from '../../../assets/cloud.svg';
import { Task10 as Task } from '../../tasks/10/task-10';

export const Lesson10: React.FC = () => {
    return (
        <div className={styles.root}>
            <Task />
            <div className={styles.playground}>
                <div className={styles.arcs} />
                <Cloud className={styles.cloud} />
            </div>
        </div>
    );
};
