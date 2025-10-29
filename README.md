# Inmo-Veo3: Client-Side Real Estate Video Generator

This project uses the Google Gemini API (Veo model) directly from the browser to generate promotional real estate videos from property images, agent photos, and a scene-by-scene script.

The application is a self-contained Single Page Application (SPA) built with React and TypeScript. All video generation logic, including asset preparation, API calls, and polling for results, is handled entirely on the client-side.

## Architecture

-   **Frontend**: A Single Page Application (SPA) built with React and TypeScript.
-   **API**: Direct integration with the Google Gemini API for video generation (Veo model).
-   **Orchestration**: All logic for generating and extending video scenes happens in the user's browser.

## How to run locally

This project does not require a backend server. You can run it by serving the static files.

### 1. Prerequisites
-   A modern web browser.
-   A local web server to serve the `index.html` file. You can use any simple server, for example, Python's built-in server or the `serve` npm package.

### 2. Installation
No installation steps are required. Simply open the `index.html` file through a local web server.

For example, using Python:
```bash
# From the root directory of the project
python -m http.server
```
Then open `http://localhost:8000` in your browser.

### 3. API Key Configuration
This application requires a Google AI Studio API key to function.

1.  When you first load the application, you will be prompted to select an API key.
2.  Click the "Select API Key" button. This will open a dialog provided by the AI Studio environment.
3.  Choose a valid API key associated with a Google Cloud project that has billing enabled.
4.  Once a key is selected, you can proceed to upload your assets and generate a video.

For more information on setting up billing for the Gemini API, please see the [official documentation](https://ai.google.dev/gemini-api/docs/billing).

### 4. Generating a Video
1.  **Upload Property Images**: Drag and drop or click to upload one or more images of the property.
2.  **Upload Agent Image (Optional)**: Upload a photo of the real estate agent.
3.  **Write the Script**: Create a script by adding scenes. For each scene, write a descriptive prompt (e.g., "A wide shot of the modern kitchen with stainless steel appliances"). You can optionally link an uploaded image to a scene as a visual reference.
4.  **Generate**: Once you have your assets and script ready, click the "Generate Video" button. The application will begin creating the video scene by scene. Progress will be displayed on the screen.
5.  **View & Download**: When the process is complete, the final video will appear, ready to be played or downloaded.
