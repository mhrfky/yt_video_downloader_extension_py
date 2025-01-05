import React, { useState, useEffect } from 'react';

interface TimeInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    defaultValue?: string;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const TimeInput: React.FC<TimeInputProps> = ({
                                                 defaultValue = '00:00:00.000',
                                                 onBlur,
                                                 onKeyDown,
                                                 className,
                                                 ...props
                                             }) => {
    const [value, setValue] = useState(defaultValue);

    useEffect(() => {
        setValue(defaultValue);
    }, [defaultValue]);

    const validateTimeFormat = (input: string): boolean => {
        return /^\d{2}:\d{2}:\d{2}\.\d{3}$/.test(input);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let newValue = e.target.value;

        // Only allow digits, colons, and periods
        newValue = newValue.replace(/[^\d:.]/g, '');

        // Auto-format as user types
        if (newValue.length <= 2) {
            // Hours
            setValue(newValue.padStart(2, '0') + ':00:00.000');
        } else if (newValue.length <= 5) {
            // Hours:Minutes
            const [hours, minutes = '00'] = newValue.split(':');
            setValue(`${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00.000`);
        } else if (newValue.length <= 8) {
            // Hours:Minutes:Seconds
            const [hours, minutes = '00', seconds = '00'] = newValue.split(':');
            setValue(`${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}.000`);
        } else {
            // Full format including milliseconds
            const [time = '00:00:00', ms = '000'] = newValue.split('.');
            const [hours = '00', minutes = '00', seconds = '00'] = time.split(':');
            setValue(`${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}.${ms.padEnd(3, '0')}`);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && validateTimeFormat(value)) {
            onKeyDown?.(e);
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        if (validateTimeFormat(value)) {
            onBlur?.(e);
        } else {
            setValue(defaultValue);
        }
    };

    return (
        <input
            type="text"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className={`font-mono ${className}`}
            placeholder="00:00:00.000"
            {...props}
        />
    );
};

export default TimeInput;