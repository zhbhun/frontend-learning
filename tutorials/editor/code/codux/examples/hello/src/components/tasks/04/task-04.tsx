import type React from 'react';
import styles from './task-04.module.scss';
import { TaskSymbol } from '../../common/task-symbol/task-symbol';
import { TaskTag } from '../../common/task-tag/task-tag';

export const Task04: React.FC = () => {
    return (
        <div className={styles.task}>
            <div className={styles.progress}>
                <b>04</b> / 10
            </div>
            <div className={styles.title}>Computed Styles Panel</div>
            <ol start={0} className={styles.desc}>
                <li>
                    In the <b>Computed Styles Panel</b> you can view the styles
                    applied to your element. <br></br>From there, you can
                    directly jump to the <b>Styles Panel</b> to edit them. Let's
                    change the size of these image tiles to fix the image.
                </li>
                <li>
                    Double click on the <b>stage</b> to edit <br></br> the{' '}
                    <TaskSymbol name="component" />
                    <b>Lesson04</b> component.
                </li>
                <li>
                    Select any
                    <TaskTag type="stage-comp" chevron>
                        Image
                    </TaskTag>
                    tile on the <b>stage</b> and open the{' '}
                    <TaskSymbol name="inspect" />
                    <b>Computed Styles Panel</b>.
                </li>
                <li>
                    Click
                    <TaskSymbol name="edit" /> next to <b>height</b> to edit it
                    on the <br />
                    <b>Styles Panel</b>. Set it to <b>160px</b>.
                </li>
                <li>
                    Repeat steps <b>2</b> and <b>3</b> for all image tiles{' '}
                    <br />
                    to fix the entire portrait.
                </li>
            </ol>
        </div>
    );
};
