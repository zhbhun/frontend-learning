import type React from 'react';
import styles from './task-08.module.scss';
import { TaskSymbol } from '../../common/task-symbol/task-symbol';
import { TaskTag } from '../../common/task-tag/task-tag';

export const Task08: React.FC = () => {
    return (
        <div className={styles.task}>
            <div className={styles.progress}>
                <b>08</b> / 10
            </div>
            <div className={styles.title}>Flex Layout</div>
            <ol start={0} className={styles.desc}>
                <li>
                    With <b>Flex Layout</b>, you can align and stack elements
                    inside another element. Let’s see how you can move the
                    circles into their holes using flex properties.
                </li>
                <li>
                    Edit <TaskSymbol name="component" />
                    <b>Lesson08</b> and select
                    <br />
                    <TaskTag type="tree">div.section.circles</TaskTag>on the{' '}
                    <br />
                    <b> Elements Panel</b>.
                </li>
                <li>
                    On the <TaskSymbol name="styles" />
                    <b>Styles Panel</b> choose the{' '}
                    <TaskTag type="selector">.circles</TaskTag>selector and take
                    a look at the different flex properties under <b>Layout</b>.
                </li>
                <li>
                    Change the <b>Flex Direction</b> and <b>Justify</b>{' '}
                    properties to move the circles into their holes.
                </li>
            </ol>
        </div>
    );
};
