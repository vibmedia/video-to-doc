# Video Analyzer

An interactive video player that helps you generate a detailed step-by-step guide for n8n workflows and general tutorials by utilizing AI (Gemini 2.5 Flash).

## Working Guide

This application is built as a Client-Side Single Page Application (SPA) using React and Vite. It directly analyzes video frames in your browser without requiring a backend server.

1. **Video Loading:** Once you select a video file, it's loaded securely into a hidden local video player.
2. **Frame Extraction:** To remain within AI context limits and to process large videos (e.g., 1-2 hours) efficiently, the app extracts up to 150 frames evenly distributed across the duration of the video. The frame size is downscaled to maximum 768px to ensure your browser remains stable and within API limits.
3. **AI Processing:** It sends the text prompt (with optional custom context) and the extracted frames to the Google Gemini Flash model.
4. **Structured Guide:** Using Gemini's Function Calling, it returns a fully structured text consisting of title, summaries, step-by-step timestamps, dependencies, and transcript.
5. **Interactive Viewer & Exporting:** Steps are matched with their corresponding timecodes and extracted screenshots. You can click on timecodes to jump to exact moments in the video. You can also export the generated guide (with screenshots) to a `.zip` file.

## Installation Guide (Google AI Studio)

1. Ensure the `package.json` includes all the necessary dependencies (`@google/genai`, `react`, `vite`, `jszip`, etc.).
2. Use the provided command to install dependencies: `npm install`
3. Export your `GEMINI_API_KEY` in your environment or Settings panel in AI Studio.
4. Run the development server with `npm run dev`.

## How to use

1. Open the preview of the application.
2. Expand the **Select Mode** sidebar to choose what type of guide to generate (e.g. n8n Workflow Guide, General Tutorial).
3. Optionally, add your custom prompt or context inside the **Additional Context** box. For example: "Focus purely on user onboarding UI screens" or "It's a demo for a database integration."
4. Drag-and-drop a video file onto the Video Player.
5. Click **Generate Guide**. The AI will process the frames and the audio context. Note: long files (1-2 GB) may take a little time to process in the browser, but maximum bounds are kept safe to avoid out-of-memory errors!
6. Wait for the generated guide, edit if necessary, and use **Download Guide (.zip)** to save it along with screenshot images.
