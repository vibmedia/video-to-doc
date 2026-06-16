/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import {
  FunctionDeclaration,
  GoogleGenAI,
  Part,
  Type,
} from '@google/genai';

const systemInstruction = `When given a sequence of video frames and a query, call the relevant \
function only once with the appropriate timecodes and text for the video`;

const client = new GoogleGenAI({apiKey: process.env.API_KEY});

async function generateContent(
  parts: Part[],
  functionDeclarations: FunctionDeclaration[],
) {
  // FIX: Updated generateContent call to align with SDK best practices.
  // The `contents` property is now a single Content object containing all parts,
  // and the `systemInstruction` is correctly placed in the `config`.
  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts,
    },
    config: {
      systemInstruction,
      temperature: 0.5,
      tools: [{functionDeclarations}],
    },
  });

  return response;
}

export {generateContent};