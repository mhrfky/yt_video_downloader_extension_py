import React, { useState, useEffect } from 'react';
import MultiRangeSlider from 'multi-range-slider-react';
import TimePicker from './TimePicker.tsx';
interface TimeRangeControlProps {
    startTime: number;
    endTime: number;
    maxDuration: number;
    onStartChange: (start: number) => void;
    onEndChange: (end: number) => void;
}
const TimeRangeControl: React.FC<TimeRangeControlProps> = ({
                                                               startTime,
                                                               endTime,
                                                               maxDuration,
                                                               onStartChange,
                                                                onEndChange,
                                                           }) => {
    // Single source of truth for our time values
    const [times, setTimes] = useState({
        start: startTime,
        end: endTime
    });

    // Initialize times from props
    useEffect(() => {
        setTimes({
            start: startTime,
            end: endTime
        });
    }, [startTime, endTime]);

    // Handle time picker changes
    const handleStartTimeChange = (newStartTime: number) => {
        if( newStartTime == times.start) return
        if (newStartTime <= times.end) {
            const newTimes = {
                ...times,
                start: newStartTime
            };
            setTimes(newTimes);
            onStartChange(newTimes.start);
            console.log(newTimes);
        }
    };

    const handleEndTimeChange = (newEndTime: number) => {
        if( newEndTime == times.end) return
        if (newEndTime >= times.start) {
            const newTimes = {
                ...times,
                end: newEndTime
            };
            setTimes(newTimes);
            onEndChange(newTimes.end);
            console.log(newTimes);
        }
    };

    // Handle slider changes
    const handleSliderChange = (e: { minValue: number; maxValue: number }) => {
        const newTimes = {
            start: (e.minValue / 100) * maxDuration,
            end: (e.maxValue / 100) * maxDuration
        };
        if(newTimes.start == times.start && newTimes.end == times.end) return
        else if(newTimes.start  ==  times.start) {
            onEndChange(newTimes.end);
        }
        else{
            onStartChange(newTimes.start);
        }
        setTimes(newTimes);
    };

    // Calculate slider values directly from times
    const sliderMin = (times.start / maxDuration) * 100;
    const sliderMax = (times.end / maxDuration) * 100;

    return (
        <div className="space-y-4">
            <div className="flex gap-8">
                <div className="grid-container">

                    <div className="grid-item">
                        Start Time
                    </div>
                    <div className="grid-item">
                        End Time
                    </div>
                    <div className="grid-item">
                        <TimePicker
                            value={times.start}
                            onChange={handleStartTimeChange}
                        ></TimePicker>
                    </div>
                    <div className="grid-item">
                        <TimePicker
                            value={times.end}
                            onChange={handleEndTimeChange}
                        ></TimePicker>
                    </div>

                    <div className="slider">
                        <MultiRangeSlider
                            min={0}
                            max={100}
                            step={0.001}
                            minValue={sliderMin}
                            maxValue={sliderMax}
                            onInput={handleSliderChange}
                            ruler={false}
                        />
                    </div>
                </div>
            </div>


        </div>
    );
};

export default TimeRangeControl;