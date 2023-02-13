import type React from 'react';
import styles from './task-05.module.scss';
import { TaskSymbol } from '../../common/task-symbol/task-symbol';
import { TaskTag } from '../../common/task-tag/task-tag';

export const Task05: React.FC = () => {
    return (
        <div className={styles.task}>
            <div className={styles.progress}>
                <b>05</b> / 10
            </div>
            <div className={styles.title}>Styles Panel</div>
            <ol start={0} className={styles.desc}>
                <li>
                    On the <b>Styles Panel</b>, you can apply <b>styles</b> to
                    one or more elements using
                    <b> selectors</b>. Let's use them to adjust spacing.
                </li>
                <li>
                    To bring the circles closer together, we need to adjust
                    their margins. Edit <br></br>
                    <TaskSymbol name="component" />
                    <b>Lesson05</b> and select any circle on the stage.
                </li>
                <li>
                    Open the <TaskSymbol name="styles" />
                    <b>Styles Panel</b> and choose the{' '}
                    <TaskTag type="selector">.section .row .margin</TaskTag>
                    selector.
                </li>
                <li>
                    Scroll down to <b>Margin</b> and set it to <b>6px</b>.
                    Notice how all circles change margins as they share the same
                    selector.
                </li>
                <li>
                    Now, let's adjust the padding of the button below. Select
                    the button and choose the selector
                    <TaskTag type="selector">.section .row .padding</TaskTag>
                    Scroll to <b>Padding</b> and set it to
                    <b> 15px</b>.
                </li>
            </ol>
        </div>
    );
};
