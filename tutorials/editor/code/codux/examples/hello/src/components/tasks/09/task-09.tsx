import type React from 'react';
import styles from './task-09.module.scss';
import { TaskSymbol } from '../../common/task-symbol/task-symbol';
import { TaskTag } from '../../common/task-tag/task-tag';

export const Task09: React.FC = () => {
    return (
        <div className={styles.task}>
            <div className={styles.progress}>
                <b>09</b> / 10
            </div>
            <div className={styles.title}>Grid Layout</div>
            <ol start={0} className={styles.desc}>
                <li>
                    <b>Grid Layout</b> lets you manage your layout using rows
                    and columns. It defines how elements relate to each other.
                    Let’s turn this tile puzzle into a heart using the grid
                    layout.
                </li>
                <li>
                    Edit <TaskSymbol name="component" />
                    <b>Lesson09</b> and select
                    <br />
                    <TaskTag type="tree">div.grid</TaskTag>on the
                    <b> Elements Panel.</b>
                </li>
                <li>
                    On the <TaskSymbol name="styles" />
                    <b>Styles Panel</b>, choose the
                    <br />
                    <TaskTag type="selector">.grid</TaskTag>selector. Then, add
                    a column (1fr).
                </li>
                <li>
                    Select the white box on the stage and choose its
                    <TaskTag type="selector">.grid .glow</TaskTag>
                    selector on the <br />
                    <TaskSymbol name="styles" />
                    <b>Styles Panel</b>.
                </li>
                <li>
                    To move the white box in place, go to <br />
                    <b>Self Layout</b> &gt; <b>Grid</b> and make the
                    <b> rows</b> and <b>columns</b> start at <b>4</b> and end at
                    <b> 5</b>.
                </li>
            </ol>
        </div>
    );
};
