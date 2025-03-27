# Amazon Order Scraper

This is a Node.js application that scrapes Amazon orders using Playwright.

## Prerequisites

- Node.js (v18+ recommended)
- npm or yarn
- Playwright

## Installation

1. Clone the repository:

```bash
git clone https://github.com/Donopha1998/web_scraper
cd web_scraper
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```


## Running the Application (Without Docker)

```bash
npx ts-node src/index.ts
```

- Enter your Amazon email or phone number.
- Enter your password.
- Complete any OTP/MFA verification if prompted.

## Running the Application (With Docker)

A `Dockerfile` is provided to containerize the application.

1. Build the Docker image:

```bash
docker build -t web_scraper .
```

2. Run the Docker container:

```bash
docker run -it --rm web_scraper
```

- Provide input when prompted.

## Troubleshooting

- Ensure your Amazon account has access to the orders page.
- Check network issues if pages fail to load.
- If login fails, verify your credentials and login URL.


