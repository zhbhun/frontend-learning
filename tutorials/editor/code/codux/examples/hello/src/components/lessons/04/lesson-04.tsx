import React, { useEffect, useState } from 'react';
import styles from './lesson-04.module.scss';
import img1 from '../../../assets/phto-1.png';
import img2 from '../../../assets/phto-2.png';
import img3 from '../../../assets/phto-3.png';
import img4 from '../../../assets/phto-4.png';
import img5 from '../../../assets/phto-5.png';
import img6 from '../../../assets/phto-6.png';
import { Image } from '../../common/image/image';
import { ConfettiFx } from '../../fx/confetti-fx/confetti-fx';
import { Task04 as Task } from '../../tasks/04/task-04';

export const Lesson04: React.FC = () => {
    const [lessonSolved, setLessonSolved] = useState(false);

    useEffect(() => {
        setLessonSolved(isSolved());
    }, []);

    return (
        <div className={styles.root}>
            <Task />
            <div className={styles.playground}>
                <div className={styles.column}>
                    <div className={styles.images}>
                        <Image src={img1} className={styles.left} />
                        <Image src={img3} className={styles.left} />
                        <Image src={img5} className={styles.left} />
                    </div>
                </div>
                <div className={styles.column}>
                    <div className={styles.images}>
                        <Image src={img2} className={styles.right} />
                        <Image src={img4} className={styles.right} />
                        <Image src={img6} className={styles.right} />
                    </div>
                </div>
                <ConfettiFx
                    maxParticles={400}
                    dissolve={315}
                    show={lessonSolved}
                    style={{ display: lessonSolved ? 'block' : 'none' }}
                />
            </div>
        </div>
    );
};

function isSolved(): boolean {
    let solved = true;
    const images = document.getElementsByTagName('img');
    for (var i = 0; i < images.length; i++) {
        solved =
            solved &&
            images[i]!.clientWidth === 160 &&
            images[i]!.clientHeight === 160;
    }
    return solved;
}
