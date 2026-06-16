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
import {FunctionDeclaration, Type} from '@google/genai';

const functions: FunctionDeclaration[] = [
  {
    name: 'set_guide_content',
    description:
      'Set the content for the generated guide, including title, description, summary, dependencies, transcript, and step-by-step instructions.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: 'The title of the video workflow.',
        },
        description: {
          type: Type.STRING,
          description: 'A brief description of the video workflow.',
        },
        summary: {
          type: Type.STRING,
          description:
            'A brief summary of the n8n workflow created in the video.',
        },
        dependencies: {
          type: Type.ARRAY,
          description:
            'A list of all software, APIs, or external services used in the workflow.',
          items: {
            type: Type.OBJECT,
            properties: {
              name: {
                type: Type.STRING,
                description: 'The name of the dependency.',
              },
              isPaid: {
                type: Type.BOOLEAN,
                description: 'Whether the dependency requires payment.',
              },
              notes: {
                type: Type.STRING,
                description:
                  'Any relevant notes, like pricing tiers or specific setup requirements.',
              },
            },
            required: ['name', 'isPaid', 'notes'],
          },
        },
        timecodes: {
          type: Type.ARRAY,
          description:
            'The step-by-step instructions for creating the workflow.',
          items: {
            type: Type.OBJECT,
            properties: {
              time: {
                type: Type.STRING,
              },
              text: {
                type: Type.STRING,
              },
            },
            required: ['time', 'text'],
          },
        },
        transcript: {
          type: Type.STRING,
          description:
            "A full, clean transcript of the video's main content, excluding intros, outros, and sponsor segments.",
        },
      },
      required: [
        'title',
        'description',
        'summary',
        'dependencies',
        'timecodes',
        'transcript',
      ],
    },
  },
];

// FIX: Added type for fnMap parameter for better type safety.
export default (fnMap: Record<string, Function>) =>
  functions.map((fn) => ({
    ...fn,
    callback: fnMap[fn.name],
  }));