import type React from 'react';
import styles from './task-01.module.scss';
import { TaskSymbol } from '../../common/task-symbol/task-symbol';

export const Task01: React.FC = () => {
    return (
        <div className={styles.task}>
            <div className={styles.progress}>
                <b>01</b> / 10
            </div>
            <div className={styles.title}>Let's Start!</div>
            <ol start={0} className={styles.desc}>
                <li>
                    In this tutorial, you'll learn how you can view and visually
                    edit <b>React</b> components using
                    <b>&nbsp;Codux</b>.
                </li>
                <li>
                    Switch to <TaskSymbol name="preview" /> <b>Preview Mode</b>
                    &nbsp;and hover over the shapes to erase them. Can you see
                    what’s behind?
                </li>
                <li>
                    If you need more space in your screen, click&nbsp;
                    <TaskSymbol name="hamburger" /> to hide the left sidebar.
                </li>
                <li>
                    To reload and bring back the shapes, just click&nbsp;
                    <TaskSymbol name="reload" /> <b>Reload Preview</b>.
                </li>
                <li>
                    When ready, find your next lessons in the
                    <b>&nbsp;Components list</b> on the left sidebar.
                </li>
            </ol>
        </div>
    );
};
