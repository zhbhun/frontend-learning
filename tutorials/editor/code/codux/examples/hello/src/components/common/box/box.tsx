import type React from 'react';
import styles from './box.module.scss';
import type { ColorName } from '../../../globals/colors';
import { Icon, Direction } from '../icon/icon';
import type { IconName } from '../../../globals/icons';
import vars from '../../../globals/variables.module.scss';

export interface BoxProps {
    onMouseEnter?(): void;
    className?: string;
    id?: string;
    color?: ColorName;
    text?: string;
    align?: 'left' | 'center' | 'right';
    outlined?: boolean;
    icon?: IconName;
    iconDirection?: Direction;
    iconColor?: ColorName;
}

export const Box: React.FC<BoxProps> = ({
    onMouseEnter,
    className,
    color = 'black',
    text,
    align = 'center',
    outlined = false,
    id,
    icon,
    iconDirection,
    iconColor = color,
}) => {
    // css variable being used to set the box's background color (color prop)
    const boxColor = { '--box-color': vars[color] } as React.CSSProperties;

    return (
        <div
            id={id}
            style={boxColor}
            onMouseEnter={onMouseEnter ? () => onMouseEnter() : undefined}
            data-direction={iconDirection}
            className={`${styles.box} 
        ${styles[align]} 
        ${outlined ? styles.outline : styles.fill} 
        ${className}`}
        >
            {icon && (
                <Icon name={icon} color={iconColor} direction={iconDirection} />
            )}
            {text && (
                <span className={`${styles.text} ${icon && styles.margin}`}>
                    {text}
                </span>
            )}
        </div>
    );
};
