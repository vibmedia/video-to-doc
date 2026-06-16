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
// FIX: Imported React to resolve namespace error for React.DragEvent.
import React, {useRef, useState} from 'react';
import {generateContent} from './api';
import functions from './functions';
import modes from './modes';
import {timeToSecs} from './utils';
// FIX: Corrected import path for VideoPlayer component to use .tsx extension.
import VideoPlayer from './VideoPlayer.tsx';
import type {Part} from '@google/genai';
import JSZip from 'jszip';

interface Timecode {
  time: string;
  text: string;
}

interface Dependency {
  name: string;
  isPaid: boolean;
  notes: string;
}

interface GuideContent {
  title: string;
  description: string;
  summary: string;
  dependencies: Dependency[];
  timecodes: Timecode[];
  transcript: string;
}

const getFrameAsDataURL = (
  video: HTMLVideoElement,
  timeInSec: number,
  maxDimension: number = 768
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      const canvas = document.createElement('canvas');
      
      let width = video.videoWidth;
      let height = video.videoHeight;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } else {
        reject(new Error('Could not get canvas context.'));
      }
    };

    const onError = (e: Event) => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      console.error('Video seeking error:', e);
      reject(new Error('Error seeking video to capture frame.'));
    };

    video.addEventListener('seeked', onSeeked, {once: true});
    video.addEventListener('error', onError, {once: true});
    video.currentTime = timeInSec;
  });
};

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [vidUrl, setVidUrl] = useState<string | null>(null);
  const [timecodeList, setTimecodeList] = useState<Timecode[] | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [dependencies, setDependencies] = useState<Dependency[] | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<string>(
    Object.keys(modes)[0],
  );
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [capturingFrameAt, setCapturingFrameAt] = useState<number | null>(null);
  const [stepScreenshots, setStepScreenshots] = useState<Record<number, string>>({});
  const [customContext, setCustomContext] = useState<string>('');
  const [theme] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light',
  );
  const scrollRef = useRef<HTMLElement>(null);

  const jumpToTimecode = (timeInSec: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timeInSec;
      videoRef.current.play();
    }
  };

  const setGuideContent = ({
    title,
    description,
    summary,
    dependencies,
    timecodes,
    transcript,
  }: GuideContent) => {
    setTitle(title);
    setDescription(description);
    setSummary(summary);
    setDependencies(dependencies);
    setTimecodeList(
      timecodes.map((t) => ({...t, text: t.text.replace(/\\'/g, "'")})),
    );
    setTranscript(transcript);
  };

  const handleGenerateGuide = async () => {
    if (!videoRef.current) return;

    setActiveMode(null);
    setTimecodeList(null);
    setSummary(null);
    setDependencies(null);
    setTitle(null);
    setDescription(null);
    setTranscript(null);
    setIsEditing(false);
    setIsLoading(true);
    setCapturingFrameAt(null);

    const video = videoRef.current;

    await new Promise<void>((resolve) => {
      if (video.readyState >= 1) {
        // HAVE_METADATA
        resolve();
      } else {
        video.addEventListener('loadedmetadata', () => resolve(), {once: true});
      }
    });

    const duration = video.duration;
    const maxFrames = 150; // Increased limit to safely handle 1-2 hour videos
    const interval = Math.max(1, duration / maxFrames);

    const frameTimestamps: number[] = [];
    for (let t = 0; t < duration; t += interval) {
      frameTimestamps.push(t);
    }

    const wasPlaying = !video.paused;
    if (wasPlaying) video.pause();
    const originalTime = video.currentTime;

    const imageParts: Part[] = [];

    // Capturing frames sequentially to avoid seeking conflicts
    try {
      for (const time of frameTimestamps) {
        setCapturingFrameAt(time);
        try {
          const dataUrl = await getFrameAsDataURL(video, time);
          imageParts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: dataUrl.split(',')[1],
            },
          });
        } catch (e) {
          console.error(`Could not capture frame at ${time}s:`, e);
        }
      }
    } finally {
      setCapturingFrameAt(null);
      video.currentTime = originalTime;
      if (wasPlaying) video.play();
    }

    const basePromptText = modes[selectedMode].prompt;
    const promptText = customContext.trim() 
      ? `Additional Context from User:\n${customContext}\n\nTask Instructions:\n${basePromptText}`
      : basePromptText;
    const allParts: Part[] = [{text: promptText}, ...imageParts];

    const resp = await generateContent(
      allParts,
      functions({
        set_guide_content: () => {}, // Callback is not used, handled below
      }),
    );

    const call = resp.functionCalls?.[0];

    if (call && call.name === 'set_guide_content') {
      const args = call.args as unknown as GuideContent;
      // FIX: Cast `call.args` to `unknown` first to fix the type error.
      // This is an intentional cast as the model's function call is expected
      // to provide arguments that match the GuideContent interface.
      setGuideContent(args);

      // Generate UI screenshots immediately
      const generatedScreenshots: Record<number, string> = {};
      const wasPlaying2 = !video.paused;
      if (wasPlaying2) video.pause();
      const originalTime2 = video.currentTime;
      
      try {
        for (let i = 0; i < args.timecodes.length; i++) {
          const item = args.timecodes[i];
          const timeInSec = timeToSecs(item.time);
          setCapturingFrameAt(timeInSec);
          try {
            const dataUrl = await getFrameAsDataURL(video, timeInSec);
            generatedScreenshots[i] = dataUrl;
          } catch (screenshotError) {
             console.error('Failed to capture frame for UI', screenshotError);
          }
        }
      } finally {
        setCapturingFrameAt(null);
        video.currentTime = originalTime2;
        if (wasPlaying2) video.play();
      }
      setStepScreenshots(generatedScreenshots);
      setActiveMode(selectedMode);
    }

    setIsLoading(false);
    if (scrollRef.current) {
      scrollRef.current.scrollTo({top: 0});
    }
  };

  const uploadVideo = async (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) {
      return;
    }
    setIsLoadingVideo(true);

    // Reset state for new video
    if (vidUrl) {
      URL.revokeObjectURL(vidUrl);
    }
    setVidUrl(URL.createObjectURL(droppedFile));
    setTimecodeList(null);
    setSummary(null);
    setDependencies(null);
    setTitle(null);
    setDescription(null);
    setTranscript(null);
    setActiveMode(null);
    setVideoError(false);
    setIsEditing(false);
    setCapturingFrameAt(null);
    setStepScreenshots({});

    setIsLoadingVideo(false);
  };

  const handleDownload = async () => {
    if (
      !timecodeList ||
      !videoRef.current ||
      !summary ||
      !dependencies ||
      !title ||
      !description ||
      !transcript
    )
      return;
    setIsDownloading(true);

    const zip = new JSZip();
    const screenshotsFolder = zip.folder('screenshots');

    const video = videoRef.current;
    const wasPlaying = !video.paused;
    if (wasPlaying) video.pause();
    const originalTime = video.currentTime;

    let guideText = `# ${title}\n\n`;
    guideText += `## Description\n\n${description}\n\n---\n\n`;
    guideText += `## Summary\n\n${summary}\n\n---\n\n`;
    guideText += `## Dependencies\n\n`;
    dependencies.forEach((dep) => {
      guideText += `* **${dep.name}** (${dep.isPaid ? 'Paid' : 'Free'})\n`;
      if (dep.notes) {
        guideText += `  *Notes: ${dep.notes}*\n`;
      }
    });
    guideText += `\n---\n\n`;
    guideText += `## Step-by-step Instructions\n\n`;

    try {
      for (let i = 0; i < timecodeList.length; i++) {
        const item = timecodeList[i];
        const timeInSec = timeToSecs(item.time);
        guideText += `### Step ${i + 1} (Time: ${item.time})\n\n${
          item.text
        }\n\n`;

        try {
          const screenshotDataUrl = await getFrameAsDataURL(video, timeInSec);
          const filename = `${item.time.replace(/:/g, '-')}.jpeg`;
          const base64Data = screenshotDataUrl.split(',')[1];

          if (screenshotsFolder) {
            screenshotsFolder.file(filename, base64Data, {base64: true});
            guideText += `![Screenshot at ${item.time}](./screenshots/${filename})\n\n---\n\n`;
          } else {
            throw new Error('Could not create screenshots folder in zip.');
          }
        } catch (screenshotError) {
          console.error(
            `Failed to capture screenshot for time ${item.time}:`,
            screenshotError,
          );
          guideText += `*(Could not generate screenshot for this step.)*\n\n---\n\n`;
        }
      }

      guideText += `\n## Full Transcript\n\n${transcript}\n`;

      zip.file('guide.md', guideText);
      const content = await zip.generateAsync({type: 'blob'});

      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'n8n-workflow-guide.zip');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      // Restore video state
      video.currentTime = originalTime;
      if (wasPlaying) video.play();
      setIsDownloading(false);
    }
  };

  const handleDependencyChange = (
    index: number,
    field: keyof Dependency,
    value: string | boolean,
  ) => {
    if (!dependencies) return;
    const newDependencies = [...dependencies];
    (newDependencies[index] as any)[field] = value;
    setDependencies(newDependencies);
  };

  const handleTimecodeTextChange = (index: number, text: string) => {
    if (!timecodeList) return;
    const newTimecodes = [...timecodeList];
    newTimecodes[index] = {...newTimecodes[index], text};
    setTimecodeList(newTimecodes);
  };

  return (
    <main
      className={theme}
      onDrop={uploadVideo}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={() => {}}
      onDragLeave={() => {}}>
      <section className="top">
        <div className="sidebar">
          <div>
            <h2>Select Mode</h2>
            <div className="mode-selector">
              {Object.entries(modes).map(([name, {emoji}]) => (
                <button
                  key={name}
                  className={c('mode-button', {active: selectedMode === name})}
                  onClick={() => setSelectedMode(name)}>
                  <span className="emoji">{emoji}</span>
                  <span>{name}</span>
                </button>
              ))}
            </div>
            <p>{modes[selectedMode].description}</p>
          </div>
          <div className="custom-context-container">
            <textarea
              className="custom-context-input"
              value={customContext}
              onChange={(e) => setCustomContext(e.target.value)}
              placeholder="Additional Context (What is this video about? What should the AI focus on?)"
              rows={4}
            />
          </div>
          <button
            className="button generateButton"
            onClick={handleGenerateGuide}
            disabled={isLoading || !vidUrl}>
            ▶️ Generate Guide
          </button>
        </div>

        <VideoPlayer
          videoRef={videoRef}
          url={vidUrl}
          timecodeList={timecodeList}
          jumpToTimecode={jumpToTimecode}
          isLoadingVideo={isLoadingVideo}
          videoError={videoError}
          capturingFrameAt={capturingFrameAt}
        />
      </section>

      <div className="tools">
        <section className="output" ref={scrollRef}>
          {isLoading ? (
            <div className="loading">
              Waiting for model<span>...</span>
            </div>
          ) : timecodeList && activeMode ? (
            <div className="guide-container">
              <div className="output-header">
                <button
                  className="button copy-button"
                  onClick={handleDownload}
                  disabled={isDownloading || isEditing}>
                  <span className="icon">download</span>
                  {isDownloading ? 'Downloading...' : 'Download Guide (.zip)'}
                </button>
                <button
                  className="button edit-button"
                  onClick={() => setIsEditing(!isEditing)}
                  disabled={isDownloading}>
                  <span className="icon">{isEditing ? 'save' : 'edit'}</span>
                  {isEditing ? 'Save Changes' : 'Edit Guide'}
                </button>
              </div>

              {title !== null && (
                <div className="guide-header">
                  {isEditing ? (
                    <input
                      className="editable-input title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Guide Title"
                    />
                  ) : (
                    <h1>{title}</h1>
                  )}
                  {isEditing ? (
                    <textarea
                      className="editable-input editable-textarea"
                      value={description || ''}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Guide Description"
                    />
                  ) : (
                    description && <p>{description}</p>
                  )}
                </div>
              )}

              {summary !== null && (
                <div className="guide-summary">
                  <h2>Workflow Summary</h2>
                  {isEditing ? (
                    <textarea
                      className="editable-input editable-textarea"
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      placeholder="Workflow Summary"
                    />
                  ) : (
                    <p>{summary}</p>
                  )}
                </div>
              )}

              {dependencies && dependencies.length > 0 && (
                <div className="guide-dependencies">
                  <h2>Dependencies</h2>
                  <ul>
                    {dependencies.map((dep, i) => (
                      <li key={i}>
                        {isEditing ? (
                          <div className="dependency-edit">
                            <div className="dependency-edit-header">
                              <input
                                className="editable-input"
                                value={dep.name}
                                onChange={(e) =>
                                  handleDependencyChange(
                                    i,
                                    'name',
                                    e.target.value,
                                  )
                                }
                                placeholder="Dependency Name"
                              />
                              <label>
                                <input
                                  type="checkbox"
                                  checked={dep.isPaid}
                                  onChange={(e) =>
                                    handleDependencyChange(
                                      i,
                                      'isPaid',
                                      e.target.checked,
                                    )
                                  }
                                />
                                Paid
                              </label>
                            </div>
                            <textarea
                              className="editable-input editable-textarea"
                              value={dep.notes}
                              onChange={(e) =>
                                handleDependencyChange(
                                  i,
                                  'notes',
                                  e.target.value,
                                )
                              }
                              placeholder="Notes"
                            />
                          </div>
                        ) : (
                          <>
                            <strong>{dep.name}</strong> (
                            {dep.isPaid ? 'Paid' : 'Free'})
                            {dep.notes && <p>{dep.notes}</p>}
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <h2>Step-by-step Guide</h2>
              <ol className="guideList">
                {timecodeList.map(({time, text}, i) => (
                  <li key={i} className="guideStep">
                    <div className="guideStep-header">
                      <h3>Step {i + 1}</h3>
                      <button onClick={() => jumpToTimecode(timeToSecs(time))}>
                        <time>{time}</time>
                      </button>
                    </div>
                    {isEditing ? (
                      <textarea
                        className="editable-input editable-textarea text"
                        value={text}
                        onChange={(e) =>
                          handleTimecodeTextChange(i, e.target.value)
                        }
                      />
                    ) : (
                      <p className="text">{text}</p>
                    )}
                    {stepScreenshots[i] && (
                      <div className="guideStep-screenshot">
                        <img src={stepScreenshots[i]} alt={`Screenshot for step ${i + 1}`} />
                      </div>
                    )}
                  </li>
                ))}
              </ol>

              {transcript !== null && (
                <div className="guide-transcript">
                  <h2>Full Transcript</h2>
                  {isEditing ? (
                    <textarea
                      className="editable-input editable-textarea transcript"
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                    />
                  ) : (
                    <pre>{transcript}</pre>
                  )}
                </div>
              )}
            </div>
          ) : !vidUrl ? (
            <div className="empty-output">
              <span className="icon">movie</span>
              <h2>Your Guide Will Appear Here</h2>
              <p>Drag and drop a video file into the player above to start.</p>
            </div>
          ) : (
            <div className="empty-output">
              <span className="icon">smart_display</span>
              <h2>Ready to Generate</h2>
              <p>
                Select a mode from the sidebar and click "▶️ Generate Guide" to
                create your step-by-step guide.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}