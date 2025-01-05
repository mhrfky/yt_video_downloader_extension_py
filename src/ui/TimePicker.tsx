import { useState, useRef, useEffect } from 'react';
import type { KeyboardEventHandler, ClipboardEventHandler } from 'react';

interface TimePickerProps {
    value: number;  // Time in seconds (including milliseconds as decimal)
    onChange: (value: number) => void;
    label?: string;
}

const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, label = "Time" }) => {
    const [selectionStart, setSelectionStart] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    console.log(label);
    // Convert number of seconds to formatted string
    const formatTimeString = (timeInSeconds: number): string => {
        const hours = Math.floor(timeInSeconds / 3600);
        const minutes = Math.floor((timeInSeconds % 3600) / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        const milliseconds = Math.round((timeInSeconds % 1) * 1000);

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    };

    // Convert formatted string to number of seconds
    const parseTimeString = (timeStr: string): number => {
        const [time, ms] = timeStr.split('.');
        const [hours, minutes, seconds] = time.split(':').map(Number);
        return hours * 3600 + minutes * 60 + seconds + (parseInt(ms) / 1000);
    };

    // Get the current display string
    const timeString = formatTimeString(value);

    // Template for valid positions and their max values
    const template = {
        positions: [
            { max: '2', next: 1 }, // hours first digit (0-2)
            { max: '9', next: 2 }, // hours second digit (0-9)
            { char: ':', next: 3 }, // separator
            { max: '5', next: 4 }, // minutes first digit (0-5)
            { max: '9', next: 5 }, // minutes second digit (0-9)
            { char: ':', next: 6 }, // separator
            { max: '5', next: 7 }, // seconds first digit (0-5)
            { max: '9', next: 8 }, // seconds second digit (0-9)
            { char: '.', next: 9 }, // separator
            { max: '9', next: 10 }, // milliseconds first digit
            { max: '9', next: 11 }, // milliseconds second digit
            { max: '9', next: 12 }, // milliseconds third digit
        ]
    };
    // Function to get the multiplier based on position
    const getPositionMultiplier = (pos: number): number => {
        // Map position to its corresponding time unit multiplier
        if (pos === 0) return 36000; // Tens of hours (10 * 3600)
        if (pos === 1) return 3600;  // Hours
        if (pos === 3) return 600;   // Tens of minutes (10 * 60)
        if (pos === 4) return 60;    // Minutes
        if (pos === 6) return 10;    // Tens of seconds
        if (pos === 7) return 1;     // Seconds
        if (pos === 9) return 0.1;   // Tenths of a second
        if (pos === 10) return 0.01; // Hundredths
        if (pos === 11) return 0.001;// Thousandths
        return 0;
    };

    // Handle special keys
    const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            let newPos = selectionStart - 1;
            while (newPos >= 0 && template.positions[newPos]?.char) {
                newPos--;
            }
            if (newPos >= 0) {
                setSelectionStart(newPos);
            }
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            let newPos = selectionStart + 1;
            while (newPos < timeString.length && template.positions[newPos]?.char) {
                newPos++;
            }
            if (newPos < timeString.length) {
                setSelectionStart(newPos);
            }
        }  else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const multiplier = getPositionMultiplier(selectionStart);
            const direction = e.key === 'ArrowUp' ? 1 : -1;

            // Get current value
            const currentValue = parseTimeString(timeString);

            // Don't wrap individual digits, let them carry over naturally
            const newValue = currentValue + (direction * multiplier);

            // Update if within valid range (0 to 24 hours)
            if (newValue >= 0 && newValue <= 86400) {
                onChange(newValue);
            }
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            let newPos = selectionStart - 1;
            while (newPos >= 0 && template.positions[newPos]?.char) {
                newPos--;
            }

            const newTimeStr = timeString.split('');
            newTimeStr[selectionStart] = '0';
            onChange(parseTimeString(newTimeStr.join('')));
            if (newPos >= 0) {
                setSelectionStart(newPos);
            }
        }
    };

    // Handle number inputs
    const handleNumberInput = (num: string) => {
        const currentPos = template.positions[selectionStart];
        if (!currentPos || currentPos.char) return;

        // Validate input based on position
        if (selectionStart === 0 && parseInt(num) > 2) return;
        if (selectionStart === 1 && timeString[0] === '2' && parseInt(num) > 3) return;
        if (currentPos.max && parseInt(num) > parseInt(currentPos.max)) return;

        // Update time string
        const newTimeStr = timeString.split('');
        newTimeStr[selectionStart] = num;
        const newTimeValue = parseTimeString(newTimeStr.join(''));
        onChange(newTimeValue);

        // Move to next position
        if (currentPos.next !== undefined) {
            let nextPos = currentPos.next;
            while (nextPos < timeString.length && template.positions[nextPos]?.char) {
                nextPos++;
            }
            if (nextPos < timeString.length) {
                setSelectionStart(nextPos);
            }
        }
    };

    // Handle paste
    const handlePaste: ClipboardEventHandler<HTMLInputElement> = (e) => {
        e.preventDefault();
        if (!e || !e.clipboardData) return;
        const pastedText = e.clipboardData.getData('text');
        const numbers = pastedText.replace(/[^\d]/g, '');

        if (numbers.length > 0) {
            handleNumberInput(numbers[0]);
        }
    };

    useEffect(() => {
        const input = inputRef.current;
        if (input) {
            input.setSelectionRange(selectionStart, selectionStart + 1);
        }
    }, [selectionStart, timeString]);

    return (
        <input
            ref={inputRef}
            type="text"
            value={timeString}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onChange={(e) => {
                const char = e.target.value.charAt(selectionStart);
                if (/^\d$/.test(char)) {
                    handleNumberInput(char);
                }
            }}
            onClick={() => {
                const input = inputRef.current;
                if (input && input.selectionStart !== null) {
                    let pos = input.selectionStart;
                    while (pos < timeString.length && template.positions[pos]?.char) {
                        pos++;
                    }
                    if (pos < timeString.length) {
                        setSelectionStart(pos);
                    }
                }
            }}
        />
    );
};

export default TimePicker;