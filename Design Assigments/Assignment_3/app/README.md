# Readme with the main points:

## Website
You can check the website under the following URL:
```bash
https://joyalissa13.github.io/visprojcect-ass3-deploy/
```

## feedback to assignment 2
At the moment, each visualization appears somewhat disconnected and not specifically tied to young people’s situations. You may consider focusing on a clearer comparison, for example: (1) the income of newly graduated students over time, and (2) the inflation of rental prices across Vienna districts, to better illustrate the growing affordability gap.

## Changes made
1. Focus on a smaller group depending on input.
2. Added summaries and further legends.
3. Made Visualization more visually appealing.
4. Created avg comparision
5. Created more interactive elements

## AI Disclaimer
We utilized codex (chatGPT mini) for creating the generate_json.py to be able to turn data into json format to work with it easily.
Furthermore, we used it to optimize and structure our css making it easier to fit and be compatible with D3.js. Also, we used AI for creating yml file for website deployment and adapting logic of map animations.

## Contribution
- Pascal Rupp:
    - data processing
    - handling different types of data
    - logic and functionality

- Joy Alissa:
    - Design Components
    - Layerss
    - Overall navigation structure and app fucntionality
    - logic and functionality

## Clone from GitHub
```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
```

## Run locally
```bash
cd app
npm install
npm run dev
```

## Build locally
```bash
cd app
npm run build
```

## Data generation
If you update the source spreadsheets in `data/`, regenerate the app dataset with:
```bash
python data/generate_json.py
```
This writes the curated output to `app/src/data/data.json`.