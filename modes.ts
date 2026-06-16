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

export default {
  'n8n Workflow Guide': {
    emoji: '🤖',
    description:
      'Generate a step-by-step guide for n8n workflows, focusing on key steps based on audio instructions.',
    prompt: `Analyze this sequence of video frames and generate a comprehensive guide to recreate the n8n workflow shown.
The output must be a single call to the 'set_guide_content' function.

The guide content must include:
1. A clear and concise title for the workflow.
2. A brief, one-paragraph description of the video's content and goal.
3. A concise summary of the workflow's purpose and functionality.
4. A list of all dependencies, including software, APIs, and external services. For each dependency, specify if it's free or paid and add any important notes.
5. A highly detailed, step-by-step walkthrough. **CRITICAL: Only include the most important, major steps explicitly explained by the narrator in the audio instruction. Do not include minor actions, slight UI changes, or every single click. You must cover the entire video from start to finish.** For each key step, provide the exact timecode. The description for each key step must include:
    a. The node being added or configured.
    b. The exact settings, parameters, and expressions used.
    c. A description of any connections being made between nodes.
    d. A brief visual description of the state of the UI at that point.
6. A complete transcript of the core instructional audio. Omit non-instructional parts (e.g., intros, outros, sponsor segments). Ensure the transcript covers the entire video.

Call the 'set_guide_content' function with all of this information.`,
    isList: true,
  },
  'General Tutorial': {
    emoji: '🎓',
    description:
      'Create a general purpose step-by-step tutorial focusing on key instructions.',
    prompt: `Analyze this sequence of video frames and generate a general step-by-step tutorial.
The output must be a single call to the 'set_guide_content' function.

The guide content must include:
1. A clear and concise title for the tutorial.
2. A brief, one-paragraph description of the video's content and goal.
3. A concise summary of the steps shown in the video.
4. A list of any tools or materials needed (as dependencies).
5. A step-by-step walkthrough. **CRITICAL: Only include the most important, major steps explicitly highlighted by the narrator in the audio instructions. Do not include minor in-between actions or describe every single frame. You must ensure your steps cover the entire duration of the video.** For each key step, provide the exact timecode and a clear description of the action being performed.
6. A complete and accurate transcript of the inferred instructional audio. Omit irrelevant parts like intros, outros, and sponsor messages. Ensure the transcript covers the entire video length.

Call the 'set_guide_content' function with all of this information.`,
    isList: true,
  },
};
