import imagePlaceHolder from '../../../assets/image-placeholder.svg';
import styles from './image.module.scss';

export interface ImageProps {
    className?: string;
    src?: string;
    fitting?: 'scaleToFit' | 'scaleToFill';
    alignment?: 'left' | 'right' | 'center' | 'top' | 'bottom';
}

export const Image = ({
    className,
    src = imagePlaceHolder,
    fitting = 'scaleToFill',
    alignment = 'center',
}: ImageProps) => {
    return (
        <div className={className}>
            <img
                src={src}
                className={`${styles.img} ${styles[alignment]} ${styles[fitting]}`}
            />
        </div>
    );
};
