# AI Language Learner

A simple web application that helps users identify languages and learn more about them using the Gemini AI API.

## Features

- Language identification
- Detailed language learning information
- Clean and modern UI
- Real-time AI responses

## Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
4. Create a `.env` file in the root directory and add your API key:
   ```
   VITE_GEMINI_API_KEY=your_api_key_here
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

1. Enter or paste text in the textarea
2. Click "Identify Language" to determine the language of the text
3. Click "Learn More" to get detailed information about the language

## Technologies Used

- Vanilla JavaScript
- Vite
- Google Gemini AI API
- HTML5
- CSS3

## Note

Make sure to keep your API key secure and never commit it to version control. The `.env` file is already in `.gitignore` to prevent accidental commits. 