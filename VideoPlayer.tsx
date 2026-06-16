/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
// Copyright 2024 Google LLC

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     https://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import c from 'classnames';
import {
  CSSProperties,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {timeToSecs} from './utils';

const formatTime = (t: number) =>
  `${Math.floor(t / 60)}:${Math.floor(t % 60)
    .toString()
    .padStart(2, '0')}`;

interface Timecode {
  time: string;
  text: string;
  value?: any; // Keep value for marker label compatibility
}

export default function VideoPlayer({
  url,
  timecodeList,
  isLoadingVideo,
  videoError,
  jumpToTimecode,
  videoRef,
  capturingFrameAt,
}: {
  url: string | null;
  timecodeList: Timecode[] | null;
  isLoadingVideo: boolean;
  videoError: boolean;
  jumpToTimecode: (time: number) => void;
  videoRef: RefObject<HTMLVideoElement>;
  capturingFrameAt: number | null;
}) {
  const [duration, setDuration] = useState(0);
  const [scrubberTime, setScrubberTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [currentCaption, setCurrentCaption] = useState<string | null>(null);
  const currentSecs = duration * scrubberTime || 0;
  const currentPercent = scrubberTime * 100;
  const timecodeListReversed = useMemo(
    () => timecodeList?.slice().reverse(),
    [timecodeList],
  );

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  }, [isPlaying, videoRef]);

  const updateDuration = () => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
    }
  };

  const updateTime = () => {
    const video = videoRef.current;
    if (!video) return;
    if (!isScrubbing) {
      setScrubberTime(video.currentTime / video.duration);
    }

    if (timecodeListReversed) {
      setCurrentCaption(
        timecodeListReversed.find(
          (t) => timeToSecs(t.time) <= video.currentTime,
        )?.text || null,
      );
    }
  };

  const onPlay = () => setIsPlaying(true);
  // FIX: Corrected onPause handler to set isPlaying to false. The previous
  // implementation was causing a bug by setting the state to the function itself.
  const onPause = () => setIsPlaying(false);

  useEffect(() => {
    setScrubberTime(0);
    setIsPlaying(false);
  }, [url]);

  useEffect(() => {
    const onKeyPress = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        e.target.tagName !== 'INPUT' &&
        e.target.tagName !== 'TEXTAREA' &&
        e.key === ' '
      ) {
        e.preventDefault();
        togglePlay();
      }
    };

    window.addEventListener('keypress', onKeyPress);

    return () => {
      window.removeEventListener('keypress', onKeyPress);
    };
  }, [togglePlay]);

  return (
    <div className="videoPlayer">
      {url && !isLoadingVideo ? (
        <>
          <div>
            <video
              src={url}
              ref={videoRef}
              onClick={togglePlay}
              preload="auto"
              crossOrigin="anonymous"
              onDurationChange={updateDuration}
              onTimeUpdate={updateTime}
              onPlay={onPlay}
              onPause={onPause}
            />

            {currentCaption && (
              <div className="videoCaption">{currentCaption}</div>
            )}

            {capturingFrameAt !== null && (
              <div className="capture-indicator">
                <span className="icon">photo_camera</span>
                <span>Capturing frames...</span>
              </div>
            )}
          </div>

          <div className="videoControls">
            <div className="videoScrubber">
              <input
                style={{'--pct': `${currentPercent}%`} as CSSProperties}
                type="range"
                min="0"
                max="1"
                value={scrubberTime || 0}
                step="0.000001"
                onChange={(e) => {
                  const video = videoRef.current;
                  const newScrubberTime = (e.target as HTMLInputElement)
                    .valueAsNumber;
                  setScrubberTime(newScrubberTime);
                  if (video) {
                    video.currentTime = newScrubberTime * duration;
                  }
                }}
                onPointerDown={() => setIsScrubbing(true)}
                onPointerUp={() => setIsScrubbing(false)}
              />
            </div>
            <div className="timecodeMarkers">
              {timecodeList?.map(({time, text, value}, i) => {
                const secs = timeToSecs(time);
                const pct = (secs / duration) * 100;

                return (
                  <div
                    className="timecodeMarker"
                    key={i}
                    style={{left: `${pct}%`}}>
                    <div
                      className="timecodeMarkerTick"
                      onClick={() => jumpToTimecode(secs)}>
                      <div />
                    </div>
                    <div
                      className={c('timecodeMarkerLabel', {right: pct > 50})}>
                      <div>{time}</div>
                      <p>{value || text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="videoTime">
              <button>
                <span className="icon" onClick={togglePlay}>
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
              </button>
              {formatTime(currentSecs)} / {formatTime(duration)}
            </div>
          </div>
        </>
      ) : (
        <div className="emptyVideo">
          <p>
            {isLoadingVideo
              ? 'Processing video...'
              : videoError
                ? 'Error processing video.'
                : 'Drag and drop a video file here to get started.'}
          </p>
        </div>
      )}
    </div>
  );
}